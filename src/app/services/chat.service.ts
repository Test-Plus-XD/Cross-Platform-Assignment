import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

// Chat message interface
export interface ChatMessage {
  messageId: string;
  roomId: string;
  userId: string;
  displayName: string;
  message: string;
  timestamp: string;
  type?: 'text' | 'image' | 'file';
}

// Chat room interface
export interface ChatRoom {
  roomId: string;
  name?: string;
  participants: string[];
  type: 'direct' | 'group';
  lastMessage?: ChatMessage;
  unreadCount?: number;
}

// Typing indicator
export interface TypingIndicator {
  roomId: string;
  userId: string;
  displayName: string;
  isTyping: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socket: Socket | null = null;
  private readonly socketUrl = environment.socketUrl;

  // Connection state
  private connectionState = new BehaviorSubject<'disconnected' | 'connecting' | 'connected'>('disconnected');
  public connectionState$ = this.connectionState.asObservable();

  // Messages stream
  private messages = new Subject<ChatMessage>();
  public messages$ = this.messages.asObservable();

  // Private messages stream
  private privateMessages = new Subject<ChatMessage>();
  public privateMessages$ = this.privateMessages.asObservable();

  // Typing indicators stream
  private typingIndicators = new Subject<TypingIndicator>();
  public typingIndicators$ = this.typingIndicators.asObservable();

  // Active rooms
  private activeRooms = new BehaviorSubject<string[]>([]);
  public activeRooms$ = this.activeRooms.asObservable();

  // User online status
  private onlineUsers = new BehaviorSubject<Map<string, boolean>>(new Map());
  public onlineUsers$ = this.onlineUsers.asObservable();

  constructor(private readonly authService: AuthService) {
    console.log('ChatService: Initialised');

    // Auto-connect when user logs in
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  /**
   * Connect to Socket.IO server
   */
  connect(): void {
    if (this.socket?.connected) {
      console.log('ChatService: Already connected');
      return;
    }

    const user = this.authService.currentUser;
    if (!user) {
      console.warn('ChatService: Cannot connect without authenticated user');
      return;
    }

    console.log('ChatService: Connecting to', this.socketUrl);
    this.connectionState.next('connecting');

    this.socket = io(this.socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.setupListeners();
  }

  /**
   * Setup Socket.IO event listeners
   */
  private setupListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('ChatService: Connected to server');
      this.connectionState.next('connected');
      this.registerUser();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('ChatService: Disconnected:', reason);
      this.connectionState.next('disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('ChatService: Connection error:', error);
      this.connectionState.next('disconnected');
    });

    // Registration response
    this.socket.on('registered', (data: { success: boolean; userId: string; socketId: string }) => {
      console.log('ChatService: Registered successfully', data);
    });

    // Room events
    this.socket.on('joined-room', (data: { roomId: string; success: boolean }) => {
      console.log('ChatService: Joined room', data.roomId);
      if (data.success) {
        const rooms = this.activeRooms.value;
        if (!rooms.includes(data.roomId)) {
          this.activeRooms.next([...rooms, data.roomId]);
        }
      }
    });

    this.socket.on('user-joined-room', (data: { roomId: string; userId: string; timestamp: string }) => {
      console.log('ChatService: User joined room', data);
    });

    this.socket.on('user-left-room', (data: { roomId: string; userId: string; timestamp: string }) => {
      console.log('ChatService: User left room', data);
    });

    // Message events
    this.socket.on('new-message', (message: ChatMessage) => {
      console.log('ChatService: New message received', message);
      this.messages.next(message);
    });

    this.socket.on('private-message', (message: {
      fromUserId: string;
      fromDisplayName: string;
      message: string;
      timestamp: string;
      messageId: string;
    }) => {
      console.log('ChatService: Private message received', message);
      const chatMessage: ChatMessage = {
        messageId: message.messageId,
        roomId: `private-${message.fromUserId}`,
        userId: message.fromUserId,
        displayName: message.fromDisplayName,
        message: message.message,
        timestamp: message.timestamp
      };
      this.privateMessages.next(chatMessage);
    });

    // Typing indicators
    this.socket.on('user-typing', (data: TypingIndicator) => {
      console.log('ChatService: User typing', data);
      this.typingIndicators.next(data);
    });

    // User presence
    this.socket.on('user-online', (data: { userId: string; displayName: string; timestamp: string }) => {
      console.log('ChatService: User online', data.userId);
      const users = this.onlineUsers.value;
      users.set(data.userId, true);
      this.onlineUsers.next(new Map(users));
    });

    this.socket.on('user-offline', (data: { userId: string; displayName: string; lastSeen: string }) => {
      console.log('ChatService: User offline', data.userId);
      const users = this.onlineUsers.value;
      users.set(data.userId, false);
      this.onlineUsers.next(new Map(users));
    });
  }

  /**
   * Register user with server
   */
  private registerUser(): void {
    const user = this.authService.currentUser;
    if (!user || !this.socket) return;

    console.log('ChatService: Registering user', user.uid);
    this.socket.emit('register', {
      userId: user.uid,
      displayName: user.displayName || user.email || 'Anonymous'
    });
  }

  /**
   * Join a chat room
   */
  joinRoom(roomId: string): void {
    const user = this.authService.currentUser;
    if (!user || !this.socket?.connected) {
      console.warn('ChatService: Cannot join room, not connected');
      return;
    }

    console.log('ChatService: Joining room', roomId);
    this.socket.emit('join-room', {
      roomId,
      userId: user.uid
    });
  }

  /**
   * Leave a chat room
   */
  leaveRoom(roomId: string): void {
    const user = this.authService.currentUser;
    if (!user || !this.socket?.connected) {
      console.warn('ChatService: Cannot leave room, not connected');
      return;
    }

    console.log('ChatService: Leaving room', roomId);
    this.socket.emit('leave-room', {
      roomId,
      userId: user.uid
    });

    // Remove from active rooms
    const rooms = this.activeRooms.value.filter(r => r !== roomId);
    this.activeRooms.next(rooms);
  }

  /**
   * Send a message to a room
   */
  sendMessage(roomId: string, message: string): void {
    const user = this.authService.currentUser;
    if (!user || !this.socket?.connected) {
      console.warn('ChatService: Cannot send message, not connected');
      return;
    }

    console.log('ChatService: Sending message to room', roomId);
    this.socket.emit('send-message', {
      roomId,
      userId: user.uid,
      displayName: user.displayName || user.email || 'Anonymous',
      message
    });
  }

  /**
   * Send a private message to a user
   */
  sendPrivateMessage(toUserId: string, message: string): void {
    const user = this.authService.currentUser;
    if (!user || !this.socket?.connected) {
      console.warn('ChatService: Cannot send private message, not connected');
      return;
    }

    console.log('ChatService: Sending private message to', toUserId);
    this.socket.emit('private-message', {
      toUserId,
      fromUserId: user.uid,
      fromDisplayName: user.displayName || user.email || 'Anonymous',
      message
    });
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(roomId: string, isTyping: boolean): void {
    const user = this.authService.currentUser;
    if (!user || !this.socket?.connected) return;

    this.socket.emit('typing', {
      roomId,
      userId: user.uid,
      displayName: user.displayName || user.email || 'Anonymous',
      isTyping
    });
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('ChatService: Disconnecting');
      this.socket.disconnect();
      this.socket = null;
      this.connectionState.next('disconnected');
      this.activeRooms.next([]);
    }
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.onlineUsers.value.get(userId) || false;
  }

  /**
   * Get current connection status
   */
  get isConnected(): boolean {
    return this.socket?.connected || false;
  }
}
