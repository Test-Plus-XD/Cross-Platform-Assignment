import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import PhotoSwipeLightbox from 'photoswipe/lightbox';

@Component({
  selector: 'app-chat-button',
  templateUrl: './chat-button.component.html',
  styleUrls: ['./chat-button.component.scss'],
  standalone: false
})
export class ChatButtonComponent implements OnInit, OnDestroy {
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
  UploadedImageUrl: string | null = null;
  UploadedImagePath: string | null = null;

  lang$ = this.languageService.lang$;
  private Destroy$ = new Subject<void>();
  private TypingTimeout: any;
  private Lightbox: PhotoSwipeLightbox | null = null;
  private HasConnected = false;
  private HistoryTimeout: any;
  // Flag to track whether message history has been loaded at least once
  private HasReceivedHistory = false;

  constructor(
    private readonly chatService: ChatService,
    private readonly authService: AuthService,
    private readonly languageService: LanguageService,
    private readonly router: Router,
    private readonly httpClient: HttpClient
  ) { }

  ngOnInit(): void {
    // Connection state subscription monitors Socket.IO connection status
    this.chatService.ConnectionState$.pipe(takeUntil(this.Destroy$)).subscribe(State => {
      this.isConnected = State === 'connected';
      console.log('ChatButton: Connection state changed to', State);

      // Room joining is triggered automatically when connection is established
      if (this.isConnected && this.isOpen) {
        this.chatService.IsRegistered$.pipe(takeUntil(this.Destroy$)).subscribe(Registered => {
          if (Registered) {
            console.log('ChatButton: User registered, joining room');
            this.joinRoom();
          }
        });
      }
    });

    // Messages subscription handles real-time message delivery from Socket.IO
    this.chatService.Messages$.pipe(takeUntil(this.Destroy$)).subscribe(Message => {
      const CurrentRoomId = this.getRoomId();
      if (Message.roomId === CurrentRoomId) {
        console.log('ChatButton: Received real-time message', Message.messageId);

        // Duplicate messages are prevented by checking if message ID already exists
        const MessageExists = this.messages.some(ExistingMessage =>
          ExistingMessage.messageId === Message.messageId
        );

        if (!MessageExists) {
          this.messages.push(Message);
          console.log('ChatButton: Added new message, total:', this.messages.length);
        }

        // Unread count is incremented only when chat window is closed
        if (!this.isOpen) this.unreadCount++;

        // Loading state is cleared when first message arrives after joining
        if (this.isLoadingHistory) {
          console.log('ChatButton: Clearing loading state due to new message');
          this.clearLoadingState();
        }

        // Scroll position is adjusted after DOM updates
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });

    // Message history subscription handles initial message loading
    this.chatService.MessageHistory$.pipe(takeUntil(this.Destroy$)).subscribe(Data => {
      const CurrentRoomId = this.getRoomId();
      if (Data.roomId === CurrentRoomId) {
        console.log('ChatButton: Received message history -', Data.messages?.length || 0, 'messages');

        // History flag is set to indicate successful history load
        this.HasReceivedHistory = true;

        // Message list is replaced with historical messages (can be empty array)
        this.messages = Data.messages || [];

        // Loading state is always cleared when history arrives (even if empty)
        this.clearLoadingState();

        console.log('ChatButton: Loading complete, displaying', this.messages.length, 'messages');

        // Scroll position is adjusted to show most recent messages
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });

    // Typing indicators subscription shows when other users are typing
    this.chatService.TypingIndicators$.pipe(takeUntil(this.Destroy$)).subscribe(Indicator => {
      const CurrentRoomId = this.getRoomId();
      const CurrentUserId = this.authService.currentUser?.uid;

      // Typing indicator is only shown for other users in the same room
      if (Indicator.roomId === CurrentRoomId && Indicator.userId !== CurrentUserId) {
        this.isTyping = Indicator.isTyping;

        // Typing indicator automatically clears after 3 seconds
        if (this.isTyping) {
          setTimeout(() => {
            this.isTyping = false;
          }, 3000);
        }
      }
    });

    // PhotoSwipe is initialised for image lightbox functionality
    this.initialisePhotoSwipe();
  }

  ngOnDestroy(): void {
    // Uploaded images are deleted when component is destroyed without sending
    if (this.UploadedImageUrl && this.UploadedImagePath) {
      this.deleteUploadedImage(this.UploadedImagePath);
    }

    // Room is left if chat was open
    if (this.isOpen) this.leaveRoom();

    this.Destroy$.next();
    this.Destroy$.complete();

    if (this.TypingTimeout) clearTimeout(this.TypingTimeout);
    if (this.HistoryTimeout) clearTimeout(this.HistoryTimeout);
    if (this.Lightbox) this.Lightbox.destroy();
  }

  /// Clears the loading state and any associated timeouts
  private clearLoadingState(): void {
    // History timeout is cleared to prevent race conditions
    if (this.HistoryTimeout) {
      clearTimeout(this.HistoryTimeout);
      this.HistoryTimeout = null;
    }
    this.isLoadingHistory = false;
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

  /// Generates the unique room identifier for this restaurant's chat
  private getRoomId(): string {
    return `restaurant-${this.restaurantId}`;
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

  /// Joins the restaurant-specific chat room via Socket.IO
  private joinRoom(): void {
    const RoomId = this.getRoomId();
    console.log('ChatButton: Joining room', RoomId);

    // Loading state is only set if history hasn't been received yet
    if (!this.HasReceivedHistory) {
      this.isLoadingHistory = true;

      // Timeout is set to clear loading state if history doesn't arrive within 8 seconds
      this.HistoryTimeout = setTimeout(() => {
        if (this.isLoadingHistory && !this.HasReceivedHistory) {
          console.log('ChatButton: History timeout reached, clearing loading state');
          this.clearLoadingState();
        }
      }, 8000);
    }

    this.chatService.joinRoom(RoomId);
  }

  /// Leaves the current chat room
  private leaveRoom(): void {
    const RoomId = this.getRoomId();
    console.log('ChatButton: Leaving room', RoomId);
    this.chatService.leaveRoom(RoomId);
  }

  /// Toggles the visibility of the chat interface window
  async toggleChat(): Promise<void> {
    // Uploaded images are deleted when chat is closed without sending
    if (this.isOpen && this.UploadedImageUrl && this.UploadedImagePath) {
      await this.deleteUploadedImage(this.UploadedImagePath);
    }

    // User authentication is checked before opening chat
    if (!this.authService.currentUser) {
      this.isOpen = true;
      this.showLoginPrompt = true;
      return;
    }

    // Chat window state is toggled
    this.isOpen = !this.isOpen;
    this.showLoginPrompt = false;

    if (this.isOpen) {
      // Opening chat triggers connection and room joining
      this.unreadCount = 0;
      console.log('ChatButton: Opening chat, connecting to Socket.IO');
      await this.connectAndRegister();

      // Room is joined immediately if already connected
      if (this.chatService.isConnected && this.chatService.isRegistered) {
        this.joinRoom();
      }

      setTimeout(() => this.scrollToBottom(), 100);
    } else {
      // Closing chat triggers room leaving
      this.leaveRoom();
    }
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
      this.previewUrl = e.target?.result as string;
    };
    Reader.readAsDataURL(File);

    // Image is uploaded immediately in background
    await this.uploadImageInBackground(File);
  }

  /// Uploads image in background when selected (not when sending)
  private async uploadImageInBackground(File: File): Promise<void> {
    this.isUploadingImage = true;
    this.uploadProgress = 0;

    try {
      const Token = await this.authService.getIdToken();
      if (!Token) throw new Error('No authentication token available');

      // FormData instance is created with correct variable name
      const UploadFormData = new FormData();
      UploadFormData.append('image', File);

      console.log('ChatButton: Starting image upload, file size:', File.size, 'bytes');

      // Progress simulation provides user feedback during upload
      const ProgressInterval = setInterval(() => {
        if (this.uploadProgress < 90) this.uploadProgress += 10;
      }, 200);

      // HTTP request is made with the FormData instance (not the class constructor)
      // Note: HttpClient automatically sets Content-Type for FormData, so we don't include it
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
      this.uploadProgress = 100;

      if (!Response || !Response.success) {
        throw new Error(Response ? 'Image upload failed' : 'No response from server');
      }

      // Uploaded URL and path are stored for later use when sending message
      this.UploadedImageUrl = Response.imageUrl;
      this.UploadedImagePath = Response.fileName;

      console.log('ChatButton: Image uploaded successfully:', this.UploadedImageUrl);
      console.log('ChatButton: Image path stored:', this.UploadedImagePath);

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
      this.isUploadingImage = false;
      this.uploadProgress = 0;
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

    this.selectedImage = null;
    this.previewUrl = null;
    this.UploadedImageUrl = null;
    this.UploadedImagePath = null;

    if (this.FileInput?.nativeElement) {
      this.FileInput.nativeElement.value = '';
    }
  }

  /// Sends the composed message (text and/or image URL) to the chat room
  async sendMessage(): Promise<void> {
    const RoomId = this.getRoomId();

    // Message validation ensures content exists (text or image)
    if ((!this.newMessage.trim() && !this.UploadedImageUrl) || !this.isConnected) {
      console.warn('ChatButton: Cannot send message - not connected or empty message');
      return;
    }

    try {
      // Message text is trimmed to remove whitespace
      const MessageText = this.newMessage.trim();

      // Image URL becomes the message if no text was typed
      const FinalMessage = MessageText || (this.UploadedImageUrl ? this.UploadedImageUrl : '');
      const ImageUrl = this.UploadedImageUrl ? this.UploadedImageUrl : '';

      console.log('ChatButton: Sending message to room', RoomId);
      console.log('ChatButton: Message text:', FinalMessage);
      console.log('ChatButton: Image URL:', ImageUrl);

      // Message is sent via Socket.IO with both text and image URL
      await this.chatService.sendMessage(RoomId, FinalMessage, ImageUrl);

      // Input fields are cleared after successful send
      this.newMessage = '';

      // Image references are cleared (but not deleted as message is sent)
      this.selectedImage = null;
      this.previewUrl = null;
      this.UploadedImageUrl = null;
      this.UploadedImagePath = null;

      if (this.FileInput?.nativeElement) {
        this.FileInput.nativeElement.value = '';
      }

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

    const RoomId = this.getRoomId();
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

  /// Checks if message contains an image URL
  hasImage(Message: ChatMessage): boolean {
    return !!(Message as any).imageUrl;
  }

  /// Gets image URL from message
  getImageUrl(Message: ChatMessage): string {
    return (Message as any).imageUrl || '';
  }

  /// Checks if message text should be displayed (not Firebase Storage reference text)
  shouldShowMessageText(Message: ChatMessage): boolean {
    if (!Message.message) return false;

    // Message text containing Firebase Storage URL is hidden
    return !Message.message.includes('firebasestorage.googleapis.com');
  }

  /// Formats message timestamps into human-readable time strings
  formatTime(Timestamp: string): string {
    const date = new Date(Timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}