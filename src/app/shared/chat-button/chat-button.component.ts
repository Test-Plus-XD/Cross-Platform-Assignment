import { DOCUMENT } from '@angular/common';
import { Component, Input, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, NgZone, ChangeDetectorRef, Renderer2, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Observable, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { ChatVisibilityService } from '../../services/chat-visibility.service';
import { NotificationCoordinatorService } from '../../services/notification-coordinator.service';
import { UserService } from '../../services/user.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import PhotoSwipeLightbox from 'photoswipe/lightbox';

@Component({
  selector: 'app-chat-button',
  templateUrl: './chat-button.component.html',
  styleUrls: ['./chat-button.component.scss'],
  standalone: false
})
export class ChatButtonComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly chatService = inject(ChatService);
  private readonly authService = inject(AuthService);
  private readonly languageService = inject(LanguageService);
  private readonly chatVisibilityService = inject(ChatVisibilityService);
  private readonly notificationCoordinator = inject(NotificationCoordinatorService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly httpClient = inject(HttpClient);
  private readonly ngZone = inject(NgZone);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly document = inject(DOCUMENT);
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);

  @Input() restaurantId!: string;
  @Input() restaurantName!: string;
  @Input() restaurantOwnerId?: string;
  @ViewChild('fileInput') FileInput!: ElementRef<HTMLInputElement>;

  isOpen = false;
  messages: ChatMessage[] = [];
  newMessage = '';
  isConnected = false;
  isTyping = false;
  unreadCount = 0;
  showLoginPrompt = false;
  isLoadingHistory = false;
  isUploadingImage = false;
  uploadProgress = 0;
  selectedImage: File | null = null;
  previewUrl: string | null = null;
  readonly participantPlaceholderAvatarUrl = 'https://www.vhv.rs/dpng/d/505-5058560_person-placeholder-image-free-hd-png-download.png';
  UploadedImageUrl: string | null = null;
  UploadedImagePath: string | null = null;

  lang$ = this.languageService.lang$;
  geminiButtonOpen$: Observable<boolean>;
  private Destroy$ = new Subject<void>();
  private TypingTimeout: any;
  private Lightbox: PhotoSwipeLightbox | null = null;
  private HasConnected = false;
  private HistoryTimeout: any;
  // Flag to track whether message history has been loaded at least once
  private HasReceivedHistory = false;
  private OriginalParentElement: HTMLElement | null = null;
  private readonly participantAvatarUrlCache = new Map<string, string>();
  private readonly participantAvatarRequestIds = new Set<string>();
  private HasEnsuredRoom = false;
  private currentRoomId: string | null = null;
  private historyLoadRequestId = 0;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {
    this.geminiButtonOpen$ = this.chatVisibilityService.geminiButtonOpen$;
  }

  ngAfterViewInit(): void {
    this.moveHostToOverlayRoot();
  }

  ngOnInit(): void {
    // Connection state subscription monitors Socket.IO connection status
    this.chatService.ConnectionState$.pipe(takeUntil(this.Destroy$)).subscribe(State => {
      this.ngZone.run(() => {
        this.isConnected = State === 'connected';
        console.log('ChatButton: Connection state changed to', State);
        this.changeDetectorRef.markForCheck();
      });
    });

    // Room joining is triggered once registration succeeds on the shared socket.
    this.chatService.IsRegistered$.pipe(takeUntil(this.Destroy$)).subscribe(Registered => {
      this.ngZone.run(() => {
        if (Registered && this.isOpen && this.currentRoomId) {
          console.log('ChatButton: User registered, joining room');
          this.joinRoom(this.currentRoomId);
        }
      });
    });

    // Messages subscription handles real-time message delivery from Socket.IO
    this.chatService.Messages$.pipe(takeUntil(this.Destroy$)).subscribe(Message => {
      this.ngZone.run(() => {
        if (Message.roomId === this.currentRoomId) {
          console.log('ChatButton: Received real-time message', Message.messageId);
          const previousMessageCount = this.messages.length;
          this.messages = this.mergeMessages(this.messages, [Message]);
          this.ensureParticipantAvatarUrls([Message]);
          const hasAddedMessage = this.messages.length > previousMessageCount;

          if (hasAddedMessage) {
            console.log('ChatButton: Added new message, total:', this.messages.length);
            this.changeDetectorRef.markForCheck();
          }

          // Unread count is incremented only when chat window is closed
          if (hasAddedMessage && !this.isOpen) {
            this.unreadCount++;
          }

          // Scroll position is adjusted after DOM updates
          setTimeout(() => this.scrollToBottom(), 100);
        }
      });
    });

    // Message history subscription handles initial message loading
    this.chatService.MessageHistory$.pipe(takeUntil(this.Destroy$)).subscribe(Data => {
      this.ngZone.run(() => {
        if (Data.roomId === this.currentRoomId) {
          console.log('ChatButton: Received message history -', Data.messages?.length || 0, 'messages');
          this.applyRoomHistory(Data.roomId, Data.messages || []);
        }
      });
    });

    // Typing indicators subscription shows when other users are typing
    this.chatService.TypingIndicators$.pipe(takeUntil(this.Destroy$)).subscribe(Indicator => {
      this.ngZone.run(() => {
        const CurrentUserId = this.authService.currentUser?.uid;

        // Typing indicator is only shown for other users in the same room
        if (Indicator.roomId === this.currentRoomId && Indicator.userId !== CurrentUserId) {
          this.isTyping = Indicator.isTyping;

          // Typing indicator automatically clears after 3 seconds
          if (this.isTyping) {
            setTimeout(() => {
              this.isTyping = false;
              this.changeDetectorRef.markForCheck();
            }, 3000);
          }

          // Trigger change detection
          this.changeDetectorRef.markForCheck();
        }
      });
    });

    // PhotoSwipe is initialised for image lightbox functionality
    this.initialisePhotoSwipe();
  }

  ngOnDestroy(): void {
    this.restoreHostToOriginalParent();

    // Uploaded images are deleted when component is destroyed without sending
    if (this.UploadedImageUrl && this.UploadedImagePath) {
      this.deleteUploadedImage(this.UploadedImagePath);
    }

    // Room is left if chat was open
    if (this.isOpen) this.leaveRoom(this.currentRoomId);

    this.Destroy$.next();
    this.Destroy$.complete();

    if (this.TypingTimeout) clearTimeout(this.TypingTimeout);
    if (this.HistoryTimeout) clearTimeout(this.HistoryTimeout);
    if (this.Lightbox) this.Lightbox.destroy();
  }

  /// Moves the chat host out of the page ion-content so it shares the app-level overlay layer used by the global AI button
  private moveHostToOverlayRoot(): void {
    const HostElement = this.elementRef.nativeElement;
    const OverlayRootElement = this.document.querySelector('ion-app') as HTMLElement | null;

    if (!HostElement || !OverlayRootElement || HostElement.parentElement === OverlayRootElement) return;

    this.OriginalParentElement = HostElement.parentElement;
    this.renderer.appendChild(OverlayRootElement, HostElement);
  }

  /// Restores the host to its original Angular parent before destruction so Angular can tear the view down normally
  private restoreHostToOriginalParent(): void {
    const HostElement = this.elementRef.nativeElement;

    if (!HostElement || !this.OriginalParentElement) return;

    this.renderer.appendChild(this.OriginalParentElement, HostElement);
  }

  /// Clears the loading state and any associated timeouts
  private clearLoadingState(): void {
    // History timeout is cleared to prevent race conditions
    if (this.HistoryTimeout) {
      clearTimeout(this.HistoryTimeout);
      this.HistoryTimeout = null;
    }
    this.isLoadingHistory = false;
    this.changeDetectorRef.markForCheck();
  }

  /// Initialises PhotoSwipe lightbox for image previews
  private initialisePhotoSwipe(): void {
    this.Lightbox = new PhotoSwipeLightbox({
      gallery: '.chat-messages',
      children: 'a.message-image-link',
      pswpModule: () => import('photoswipe')
    });
    this.Lightbox.init();
  }

  /// Generates the unique room identifier for this restaurant's chat when inputs are ready.
  private resolveRoomId(): string | null {
    if (!this.restaurantId?.trim()) {
      return null;
    }

    return `restaurant-${this.restaurantId.trim()}`;
  }

  /// Resets room-local state so every room open or room change fetches persisted history again.
  private resetRoomSessionState(): void {
    this.HasReceivedHistory = false;
    this.messages = [];
    this.isTyping = false;
    this.isLoadingHistory = false;
    this.clearLoadingState();
  }

  /// Connects to Socket.IO server and registers user
  private async connectAndRegister(): Promise<void> {
    if (!this.authService.currentUser) {
      console.warn('ChatButton: Cannot connect without authenticated user');
      return;
    }

    // Duplicate connections are prevented
    if (this.HasConnected && this.chatService.isConnected) {
      console.log('ChatButton: Already connected and registered');
      return;
    }

    console.log('ChatButton: Connecting to Socket.IO server');
    this.chatService.connect();
    this.HasConnected = true;
  }

  /// Ensures the restaurant room exists with both the current user and the restaurant owner before messaging starts.
  private async ensureRestaurantRoom(): Promise<void> {
    const CurrentUser = this.authService.currentUser;
    const roomId = this.currentRoomId || this.resolveRoomId();

    if (!CurrentUser || this.HasEnsuredRoom || !roomId) {
      return;
    }

    const Token = await this.authService.getIdToken();
    if (!Token) {
      console.warn('ChatButton: Cannot ensure chat room without auth token');
      return;
    }

    const Participants = [...new Set(
      [CurrentUser.uid, this.restaurantOwnerId?.trim() || '']
        .filter((ParticipantId): ParticipantId is string => Boolean(ParticipantId))
    )];

    const Headers = new HttpHeaders({
      'Authorization': `Bearer ${Token}`,
      'Content-Type': 'application/json',
      'x-api-passcode': 'PourRice'
    });

    await this.httpClient.post(
      `${environment.apiUrl}/API/Chat/Rooms`,
      {
        roomId,
        participants: Participants,
        roomName: this.restaurantName || 'Restaurant Chat',
        type: 'group'
      },
      { headers: Headers }
    ).toPromise();

    this.notificationCoordinator.trackRoom(roomId);
    this.HasEnsuredRoom = true;
  }

  /// Joins the restaurant-specific chat room via Socket.IO
  private joinRoom(RoomId: string): void {
    console.log('ChatButton: Joining room', RoomId);
    this.chatService.joinRoom(RoomId);
  }

  /// Leaves the current chat room
  private leaveRoom(RoomId: string | null): void {
    if (!RoomId) return;

    console.log('ChatButton: Leaving room', RoomId);
    this.chatService.leaveRoom(RoomId);
  }

  /// Merges persisted history with any live socket messages already received for the current room.
  private applyRoomHistory(roomId: string, messages: ChatMessage[]): void {
    if (roomId !== this.currentRoomId) {
      return;
    }

    this.HasReceivedHistory = true;
    this.messages = this.mergeMessages(messages, this.messages);
    this.ensureParticipantAvatarUrls(this.messages);
    this.clearLoadingState();

    console.log('ChatButton: Loading complete, displaying', this.messages.length, 'messages');

    this.changeDetectorRef.markForCheck();
    setTimeout(() => this.scrollToBottom(), 100);
  }

  /// Loads persisted room history from the chat API so reopening a room never depends on socket replay timing.
  private async loadRoomHistory(roomId: string): Promise<void> {
    const currentRequestId = ++this.historyLoadRequestId;
    const Token = await this.authService.getIdToken();
    const HeadersConfig: Record<string, string> = {
      'x-api-passcode': 'PourRice'
    };

    if (Token) {
      HeadersConfig['Authorization'] = `Bearer ${Token}`;
    }

    this.isLoadingHistory = true;
    this.changeDetectorRef.markForCheck();

    this.HistoryTimeout = setTimeout(() => {
      this.ngZone.run(() => {
        if (this.currentRoomId !== roomId || this.historyLoadRequestId !== currentRequestId) {
          return;
        }

        if (this.isLoadingHistory) {
          console.log('ChatButton: Persisted history request timed out');
          this.clearLoadingState();
        }
      });
    }, 8000);

    try {
      const Response = await firstValueFrom(this.httpClient.get<{
        roomId: string;
        count: number;
        messages: ChatMessage[];
      }>(
        `${environment.apiUrl}/API/Chat/Rooms/${encodeURIComponent(roomId)}/Messages?limit=50`,
        {
          headers: new HttpHeaders(HeadersConfig)
        }
      ));

      this.ngZone.run(() => {
        if (this.currentRoomId !== roomId || this.historyLoadRequestId !== currentRequestId) {
          return;
        }

        console.log('ChatButton: Persisted history loaded -', Response.messages?.length || 0, 'messages');
        this.applyRoomHistory(roomId, Response.messages || []);
      });
    } catch (Error) {
      console.error('ChatButton: Failed to load persisted history', Error);

      this.ngZone.run(() => {
        if (this.currentRoomId !== roomId || this.historyLoadRequestId !== currentRequestId) {
          return;
        }

        this.clearLoadingState();
      });
    }
  }

  /// Prepares the active room for a fresh history fetch every time the chat opens or switches rooms.
  private async prepareRoomSession(forceReload: boolean): Promise<void> {
    const nextRoomId = this.resolveRoomId();

    if (!nextRoomId) {
      console.warn('ChatButton: Cannot prepare room session without a restaurant ID');
      return;
    }

    const roomChanged = this.currentRoomId !== nextRoomId;

    if (roomChanged && this.currentRoomId) {
      this.leaveRoom(this.currentRoomId);
      this.HasEnsuredRoom = false;
    }

    this.currentRoomId = nextRoomId;

    if (roomChanged || forceReload) {
      this.resetRoomSessionState();
    }

    await this.ensureRestaurantRoom();
    await this.connectAndRegister();

    if (this.chatService.isConnected && this.chatService.isRegistered) {
      this.joinRoom(nextRoomId);
    }

    await this.loadRoomHistory(nextRoomId);
  }

  /// Toggles the visibility of the chat interface window
  async toggleChat(): Promise<void> {
    if (this.isOpen) {
      await this.closeChatWindow();
      return;
    }

    await this.openChatWindow();
  }

  /// Opens the chat interface and forces a fresh persisted-history load for the active room.
  async openChatWindow(): Promise<void> {
    // Uploaded images are deleted when chat is closed without sending
    if (!this.authService.currentUser) {
      this.isOpen = true;
      this.showLoginPrompt = true;
      this.chatVisibilityService.setChatButtonOpen(true);
      this.changeDetectorRef.markForCheck();
      return;
    }

    // Chat window state is opened explicitly so room selection never closes it accidentally.
    this.isOpen = true;
    this.showLoginPrompt = false;
    this.chatVisibilityService.setChatButtonOpen(true);
    this.unreadCount = 0;

    console.log('ChatButton: Opening chat with persisted history reload');
    await this.prepareRoomSession(true);
    setTimeout(() => this.scrollToBottom(), 100);

    this.changeDetectorRef.markForCheck();
  }

  /// Closes the chat interface and leaves the transient room subscription.
  private async closeChatWindow(): Promise<void> {
    if (this.UploadedImageUrl && this.UploadedImagePath) {
      await this.deleteUploadedImage(this.UploadedImagePath);
    }

    this.isOpen = false;
    this.showLoginPrompt = false;
    this.chatVisibilityService.setChatButtonOpen(false);
    this.leaveRoom(this.currentRoomId);
    this.changeDetectorRef.markForCheck();
  }

  /// Navigates user to login page
  goToLogin(): void {
    this.isOpen = false;
    this.showLoginPrompt = false;
    this.router.navigate(['/login']);
  }

  /// Triggers file input dialogue for image selection
  selectImage(): void {
    this.FileInput.nativeElement.click();
  }

  /// Handles image file selection and uploads immediately
  async onImageSelected(Event: Event): Promise<void> {
    const Input = Event.target as HTMLInputElement;
    const File = Input.files?.[0];

    if (!File) return;

    // File type is validated
    if (!File.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    // File size is validated (max 10MB)
    if (File.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }

    this.selectedImage = File;

    // Preview is generated for user feedback
    const Reader = new FileReader();
    Reader.onload = (e) => {
      this.ngZone.run(() => {
        this.previewUrl = e.target?.result as string;
        this.changeDetectorRef.markForCheck();
      });
    };
    Reader.readAsDataURL(File);

    // Image is uploaded immediately in background
    await this.uploadImageInBackground(File);
  }

  /// Uploads image in background when selected (not when sending)
  private async uploadImageInBackground(File: File): Promise<void> {
    this.ngZone.run(() => {
      this.isUploadingImage = true;
      this.uploadProgress = 0;
      this.changeDetectorRef.markForCheck();
    });

    try {
      const Token = await this.authService.getIdToken();
      if (!Token) throw new Error('No authentication token available');

      // FormData instance is created with correct variable name
      const UploadFormData = new FormData();
      UploadFormData.append('image', File);

      console.log('ChatButton: Starting image upload, file size:', File.size, 'bytes');

      // Progress simulation provides user feedback during upload
      const ProgressInterval = setInterval(() => {
        this.ngZone.run(() => {
          if (this.uploadProgress < 90) {
            this.uploadProgress += 10;
            this.changeDetectorRef.markForCheck();
          }
        });
      }, 200);

      // HTTP request is made with the FormData instance
      const Response = await this.httpClient.post<{
        success: boolean;
        imageUrl: string;
        fileName: string;
      }>(
        `${environment.apiUrl}/API/Images/upload?folder=Chat`,
        UploadFormData,
        {
          headers: new HttpHeaders({
            'Authorization': `Bearer ${Token}`,
            'x-api-passcode': 'PourRice'
          })
        }
      ).toPromise();

      clearInterval(ProgressInterval);

      this.ngZone.run(() => {
        this.uploadProgress = 100;
        this.changeDetectorRef.markForCheck();
      });

      if (!Response || !Response.success) {
        throw new Error(Response ? 'Image upload failed' : 'No response from server');
      }

      // Uploaded URL and path are stored for later use when sending message
      this.ngZone.run(() => {
        this.UploadedImageUrl = Response.imageUrl;
        this.UploadedImagePath = Response.fileName;
        console.log('ChatButton: Image uploaded successfully:', this.UploadedImageUrl);
        console.log('ChatButton: Image path stored:', this.UploadedImagePath);
        this.changeDetectorRef.markForCheck();
      });

    } catch (error) {
      console.error('ChatButton: Image upload error:', error);
      let ErrorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        ErrorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // HTTP error response handling
        const HttpError = error as any;
        if (HttpError.error?.error) {
          ErrorMessage = HttpError.error.error;
        } else if (HttpError.message) {
          ErrorMessage = HttpError.message;
        }
      }

      alert(`Failed to upload image: ${ErrorMessage}. Please try again.`);
      this.clearImage();
    } finally {
      this.ngZone.run(() => {
        this.isUploadingImage = false;
        this.uploadProgress = 0;
        this.changeDetectorRef.markForCheck();
      });
    }
  }

  /// Deletes uploaded image from storage using the stored file path
  private async deleteUploadedImage(FilePath: string): Promise<void> {
    try {
      const Token = await this.authService.getIdToken();
      if (!Token) {
        console.warn('ChatButton: No auth token, cannot delete image');
        return;
      }

      const Headers = new HttpHeaders({
        'Authorization': `Bearer ${Token}`,
        'x-api-passcode': 'PourRice'
      });

      console.log('ChatButton: Deleting unused image:', FilePath);

      await this.httpClient.delete(
        `${environment.apiUrl}/API/Images/delete`,
        {
          headers: Headers,
          body: { filePath: FilePath }
        }
      ).toPromise();

      console.log('ChatButton: Deleted unused image successfully');

    } catch (Error) {
      console.error('ChatButton: Error deleting image:', Error);
    }
  }

  /// Clears selected image and preview
  async clearImage(): Promise<void> {
    // Uploaded image is deleted from storage if not yet sent
    if (this.UploadedImagePath) {
      await this.deleteUploadedImage(this.UploadedImagePath);
    }

    this.ngZone.run(() => {
      this.selectedImage = null;
      this.previewUrl = null;
      this.UploadedImageUrl = null;
      this.UploadedImagePath = null;

      if (this.FileInput?.nativeElement) {
        this.FileInput.nativeElement.value = '';
      }

      this.changeDetectorRef.markForCheck();
    });
  }

  /// Sends the composed message (text and/or image URL) to the chat room
  async sendMessage(): Promise<void> {
    const RoomId = this.currentRoomId || this.resolveRoomId();

    // Message validation ensures content exists (text or image)
    if (!RoomId || (!this.newMessage.trim() && !this.UploadedImageUrl) || !this.isConnected) {
      console.warn('ChatButton: Cannot send message - not connected or empty message');
      return;
    }

    try {
      // Message text is trimmed to remove whitespace
      const MessageText = this.newMessage.trim();
      const ImageUrl = this.UploadedImageUrl ? this.UploadedImageUrl : '';

      console.log('ChatButton: Sending message to room', RoomId);
      console.log('ChatButton: Message text:', MessageText);
      console.log('ChatButton: Image URL:', ImageUrl);

      // Message is sent via Socket.IO with both text and image URL
      await this.chatService.sendMessage(RoomId, MessageText, ImageUrl);

      // Input fields are cleared after successful send
      this.ngZone.run(() => {
        this.newMessage = '';

        // Image references are cleared (but not deleted as message is sent)
        this.selectedImage = null;
        this.previewUrl = null;
        this.UploadedImageUrl = null;
        this.UploadedImagePath = null;

        if (this.FileInput?.nativeElement) {
          this.FileInput.nativeElement.value = '';
        }

        this.changeDetectorRef.markForCheck();
      });

      // Typing indicator is stopped
      this.chatService.sendTypingIndicator(RoomId, false);

    } catch (Error) {
      console.error('ChatButton: Error sending message:', Error);
      alert('Failed to send message. Please try again.');
    }
  }

  /// Handles typing events and broadcasts typing indicators
  onTyping(): void {
    if (!this.isConnected) return;

    const RoomId = this.currentRoomId || this.resolveRoomId();
    if (!RoomId) return;

    this.chatService.sendTypingIndicator(RoomId, true);

    if (this.TypingTimeout) clearTimeout(this.TypingTimeout);

    // Typing indicator is automatically stopped after 2 seconds
    this.TypingTimeout = setTimeout(() => {
      this.chatService.sendTypingIndicator(RoomId, false);
    }, 2000);
  }

  /// Scrolls the message list to display the most recent message
  private scrollToBottom(): void {
    const MessageList = document.querySelector('.chat-messages');
    if (MessageList) {
      MessageList.scrollTop = MessageList.scrollHeight;
    }
  }

  /// Determines whether a message was sent by the current user
  isOwnMessage(Message: ChatMessage): boolean {
    return Message.userId === this.authService.currentUser?.uid;
  }

  // Ensures every non-current participant in the loaded messages has an avatar URL cached for rendering.
  private ensureParticipantAvatarUrls(messages: ChatMessage[]): void {
    const currentUserId = this.authService.currentUser?.uid;
    const participantUserIds = [...new Set(
      messages
        .map(message => message.userId)
        .filter((userId): userId is string => Boolean(userId) && userId !== currentUserId)
    )];

    participantUserIds.forEach((participantUserId) => {
      if (this.participantAvatarUrlCache.has(participantUserId) || this.participantAvatarRequestIds.has(participantUserId)) return;

      // The requested placeholder is stored immediately so the UI has a stable fallback whilst the profile loads.
      this.participantAvatarUrlCache.set(participantUserId, this.participantPlaceholderAvatarUrl);
      this.participantAvatarRequestIds.add(participantUserId);
      void this.loadParticipantAvatarUrl(participantUserId);
    });
  }

  // Loads a participant photo from the public user profile endpoint without overwriting the logged-in user cache.
  private async loadParticipantAvatarUrl(participantUserId: string): Promise<void> {
    try {
      const participantProfile = await firstValueFrom(this.userService.getPublicUserProfile(participantUserId));
      const participantAvatarUrl = this.getSanitisedParticipantAvatarUrl(participantProfile?.photoURL);
      this.participantAvatarUrlCache.set(participantUserId, participantAvatarUrl);
    } catch (error) {
      console.warn('ChatButton: Failed to load participant avatar, using placeholder', participantUserId, error);
      this.participantAvatarUrlCache.set(participantUserId, this.participantPlaceholderAvatarUrl);
    } finally {
      this.participantAvatarRequestIds.delete(participantUserId);
      this.changeDetectorRef.markForCheck();
    }
  }

  // Returns a valid participant avatar URL or the fixed placeholder when the profile photo is missing.
  private getSanitisedParticipantAvatarUrl(photoUrl: string | null | undefined): string {
    const trimmedPhotoUrl = typeof photoUrl === 'string' ? photoUrl.trim() : '';

    if (!trimmedPhotoUrl || trimmedPhotoUrl === '—' || trimmedPhotoUrl === 'null' || trimmedPhotoUrl === 'undefined') {
      return this.participantPlaceholderAvatarUrl;
    }

    return trimmedPhotoUrl;
  }

  // Exposes the cached participant avatar URL to the template and falls back to the placeholder during loading.
  getParticipantAvatarUrl(userId: string | null | undefined): string {
    if (!userId) {
      return this.participantPlaceholderAvatarUrl;
    }

    return this.participantAvatarUrlCache.get(userId) || this.participantPlaceholderAvatarUrl;
  }

  // Falls back to the placeholder permanently if a participant photo URL fails to load in the browser.
  onParticipantAvatarError(event: Event, userId: string): void {
    const avatarElement = event.target as HTMLImageElement | null;

    this.participantAvatarUrlCache.set(userId, this.participantPlaceholderAvatarUrl);

    if (avatarElement && avatarElement.src !== this.participantPlaceholderAvatarUrl) {
      avatarElement.src = this.participantPlaceholderAvatarUrl;
    }
  }

  /// Checks if message contains an image URL
  hasImage(Message: ChatMessage): boolean {
    return !!this.getImageUrl(Message);
  }

  /// Gets image URL from message
  getImageUrl(Message: ChatMessage): string {
    const StoredImageUrl = typeof Message.imageUrl === 'string'
      ? Message.imageUrl.trim()
      : '';

    if (StoredImageUrl) {
      return StoredImageUrl;
    }

    return this.isFirebaseStorageImageUrl(Message.message) ? Message.message : '';
  }

  /// Checks if message text should be displayed (not Firebase Storage reference text)
  shouldShowMessageText(Message: ChatMessage): boolean {
    if (!Message.message) return false;

    // Message text containing only a Firebase Storage image URL is hidden
    return !this.isFirebaseStorageImageUrl(Message.message);
  }

  /// Checks whether a message string is only a Firebase Storage image URL
  private isFirebaseStorageImageUrl(MessageText: string | null | undefined): boolean {
    if (!MessageText) return false;

    const TrimmedMessageText = MessageText.trim();
    return TrimmedMessageText.startsWith('https://firebasestorage.googleapis.com/');
  }

  /// Formats message timestamps into human-readable time strings
  formatTime(Timestamp: string): string {
    const date = new Date(Timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Merges multiple message lists with message-ID deduplication and chronological sorting.
  private mergeMessages(...messageGroups: ChatMessage[][]): ChatMessage[] {
    const messagesById = new Map<string, ChatMessage>();

    messageGroups.flat().forEach((message) => {
      const deduplicationKey = this.buildMessageDeduplicationKey(message);
      messagesById.set(deduplicationKey, message);
    });

    return [...messagesById.values()].sort((firstMessage, secondMessage) =>
      this.getTimestampSortValue(firstMessage.timestamp) - this.getTimestampSortValue(secondMessage.timestamp)
    );
  }

  // Builds a stable deduplication key even if a legacy message somehow lacks a messageId.
  private buildMessageDeduplicationKey(message: ChatMessage): string {
    if (message.messageId?.trim()) {
      return message.messageId.trim();
    }

    return [
      message.roomId,
      message.userId,
      message.timestamp,
      message.message,
      message.imageUrl || ''
    ].join('|');
  }

  // Converts ISO timestamps into sortable numbers whilst tolerating malformed values.
  private getTimestampSortValue(timestamp: string): number {
    const sortValue = new Date(timestamp).getTime();
    return Number.isFinite(sortValue) ? sortValue : 0;
  }
}