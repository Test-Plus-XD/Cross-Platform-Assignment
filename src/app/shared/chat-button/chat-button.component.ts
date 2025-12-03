import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';

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

  // Chat state
  isOpen = false;
  messages: ChatMessage[] = [];
  newMessage = '';
  isConnected = false;
  isTyping = false;
  unreadCount = 0;
  showLoginPrompt = false;

  // Language
  lang$ = this.languageService.lang$;

  // Cleanup
  private destroy$ = new Subject<void>();
  private typingTimeout: any;

  constructor(
    private readonly chatService: ChatService,
    private readonly authService: AuthService,
    private readonly languageService: LanguageService,
    private readonly modalController: ModalController,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to connection state
    this.chatService.connectionState$.pipe(takeUntil(this.destroy$)).subscribe(state => {
      this.isConnected = state === 'connected';
      if (this.isConnected && this.restaurantId) {
        this.joinRoom();
      }
    });

    // Subscribe to new messages
    this.chatService.messages$.pipe(takeUntil(this.destroy$)).subscribe(message => {
      if (message.roomId === this.getRoomId()) {
        this.messages.push(message);
        if (!this.isOpen) {
          this.unreadCount++;
        }
        // Scroll to bottom after message is added
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });

    // Subscribe to typing indicators
    this.chatService.typingIndicators$.pipe(takeUntil(this.destroy$)).subscribe(indicator => {
      if (indicator.roomId === this.getRoomId() && indicator.userId !== this.authService.currentUser?.uid) {
        this.isTyping = indicator.isTyping;
      }
    });

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
  }

  /**
   * Get room ID for this chat (restaurant-specific)
   */
  private getRoomId(): string {
    return `restaurant-${this.restaurantId}`;
  }

  /**
   * Join the restaurant chat room
   */
  private joinRoom(): void {
    const roomId = this.getRoomId();
    console.log('ChatButton: Joining room', roomId);
    this.chatService.joinRoom(roomId);
  }

  /**
   * Toggle chat window
   */
  toggleChat(): void {
    // Check if user is logged in
    if (!this.authService.currentUser) {
      // Open chat window and show login prompt
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

  /**
   * Navigate to login page
   */
  goToLogin(): void {
    this.isOpen = false;
    this.showLoginPrompt = false;
    this.router.navigate(['/login']);
  }

  /**
   * Send message
   */
  async sendMessage(): Promise<void> {
    if (!this.newMessage.trim() || !this.isConnected) return;

    const roomId = this.getRoomId();
    // Await the async sendMessage call
    await this.chatService.sendMessage(roomId, this.newMessage.trim());
    this.newMessage = '';

    // Stop typing indicator
    this.chatService.sendTypingIndicator(roomId, false);
  }

  /**
   * Handle typing
   */
  onTyping(): void {
    const roomId = this.getRoomId();
    this.chatService.sendTypingIndicator(roomId, true);

    // Clear existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Stop typing after 2 seconds of inactivity
    this.typingTimeout = setTimeout(() => {
      this.chatService.sendTypingIndicator(roomId, false);
    }, 2000);
  }

  /**
   * Scroll chat to bottom
   */
  private scrollToBottom(): void {
    const messageList = document.querySelector('.chat-messages');
    if (messageList) {
      messageList.scrollTop = messageList.scrollHeight;
    }
  }

  /**
   * Check if message is from current user
   */
  isOwnMessage(message: ChatMessage): boolean {
    return message.userId === this.authService.currentUser?.uid;
  }

  /**
   * Format timestamp
   */
  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
