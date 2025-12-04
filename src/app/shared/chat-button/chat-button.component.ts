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
      if (this.isConnected && this.restaurantId) {
        this.joinRoom();
      }
    });

    // Messages subscription
    this.chatService.Messages$.pipe(takeUntil(this.destroy$)).subscribe(message => {
      if (message.roomId === this.getRoomId()) {
        this.messages.push(message);
        if (!this.isOpen) {
          this.unreadCount++;
        }
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

    // Connect if not already connected
    if (!this.chatService.isConnected) {
      this.chatService.connect();
    }
  }

  ngOnDestroy(): void {
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

  /// Joins the restaurant-specific chat room via Socket.IO
  private joinRoom(): void {
    const roomId = this.getRoomId();
    console.log('ChatButton: Joining room', roomId);
    this.chatService.joinRoom(roomId);
  }

  /// Toggles the visibility of the chat interface window
  toggleChat(): void {
    if (!this.authService.currentUser) {
      this.isOpen = true;
      this.showLoginPrompt = true;
      return;
    }

    this.isOpen = !this.isOpen;
    this.showLoginPrompt = false;

    if (this.isOpen) {
      this.unreadCount = 0;
      setTimeout(() => this.scrollToBottom(), 100);
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

      const response = await this.httpClient.post<{
        success: boolean;
        imageUrl: string;
      }>(
        `${environment.apiUrl}/API/Images/upload?folder=Chat`,
        formData,
        { headers }
      ).toPromise();

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
    if ((!this.newMessage.trim() && !this.selectedImage) || !this.isConnected) return;

    const roomId = this.getRoomId();
    let imageUrl: string | undefined = undefined;

    try {
      // Upload image if selected
      if (this.selectedImage) {
        imageUrl = await this.uploadImage(this.selectedImage);
        this.clearImage();
      }

      // Send message via Socket.IO
      await this.chatService.sendMessage(roomId, this.newMessage.trim(), imageUrl);

      this.newMessage = '';
      this.chatService.sendTypingIndicator(roomId, false);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  }

  /// Handles typing events and broadcasts typing indicators
  onTyping(): void {
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