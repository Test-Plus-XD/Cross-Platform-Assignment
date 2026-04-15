import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

// Chat message interface defines the structure of messages exchanged in chat rooms.
export interface ChatMessage {
  messageId: string;
  roomId: string;
  userId: string;
  displayName: string;
  message: string;
  imageUrl?: string;
  timestamp: string;
  type?: 'text' | 'image' | 'file';
}

// Chat room interface defines the structure of chat rooms and their metadata.
export interface ChatRoom {
  roomId: string;
  name?: string;
  participants: string[];
  participantsData?: any[];
  type: 'direct' | 'group';
  lastMessage?: string;
  lastMessageAt?: string;
  messageCount?: number;
  unreadCount?: number;
  recentMessages?: ChatMessage[];
}

// Typing indicator interface tracks which users are currently typing in a room.
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
  private readonly authService = inject(AuthService);
  private socket: Socket | null = null;
  private readonly socketUrl = environment.socketUrl;
  private readonly persistentRoomIds = new Set<string>();
  private readonly transientRoomIds = new Set<string>();
  private readonly joinedRoomIds = new Set<string>();
  private readonly joiningRoomIds = new Set<string>();
  private isRegistering = false;

  // Connection state tracks the current Socket.IO connection status.
  private readonly connectionState = new BehaviorSubject<'disconnected' | 'connecting' | 'connected'>('disconnected');
  public readonly ConnectionState$ = this.connectionState.asObservable();

  // Messages stream emits all incoming chat messages from rooms.
  private readonly messages = new Subject<ChatMessage>();
  public readonly Messages$ = this.messages.asObservable();

  // Message history stream emits loaded message history for rooms.
  private readonly messageHistory = new Subject<{ roomId: string; messages: ChatMessage[] }>();
  public readonly MessageHistory$ = this.messageHistory.asObservable();

  // Typing indicators stream emits typing status updates for all rooms.
  private readonly typingIndicators = new Subject<TypingIndicator>();
  public readonly TypingIndicators$ = this.typingIndicators.asObservable();

  // Active rooms tracks which chat rooms the socket is currently joined to.
  private readonly activeRooms = new BehaviorSubject<string[]>([]);
  public readonly ActiveRooms$ = this.activeRooms.asObservable();

  // Online users map tracks the online/offline status of all known users.
  private readonly onlineUsers = new BehaviorSubject<Map<string, boolean>>(new Map());
  public readonly OnlineUsers$ = this.onlineUsers.asObservable();

  // Registration state tracks whether user is registered with the Socket.IO server.
  private readonly isRegisteredSubject = new BehaviorSubject<boolean>(false);
  public readonly IsRegistered$ = this.isRegisteredSubject.asObservable();

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {
    console.log('ChatService: Initialised with persistent room tracking');
  }

  // Establishes a connection to the Socket.IO server for the current authenticated user.
  connect(): void {
    const user = this.authService.currentUser;
    if (!user) {
      console.warn('ChatService: Cannot connect without authenticated user');
      return;
    }

    if (this.socket?.connected) {
      return;
    }

    if (this.connectionState.value === 'connecting') {
      return;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
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

  // Configures all Socket.IO event listeners for connection, messages, and presence.
  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('ChatService: Connected to server, socket ID:', this.socket?.id);
      this.connectionState.next('connected');
      void this.registerUser();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('ChatService: Disconnected:', reason);
      this.connectionState.next('disconnected');
      this.isRegisteredSubject.next(false);
      this.isRegistering = false;
      this.joiningRoomIds.clear();
      this.joinedRoomIds.clear();
      this.activeRooms.next([]);
    });

    this.socket.on('connect_error', (error) => {
      console.error('ChatService: Connection error:', error);
      this.connectionState.next('disconnected');
      this.isRegisteredSubject.next(false);
      this.isRegistering = false;
    });

    this.socket.on('registered', (data: { success: boolean; userId: string; socketId: string; error?: string }) => {
      this.isRegistering = false;

      if (data.success) {
        console.log('ChatService: Registered successfully', data);
        this.isRegisteredSubject.next(true);
        this.syncRooms();
      } else {
        console.error('ChatService: Registration failed', data.error);
        this.isRegisteredSubject.next(false);
      }
    });

    this.socket.on('joined-room', (data: { roomId: string; success: boolean; error?: string }) => {
      this.joiningRoomIds.delete(data.roomId);

      if (data.success) {
        console.log('ChatService: Joined room', data.roomId);
        this.joinedRoomIds.add(data.roomId);
        this.publishActiveRooms();
      } else {
        console.error('ChatService: Failed to join room', data.roomId, data.error);
      }
    });

    this.socket.on('message-history', (data: { roomId: string; messages: ChatMessage[] }) => {
      console.log('ChatService: Received message history for', data.roomId, '-', data.messages.length, 'messages');
      this.messageHistory.next(data);
    });

    this.socket.on('user-joined-room', (data: { roomId: string; userId: string; timestamp: string }) => {
      console.log('ChatService: User joined room', data);
    });

    this.socket.on('user-left-room', (data: { roomId: string; userId: string; timestamp: string }) => {
      console.log('ChatService: User left room', data);
    });

    this.socket.on('new-message', (message: ChatMessage) => {
      console.log('ChatService: New message received', message);
      this.messages.next(message);
    });

    this.socket.on('message-sent', (data: { success: boolean; messageId: string; timestamp: string; error?: string }) => {
      if (data.success) {
        console.log('ChatService: Message sent successfully', data.messageId);
      } else {
        console.error('ChatService: Message failed to send', data.error);
      }
    });

    this.socket.on('user-typing', (data: TypingIndicator) => {
      console.log('ChatService: User typing', data);
      this.typingIndicators.next(data);
    });

    this.socket.on('user-online', (data: { userId: string; displayName: string; timestamp: string }) => {
      const nextUsers = new Map(this.onlineUsers.value);
      nextUsers.set(data.userId, true);
      this.onlineUsers.next(nextUsers);
    });

    this.socket.on('user-offline', (data: { userId: string; displayName: string; lastSeen: string }) => {
      const nextUsers = new Map(this.onlineUsers.value);
      nextUsers.set(data.userId, false);
      this.onlineUsers.next(nextUsers);
    });
  }

  // Registers the current user with the Socket.IO server for presence and room synchronisation.
  private async registerUser(): Promise<void> {
    const user = this.authService.currentUser;
    if (!user || !this.socket || this.isRegistering) return;

    const authToken = await this.authService.getIdToken();
    if (!authToken) {
      console.error('ChatService: Cannot register without auth token');
      return;
    }

    this.isRegistering = true;
    console.log('ChatService: Registering user', user.uid);

    this.socket.emit('register', {
      userId: user.uid,
      displayName: user.displayName || user.email || 'Anonymous',
      authToken
    });
  }

  // Replace the persistent room subscription set used for app-wide socket notifications.
  setPersistentRooms(roomIds: string[]): void {
    this.persistentRoomIds.clear();
    roomIds
      .filter((roomId): roomId is string => typeof roomId === 'string' && roomId.trim().length > 0)
      .forEach((roomId) => this.persistentRoomIds.add(roomId));

    this.syncRooms();
  }

  // Add a single room to the persistent subscription set.
  addPersistentRoom(roomId: string): void {
    if (!roomId || !roomId.trim()) return;

    this.persistentRoomIds.add(roomId);
    this.syncRooms();
  }

  // Remove a single room from the persistent subscription set.
  removePersistentRoom(roomId: string): void {
    if (!roomId) return;

    this.persistentRoomIds.delete(roomId);
    this.syncRooms();
  }

  // Join a room for the active chat UI while keeping persistent tracking separate.
  async joinRoom(roomId: string): Promise<void> {
    if (!roomId || !roomId.trim()) return;

    this.transientRoomIds.add(roomId);
    this.connect();
    this.syncRooms();
  }

  // Leave a room for the active chat UI without breaking persistent notification subscriptions.
  async leaveRoom(roomId: string): Promise<void> {
    if (!roomId || !roomId.trim()) return;

    this.transientRoomIds.delete(roomId);
    this.syncRooms();
  }

  // Synchronise the desired union of persistent and transient rooms with the live socket connection.
  private syncRooms(): void {
    if (!this.socket?.connected || !this.isRegistered) {
      return;
    }

    const user = this.authService.currentUser;
    if (!user) {
      return;
    }

    const desiredRoomIds = new Set<string>([
      ...this.persistentRoomIds,
      ...this.transientRoomIds
    ]);

    desiredRoomIds.forEach((roomId) => {
      if (this.joinedRoomIds.has(roomId) || this.joiningRoomIds.has(roomId)) {
        return;
      }

      console.log('ChatService: Joining room', roomId);
      this.joiningRoomIds.add(roomId);
      this.socket?.emit('join-room', {
        roomId,
        userId: user.uid
      });
    });

    [...this.joinedRoomIds].forEach((roomId) => {
      if (desiredRoomIds.has(roomId)) {
        return;
      }

      console.log('ChatService: Leaving room', roomId);
      this.socket?.emit('leave-room', {
        roomId,
        userId: user.uid
      });

      this.joinedRoomIds.delete(roomId);
      this.joiningRoomIds.delete(roomId);
    });

    this.publishActiveRooms();
  }

  // Publish the joined room set for any UI that wants to observe current room membership.
  private publishActiveRooms(): void {
    this.activeRooms.next([...this.joinedRoomIds].sort());
  }

  // Sends a message to a chat room with optional image content.
  async sendMessage(roomId: string, message: string, imageUrl?: string): Promise<void> {
    const user = this.authService.currentUser;
    if (!user || !this.socket?.connected) {
      console.warn('ChatService: Cannot send message, not connected');
      return;
    }

    const messagePayload: any = {
      roomId,
      userId: user.uid,
      displayName: user.displayName || user.email || 'Anonymous',
      message
    };

    if (imageUrl) {
      messagePayload.imageUrl = imageUrl;
    }

    this.socket.emit('send-message', messagePayload);
  }

  // Sends a typing indicator to other members of a room.
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

  // Disconnect from the socket server and reset connection-scoped state.
  disconnect(): void {
    if (this.socket) {
      console.log('ChatService: Disconnecting');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.connectionState.next('disconnected');
    this.isRegisteredSubject.next(false);
    this.isRegistering = false;
    this.joiningRoomIds.clear();
    this.joinedRoomIds.clear();
    this.transientRoomIds.clear();
    this.activeRooms.next([]);
  }

  // Checks whether a specific user is currently online.
  isUserOnline(userId: string): boolean {
    return this.onlineUsers.value.get(userId) || false;
  }

  // Returns the current Socket.IO connection status.
  get isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Returns the current user registration status.
  get isRegistered(): boolean {
    return this.isRegisteredSubject.value;
  }
}

export class ChatApiService {
  private readonly apiUrl = `${environment.apiUrl}/API/Chat`;

  constructor(
    private readonly httpClient: HttpClient,
    private readonly authService: AuthService
  ) { }

  // HTTP headers include authentication token for API requests.
  private async getHeaders(): Promise<HttpHeaders> {
    const token = await this.authService.getIdToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'x-api-passcode': 'PourRice',
      ...(token && { 'Authorization': `Bearer ${token}` })
    });
  }

  // Retrieves chat history for a specific room from the API.
  async getRoomMessages(roomId: string, limit: number = 50): Promise<Observable<any>> {
    const headers = await this.getHeaders();
    return this.httpClient.get(
      `${this.apiUrl}/Rooms/${roomId}/Messages?limit=${limit}`,
      { headers }
    );
  }

  // Retrieves all chat records for a specific user.
  async getUserChatRecords(userId: string): Promise<Observable<any>> {
    const headers = await this.getHeaders();
    return this.httpClient.get(
      `${this.apiUrl}/Records/${userId}`,
      { headers }
    );
  }

  // Retrieves all available chat rooms with participant data.
  async getAllRooms(): Promise<Observable<any>> {
    const headers = await this.getHeaders();
    return this.httpClient.get(
      `${this.apiUrl}/Rooms`,
      { headers }
    );
  }

  // Retrieves public chat rooms and recent activity without authentication.
  getRoomsPublic(limit: number = 50): Observable<any> {
    return this.httpClient.get(
      `${this.apiUrl}/RoomsPublic?limit=${limit}`,
      { headers: new HttpHeaders({ 'x-api-passcode': 'PourRice' }) }
    );
  }

  // Creates a new chat room with specified participants.
  async createRoom(roomId: string, participants: string[], roomName?: string, type?: 'private' | 'group'): Promise<Observable<any>> {
    const headers = await this.getHeaders();
    return this.httpClient.post(
      `${this.apiUrl}/Rooms`,
      { roomId, participants, roomName, type },
      { headers }
    );
  }
}
