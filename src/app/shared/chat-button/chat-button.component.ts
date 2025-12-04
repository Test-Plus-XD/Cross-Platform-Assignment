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

  // Chat state tracks the current status of the chat interface
  isOpen = false;
  // Messages array stores all chat messages for this restaurant room
  messages: ChatMessage[] = [];
  // New message input holds the text being composed by the user
  newMessage = '';
  // Connection status indicates whether Socket.IO is connected
  isConnected = false;
  // Typing indicator shows when other users are typing in the room
  isTyping = false;
  // Unread count tracks messages received whilst chat window was closed
  unreadCount = 0;
  // Login prompt flag determines whether to display authentication request
  showLoginPrompt = false;
  // Language observable provides reactive translations throughout component
  lang$ = this.languageService.lang$;
  // Destroy subject signals component destruction for subscription cleanup
  private destroy$ = new Subject<void>();
  // Typing timeout handle manages the automatic cessation of typing indicators
  private typingTimeout: any;

  constructor(
    private readonly chatService: ChatService,
    private readonly authService: AuthService,
    private readonly languageService: LanguageService,
    private readonly modalController: ModalController,
    private readonly router: Router
  ) { }

  ngOnInit(): void {
    // Connection state subscription monitors Socket.IO connectivity changes
    this.chatService.ConnectionState$.pipe(takeUntil(this.destroy$)).subscribe(state => {
      this.isConnected = state === 'connected';
      // Room join is automatically triggered upon successful connection
      if (this.isConnected && this.restaurantId) {
        this.joinRoom();
      }
    });
    // Messages subscription receives and displays new chat messages
    this.chatService.Messages$.pipe(takeUntil(this.destroy$)).subscribe(message => {
      // Message filtering ensures only relevant room messages are displayed
      if (message.roomId === this.getRoomId()) {
        this.messages.push(message);
        // Unread counter increments when messages arrive whilst window is closed
        if (!this.isOpen) {
          this.unreadCount++;
        }
        // Scroll animation is delayed to ensure DOM has updated with new message
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
    // Typing indicators subscription shows when other users are composing messages
    this.chatService.TypingIndicators$.pipe(takeUntil(this.destroy$)).subscribe(indicator => {
      // Indicator filtering prevents showing user's own typing status
      if (indicator.roomId === this.getRoomId() && indicator.userId !== this.authService.currentUser?.uid) {
        this.isTyping = indicator.isTyping;
      }
    });
    // Connection initialisation occurs if service is not already connected
    if (!this.chatService.isConnected) {
      this.chatService.connect();
    }
  }

  ngOnDestroy(): void {
    // Destroy signal is emitted to complete all active subscriptions
    this.destroy$.next();
    this.destroy$.complete();
    // Typing timeout is cleared to prevent memory leaks
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
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
    // Authentication check prevents unauthenticated users from accessing chat
    if (!this.authService.currentUser) {
      // Chat window opens with login prompt for unauthenticated users
      this.isOpen = true;
      this.showLoginPrompt = true;
      return;
    }
    // Chat visibility is toggled for authenticated users
    this.isOpen = !this.isOpen;
    this.showLoginPrompt = false;
    // Unread counter resets and scroll occurs when chat opens
    if (this.isOpen) {
      this.unreadCount = 0;
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  /// Navigates user to login page for authentication
  goToLogin(): void {
    this.isOpen = false;
    this.showLoginPrompt = false;
    this.router.navigate(['/login']);
  }

  /// Sends the composed message to the chat room via Socket.IO
  async sendMessage(): Promise<void> {
    // Empty messages and disconnected states prevent message transmission
    if (!this.newMessage.trim() || !this.isConnected) return;
    const roomId = this.getRoomId();
    // Message is transmitted asynchronously to the Socket.IO server
    await this.chatService.sendMessage(roomId, this.newMessage.trim());
    this.newMessage = '';
    // Typing indicator is stopped immediately after message transmission
    this.chatService.sendTypingIndicator(roomId, false);
  }

  /// Handles typing events and broadcasts typing indicators to other users
  onTyping(): void {
    const roomId = this.getRoomId();
    // Typing indicator is broadcast to notify other room participants
    this.chatService.sendTypingIndicator(roomId, true);
    // Existing timeout is cleared to reset the inactivity timer
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }
    // Typing indicator automatically stops after two seconds of inactivity
    this.typingTimeout = setTimeout(() => {
      this.chatService.sendTypingIndicator(roomId, false);
    }, 2000);
  }

  /// Scrolls the message list to display the most recent message
  private scrollToBottom(): void {
    const messageList = document.querySelector('.chat-messages');
    // Scroll position is set to maximum to reveal latest messages
    if (messageList) {
      messageList.scrollTop = messageList.scrollHeight;
    }
  }

  /// Determines whether a message was sent by the current user
  isOwnMessage(message: ChatMessage): boolean {
    return message.userId === this.authService.currentUser?.uid;
  }

  /// Formats message timestamps into human-readable time strings
  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    // Time is formatted using locale-specific conventions
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}