import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/// Chat message interface defines the structure of messages exchanged in chat rooms
export interface ChatMessage {
  messageId: string;
  roomId: string;
  userId: string;
  displayName: string;
  message: string;
  timestamp: string;
  type?: 'text' | 'image' | 'file';
}

/// Chat room interface defines the structure of chat rooms and their metadata
export interface ChatRoom {
  roomId: string;
  name?: string;
  participants: string[];
  type: 'direct' | 'group';
  lastMessage?: ChatMessage;
  unreadCount?: number;
}

/// Typing indicator interface tracks which users are currently typing in a room
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
  private Socket: Socket | null = null;
  private readonly SocketUrl = environment.socketUrl;
  // Connection state tracks the current Socket.IO connection status
  private ConnectionState = new BehaviorSubject<'disconnected' | 'connecting' | 'connected'>('disconnected');
  public ConnectionState$ = this.ConnectionState.asObservable();
  // Messages stream emits all incoming chat messages from rooms
  private Messages = new Subject<ChatMessage>();
  public Messages$ = this.Messages.asObservable();
  // Private messages stream emits direct messages between users
  private PrivateMessages = new Subject<ChatMessage>();
  public PrivateMessages$ = this.PrivateMessages.asObservable();
  // Typing indicators stream emits typing status updates for all rooms
  private TypingIndicators = new Subject<TypingIndicator>();
  public TypingIndicators$ = this.TypingIndicators.asObservable();
  // Active rooms tracks which chat rooms the user has joined
  private ActiveRooms = new BehaviorSubject<string[]>([]);
  public ActiveRooms$ = this.ActiveRooms.asObservable();
  // Online users map tracks the online/offline status of all known users
  private OnlineUsers = new BehaviorSubject<Map<string, boolean>>(new Map());
  public OnlineUsers$ = this.OnlineUsers.asObservable();

  constructor(private readonly AuthService: AuthService) {
    console.log('ChatService: Initialised');
    // Auto-connect is triggered when user authentication state changes
    this.AuthService.currentUser$.subscribe(User => {
      if (User) this.connect();
      else this.disconnect();
    });
  }

  /// Establishes connection to the Socket.IO server with authentication
  connect(): void {
    if (this.Socket?.connected) {
      console.log('ChatService: Already connected');
      return;
    }
    const User = this.AuthService.currentUser;
    if (!User) {
      console.warn('ChatService: Cannot connect without authenticated user');
      return;
    }
    console.log('ChatService: Connecting to', this.SocketUrl);
    this.ConnectionState.next('connecting');
    // Socket instance is created with reconnection settings for reliability
    this.Socket = io(this.SocketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });
    this.setupListeners();
  }

  /// Configures all Socket.IO event listeners for connection, messages, and presence
  private setupListeners(): void {
    if (!this.Socket) return;
    // Connection event indicates successful Socket.IO connection
    this.Socket.on('connect', () => {
      console.log('ChatService: Connected to server');
      this.ConnectionState.next('connected');
      this.registerUser();
    });
    // Disconnect event fires when connection to server is lost
    this.Socket.on('disconnect', (Reason) => {
      console.log('ChatService: Disconnected:', Reason);
      this.ConnectionState.next('disconnected');
    });
    // Connection error event handles failed connection attempts
    this.Socket.on('connect_error', (Error) => {
      console.error('ChatService: Connection error:', Error);
      this.ConnectionState.next('disconnected');
    });
    // Registration response confirms user registration with server
    this.Socket.on('registered', (Data: { success: boolean; userId: string; socketId: string }) => {
      console.log('ChatService: Registered successfully', Data);
    });
    // Joined room event confirms successful room join operation
    this.Socket.on('joined-room', (Data: { roomId: string; success: boolean }) => {
      console.log('ChatService: Joined room', Data.roomId);
      if (Data.success) {
        const Rooms = this.ActiveRooms.value;
        if (!Rooms.includes(Data.roomId)) this.ActiveRooms.next([...Rooms, Data.roomId]);
      }
    });
    // User joined room event notifies when another user joins a room
    this.Socket.on('user-joined-room', (Data: { roomId: string; userId: string; timestamp: string }) => {
      console.log('ChatService: User joined room', Data);
    });
    // User left room event notifies when another user leaves a room
    this.Socket.on('user-left-room', (Data: { roomId: string; userId: string; timestamp: string }) => {
      console.log('ChatService: User left room', Data);
    });
    // New message event delivers incoming messages from chat rooms
    this.Socket.on('new-message', (Message: ChatMessage) => {
      console.log('ChatService: New message received', Message);
      this.Messages.next(Message);
    });
    // Private message event delivers direct messages between users
    this.Socket.on('private-message', (Message: {
      fromUserId: string;
      fromDisplayName: string;
      message: string;
      timestamp: string;
      messageId: string;
    }) => {
      console.log('ChatService: Private message received', Message);
      const ChatMessage: ChatMessage = {
        messageId: Message.messageId,
        roomId: `private-${Message.fromUserId}`,
        userId: Message.fromUserId,
        displayName: Message.fromDisplayName,
        message: Message.message,
        timestamp: Message.timestamp
      };
      this.PrivateMessages.next(ChatMessage);
    });
    // User typing event indicates when users are actively typing
    this.Socket.on('user-typing', (Data: TypingIndicator) => {
      console.log('ChatService: User typing', Data);
      this.TypingIndicators.next(Data);
    });
    // User online event updates presence status when users come online
    this.Socket.on('user-online', (Data: { userId: string; displayName: string; timestamp: string }) => {
      console.log('ChatService: User online', Data.userId);
      const Users = this.OnlineUsers.value;
      Users.set(Data.userId, true);
      this.OnlineUsers.next(new Map(Users));
    });
    // User offline event updates presence status when users go offline
    this.Socket.on('user-offline', (Data: { userId: string; displayName: string; lastSeen: string }) => {
      console.log('ChatService: User offline', Data.userId);
      const Users = this.OnlineUsers.value;
      Users.set(Data.userId, false);
      this.OnlineUsers.next(new Map(Users));
    });
  }

  /// Registers the current user with the Socket.IO server for presence tracking
  private async registerUser(): Promise<void> {
    const User = this.AuthService.currentUser;
    // Firebase ID token is retrieved for API authentication
    const AuthToken = await this.AuthService.getIdToken();
    if (!User || !this.Socket) return;
    console.log('ChatService: Registering user', User.uid);
    this.Socket.emit('register', {
      userId: User.uid,
      displayName: User.displayName || User.email || 'Anonymous',
      authToken: AuthToken
    });
  }

  /// Joins a chat room with authentication token for API verification
  async joinRoom(RoomId: string): Promise<void> {
    const User = this.AuthService.currentUser;
    if (!User || !this.Socket?.connected) {
      console.warn('ChatService: Cannot join room, not connected');
      return;
    }
    // Firebase ID token is retrieved for API authentication
    const AuthToken = await this.AuthService.getIdToken();
    console.log('ChatService: Joining room', RoomId);
    this.Socket.emit('join-room', {
      roomId: RoomId,
      userId: User.uid,
      authToken: AuthToken
    });
  }

  /// Leaves a chat room with authentication token for API verification
  async leaveRoom(RoomId: string): Promise<void> {
    const User = this.AuthService.currentUser;
    if (!User || !this.Socket?.connected) {
      console.warn('ChatService: Cannot leave room, not connected');
      return;
    }
    // Firebase ID token is retrieved for API authentication
    const AuthToken = await this.AuthService.getIdToken();
    console.log('ChatService: Leaving room', RoomId);
    this.Socket.emit('leave-room', {
      roomId: RoomId,
      userId: User.uid,
      authToken: AuthToken
    });
    // Room is removed from active rooms list after leaving
    const Rooms = this.ActiveRooms.value.filter(Room => Room !== RoomId);
    this.ActiveRooms.next(Rooms);
  }

  /// Sends a message to a chat room with authentication token for API persistence
  async sendMessage(RoomId: string, Message: string): Promise<void> {
    const User = this.AuthService.currentUser;
    if (!User || !this.Socket?.connected) {
      console.warn('ChatService: Cannot send message, not connected');
      return;
    }
    // Firebase ID token is retrieved for API authentication
    const AuthToken = await this.AuthService.getIdToken();
    console.log('ChatService: Sending message to room', RoomId);
    this.Socket.emit('send-message', {
      roomId: RoomId,
      userId: User.uid,
      displayName: User.displayName || User.email || 'Anonymous',
      message: Message,
      authToken: AuthToken
    });
  }

  /// Sends a private message directly to another user
  sendPrivateMessage(ToUserId: string, Message: string): void {
    const User = this.AuthService.currentUser;
    if (!User || !this.Socket?.connected) {
      console.warn('ChatService: Cannot send private message, not connected');
      return;
    }
    console.log('ChatService: Sending private message to', ToUserId);
    this.Socket.emit('private-message', {
      toUserId: ToUserId,
      fromUserId: User.uid,
      fromDisplayName: User.displayName || User.email || 'Anonymous',
      message: Message
    });
  }

  /// Sends typing indicator to notify other users of typing activity
  sendTypingIndicator(RoomId: string, IsTyping: boolean): void {
    const User = this.AuthService.currentUser;
    if (!User || !this.Socket?.connected) return;
    this.Socket.emit('typing', {
      roomId: RoomId,
      userId: User.uid,
      displayName: User.displayName || User.email || 'Anonymous',
      isTyping: IsTyping
    });
  }

  /// Disconnects from the Socket.IO server and clears connection state
  disconnect(): void {
    if (this.Socket) {
      console.log('ChatService: Disconnecting');
      this.Socket.disconnect();
      this.Socket = null;
      this.ConnectionState.next('disconnected');
      this.ActiveRooms.next([]);
    }
  }

  /// Checks if a specific user is currently online
  isUserOnline(UserId: string): boolean {
    return this.OnlineUsers.value.get(UserId) || false;
  }

  /// Returns the current Socket.IO connection status
  get isConnected(): boolean {
    return this.Socket?.connected || false;
  }
}