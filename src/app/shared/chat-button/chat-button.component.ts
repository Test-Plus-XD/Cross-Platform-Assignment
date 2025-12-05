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
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Chat state
  isOpen = false;
  messages: ChatMessage[] = [];
  newMessage = '';
  isConnected = false;
  isTyping = false;
  unreadCount = 0;
  showLoginPrompt = false;
  isLoadingHistory = false;

  // Image upload state
  isUploadingImage = false;
  uploadProgress = 0;
  selectedImage: File | null = null;
  previewUrl: string | null = null;

  // Language and cleanup
  lang$ = this.languageService.lang$;
  private destroy$ = new Subject<void>();
  private typingTimeout: any;
  private lightbox: PhotoSwipeLightbox | null = null;
  private hasConnected = false; // Track if we've already connected in this session

  constructor(
    private readonly chatService: ChatService,
    private readonly authService: AuthService,
    private readonly languageService: LanguageService,
    private readonly router: Router,
    private readonly httpClient: HttpClient
  ) { }

  ngOnInit(): void {
    // Connection state subscription
    this.chatService.ConnectionState$.pipe(takeUntil(this.destroy$)).subscribe(state => {
      this.isConnected = state === 'connected';
      console.log('ChatButton: Connection state changed to', state);

      // When connected and registered, join the room
      if (this.isConnected && this.isOpen) {
        this.chatService.IsRegistered$.pipe(takeUntil(this.destroy$)).subscribe(registered => {
          if (registered) {
            console.log('ChatButton: User registered, joining room');
            this.joinRoom();
          }
        });
      }
    });

    // Messages subscription - for real-time messages
    this.chatService.Messages$.pipe(takeUntil(this.destroy$)).subscribe(message => {
      if (message.roomId === this.getRoomId()) {
        console.log('ChatButton: Received real-time message', message.messageId);
        this.messages.push(message);
        if (!this.isOpen) {
          this.unreadCount++;
        }
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });

    // Message history subscription - for loaded history
    this.chatService.MessageHistory$.pipe(takeUntil(this.destroy$)).subscribe(data => {
      if (data.roomId === this.getRoomId()) {
        console.log('ChatButton: Received message history -', data.messages.length, 'messages');
        this.messages = data.messages;
        this.isLoadingHistory = false;
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });

    // Typing indicators subscription
    this.chatService.TypingIndicators$.pipe(takeUntil(this.destroy$)).subscribe(indicator => {
      if (indicator.roomId === this.getRoomId() && indicator.userId !== this.authService.currentUser?.uid) {
        this.isTyping = indicator.isTyping;
      }
    });

    // Initialise PhotoSwipe
    this.initialisePhotoSwipe();
  }

  ngOnDestroy(): void {
    // Clean up
    if (this.isOpen) {
      this.leaveRoom();
    }

    this.destroy$.next();
    this.destroy$.complete();

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    if (this.lightbox) {
      this.lightbox.destroy();
    }
  }

  /// Initialises PhotoSwipe lightbox for image previews
  private initialisePhotoSwipe(): void {
    this.lightbox = new PhotoSwipeLightbox({
      gallery: '.chat-messages',
      children: 'a.message-image-link',
      pswpModule: () => import('photoswipe')
    });
    this.lightbox.init();
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

    // Prevent duplicate connections
    if (this.hasConnected && this.chatService.isConnected) {
      console.log('ChatButton: Already connected and registered');
      return;
    }

    console.log('ChatButton: Connecting to Socket.IO server');
    this.chatService.connect();
    this.hasConnected = true;
  }

  /// Joins the restaurant-specific chat room via Socket.IO
  private joinRoom(): void {
    const roomId = this.getRoomId();
    console.log('ChatButton: Joining room', roomId);
    this.isLoadingHistory = true;
    this.chatService.joinRoom(roomId);
  }

  /// Leaves the current chat room
  private leaveRoom(): void {
    const roomId = this.getRoomId();
    console.log('ChatButton: Leaving room', roomId);
    this.chatService.leaveRoom(roomId);
  }

  /// Toggles the visibility of the chat interface window
  async toggleChat(): Promise<void> {
    // Check if user is logged in
    if (!this.authService.currentUser) {
      this.isOpen = true;
      this.showLoginPrompt = true;
      return;
    }

    // Toggle chat window
    this.isOpen = !this.isOpen;
    this.showLoginPrompt = false;

    if (this.isOpen) {
      // Opening chat - connect and join room
      this.unreadCount = 0;
      console.log('ChatButton: Opening chat, connecting to Socket.IO');
      await this.connectAndRegister();

      // If already connected, join room immediately
      if (this.chatService.isConnected && this.chatService.isRegistered) {
        this.joinRoom();
      }

      setTimeout(() => this.scrollToBottom(), 100);
    } else {
      // Closing chat - leave room but keep connection
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
    this.fileInput.nativeElement.click();
  }

  /// Handles image file selection
  async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }

    this.selectedImage = file;

    // Generate preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  /// Clears selected image and preview
  clearImage(): void {
    this.selectedImage = null;
    this.previewUrl = null;
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  /// Uploads image to server and returns URL
  private async uploadImage(file: File): Promise<string> {
    this.isUploadingImage = true;
    this.uploadProgress = 0;

    try {
      const token = await this.authService.getIdToken();
      if (!token) throw new Error('No authentication token available');

      const formData = new FormData();
      formData.append('image', file);

      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'x-api-passcode': 'PourRice'
      });

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        if (this.uploadProgress < 90) {
          this.uploadProgress += 10;
        }
      }, 200);

      const response = await this.httpClient.post<{
        success: boolean;
        imageUrl: string;
      }>(
        `${environment.apiUrl}/API/Images/upload?folder=Chat`,
        formData,
        { headers }
      ).toPromise();

      clearInterval(progressInterval);
      this.uploadProgress = 100;

      if (!response || !response.success) {
        throw new Error('Image upload failed');
      }

      return response.imageUrl;
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    } finally {
      this.isUploadingImage = false;
      this.uploadProgress = 0;
    }
  }

  /// Sends the composed message (text and/or image) to the chat room
  async sendMessage(): Promise<void> {
    if ((!this.newMessage.trim() && !this.selectedImage) || !this.isConnected) {
      console.warn('ChatButton: Cannot send message - not connected or empty message');
      return;
    }

    const roomId = this.getRoomId();
    let imageUrl: string | undefined = undefined;

    try {
      // Upload image if selected
      if (this.selectedImage) {
        console.log('ChatButton: Uploading image...');
        imageUrl = await this.uploadImage(this.selectedImage);
        console.log('ChatButton: Image uploaded:', imageUrl);
        this.clearImage();
      }

      // Send message via Socket.IO
      console.log('ChatButton: Sending message to room', roomId);
      await this.chatService.sendMessage(roomId, this.newMessage.trim(), imageUrl);

      this.newMessage = '';
      this.chatService.sendTypingIndicator(roomId, false);
    } catch (error) {
      console.error('ChatButton: Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  }

  /// Handles typing events and broadcasts typing indicators
  onTyping(): void {
    if (!this.isConnected) return;

    const roomId = this.getRoomId();
    this.chatService.sendTypingIndicator(roomId, true);

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    this.typingTimeout = setTimeout(() => {
      this.chatService.sendTypingIndicator(roomId, false);
    }, 2000);
  }

  /// Scrolls the message list to display the most recent message
  private scrollToBottom(): void {
    const messageList = document.querySelector('.chat-messages');
    if (messageList) {
      messageList.scrollTop = messageList.scrollHeight;
    }
  }

  /// Determines whether a message was sent by the current user
  isOwnMessage(message: ChatMessage): boolean {
    return message.userId === this.authService.currentUser?.uid;
  }

  /// Checks if message contains an image
  hasImage(message: ChatMessage): boolean {
    return !!(message as any).imageUrl;
  }

  /// Gets image URL from message
  getImageUrl(message: ChatMessage): string {
    return (message as any).imageUrl || '';
  }

  /// Formats message timestamps into human-readable time strings
  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}