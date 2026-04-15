import { Injectable, inject } from '@angular/core';
import { Subject, combineLatest, firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { ChatMessage, ChatService } from './chat.service';
import { DataService } from './data.service';
import { MessagingService, NotificationPayload } from './messaging.service';

interface UserChatRecordsResponse {
  userId: string;
  totalRooms: number;
  rooms: Array<{ roomId: string }>;
}

// Coordinates notification registration, socket subscriptions, and app-wide notification display.
@Injectable({
  providedIn: 'root'
})
export class NotificationCoordinatorService {
  private readonly authService = inject(AuthService);
  private readonly chatService = inject(ChatService);
  private readonly dataService = inject(DataService);
  private readonly messagingService = inject(MessagingService);
  private readonly displayNotificationSubject = new Subject<NotificationPayload>();
  private readonly notificationActionSubject = new Subject<NotificationPayload>();
  private readonly trackedRoomIds = new Set<string>();
  private readonly processedMessageIds = new Map<string, number>();
  private started = false;
  private activeUserId: string | null = null;
  private lastRegisteredTokenKey: string | null = null;
  private roomRefreshPromise: Promise<void> | null = null;

  public readonly displayNotifications$ = this.displayNotificationSubject.asObservable();
  public readonly notificationActions$ = this.notificationActionSubject.asObservable();

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() { }

  // Start the coordinator once from the application root.
  start(): void {
    if (this.started) return;

    this.started = true;
    this.observeAuthLifecycle();
    this.observeTokenLifecycle();
    this.observeFcmNotifications();
    this.observeSocketNotifications();
  }

  // Request permission from the user and immediately try to register the resulting token.
  async requestPermissionAndSync(): Promise<string | null> {
    const token = await this.messagingService.requestPermission();

    if (token) {
      await this.registerTokenIfNeeded(token);
    }

    return token;
  }

  // Refresh chat room subscriptions from the API for the current authenticated user.
  async refreshTrackedRooms(): Promise<void> {
    const currentUser = this.authService.currentUser;
    if (!currentUser) {
      this.clearTrackedRooms();
      return;
    }

    if (this.roomRefreshPromise) {
      await this.roomRefreshPromise;
      return;
    }

    this.roomRefreshPromise = this.loadTrackedRooms(currentUser.uid).finally(() => {
      this.roomRefreshPromise = null;
    });

    await this.roomRefreshPromise;
  }

  // Track a newly created room immediately so reply notifications continue after the current page closes.
  trackRoom(roomId: string): void {
    if (!roomId || !roomId.trim()) return;

    this.trackedRoomIds.add(roomId);
    this.chatService.addPersistentRoom(roomId);
  }

  // Observe auth restoration and login/logout changes so sockets and tokens follow the signed-in user.
  private observeAuthLifecycle(): void {
    combineLatest([this.authService.authInitialized$, this.authService.currentUser$]).subscribe(([authInitialised, currentUser]) => {
      if (!authInitialised) {
        return;
      }

      if (!currentUser) {
        this.handleSignedOutState();
        return;
      }

      void this.handleSignedInState(currentUser.uid);
    });
  }

  // Observe token changes so a restored or refreshed token is always registered for the signed-in user.
  private observeTokenLifecycle(): void {
    combineLatest([this.authService.currentUser$, this.messagingService.getToken$()]).subscribe(([currentUser, token]) => {
      if (!currentUser || !token) {
        return;
      }

      void this.registerTokenIfNeeded(token, currentUser.uid);
    });
  }

  // Forward foreground FCM notifications into the app-wide toast stream with chat-message deduplication.
  private observeFcmNotifications(): void {
    this.messagingService.getMessages$().subscribe((payload) => {
      const normalisedPayload = this.normalisePayload(payload);

      if (this.shouldSuppressDuplicateChatToast(normalisedPayload)) {
        return;
      }

      this.displayNotificationSubject.next(normalisedPayload);
    });

    this.messagingService.getActions$().subscribe((payload) => {
      this.notificationActionSubject.next(this.normalisePayload(payload));
    });
  }

  // Convert real-time socket messages into the same app-wide notification stream used by FCM.
  private observeSocketNotifications(): void {
    this.chatService.Messages$.subscribe((message) => {
      const currentUserId = this.authService.currentUser?.uid;

      if (!currentUserId || message.userId === currentUserId) {
        return;
      }

      const payload = this.createSocketNotification(message);

      if (this.shouldSuppressDuplicateChatToast(payload)) {
        return;
      }

      this.displayNotificationSubject.next(payload);
    });
  }

  // Handle the transition into an authenticated state.
  private async handleSignedInState(userId: string): Promise<void> {
    const userChanged = this.activeUserId !== userId;

    this.activeUserId = userId;
    if (userChanged) {
      this.lastRegisteredTokenKey = null;
    }

    this.chatService.connect();
    await this.messagingService.syncTokenIfPermitted();
    await this.refreshTrackedRooms();
  }

  // Handle the transition into a signed-out state.
  private handleSignedOutState(): void {
    this.activeUserId = null;
    this.lastRegisteredTokenKey = null;
    this.processedMessageIds.clear();
    this.clearTrackedRooms();
    this.chatService.disconnect();
  }

  // Register the current token with the backend once per user-token pair.
  private async registerTokenIfNeeded(token: string, explicitUserId?: string): Promise<void> {
    const userId = explicitUserId || this.authService.currentUser?.uid;
    if (!userId) {
      return;
    }

    const registrationKey = `${userId}:${token}`;
    if (this.lastRegisteredTokenKey === registrationKey) {
      return;
    }

    const authToken = await this.authService.getIdToken();
    if (!authToken) {
      return;
    }

    await this.messagingService.registerTokenWithBackend(token, authToken);
    this.lastRegisteredTokenKey = registrationKey;
  }

  // Load the current user's rooms from the API and keep the socket joined to them persistently.
  private async loadTrackedRooms(userId: string): Promise<void> {
    try {
      const authToken = await this.authService.getIdToken();
      if (!authToken) {
        return;
      }

      const response = await firstValueFrom(
        this.dataService.get<UserChatRecordsResponse>(`/API/Chat/Records/${encodeURIComponent(userId)}`, authToken)
      );

      const roomIds = Array.isArray(response.rooms)
        ? response.rooms
          .map((room) => room.roomId)
          .filter((roomId): roomId is string => typeof roomId === 'string' && roomId.trim().length > 0)
        : [];

      this.setTrackedRooms(roomIds);
    } catch (error) {
      console.error('NotificationCoordinator Failed to refresh tracked rooms:', error);
    }
  }

  // Replace the current persistent room set and synchronise it into the socket layer.
  private setTrackedRooms(roomIds: string[]): void {
    this.trackedRoomIds.clear();
    roomIds.forEach((roomId) => this.trackedRoomIds.add(roomId));
    this.chatService.setPersistentRooms([...this.trackedRoomIds]);
  }

  // Clear all tracked rooms when the user signs out.
  private clearTrackedRooms(): void {
    this.trackedRoomIds.clear();
    this.chatService.setPersistentRooms([]);
  }

  // Normalise route data so legacy payloads still navigate correctly during the migration period.
  private normalisePayload(payload: NotificationPayload): NotificationPayload {
    const route = this.messagingService.resolveRoute(payload.data);
    if (!payload.data || !route) {
      return payload;
    }

    return {
      ...payload,
      data: {
        ...payload.data,
        route
      }
    };
  }

  // Build a notification payload from an incoming socket message.
  private createSocketNotification(message: ChatMessage): NotificationPayload {
    return this.messagingService.generateNotification('chat_message', {
      senderName: message.displayName || 'Unknown User',
      messagePreview: this.getMessagePreview(message),
      roomId: message.roomId,
      messageId: message.messageId
    });
  }

  // Convert empty text-plus-image messages into a readable preview string.
  private getMessagePreview(message: ChatMessage): string {
    const trimmedMessage = typeof message.message === 'string' ? message.message.trim() : '';

    if (trimmedMessage) {
      return trimmedMessage;
    }

    return '[Image]';
  }

  // Suppress the second toast when the same chat message arrives via both socket and FCM.
  private shouldSuppressDuplicateChatToast(payload: NotificationPayload): boolean {
    const messageId = payload.data?.messageId;
    if (!messageId) {
      return false;
    }

    this.pruneProcessedMessageIds();

    if (this.processedMessageIds.has(messageId)) {
      return true;
    }

    this.processedMessageIds.set(messageId, Date.now());
    return false;
  }

  // Bound the duplicate-tracking map so it does not grow indefinitely.
  private pruneProcessedMessageIds(): void {
    const expiryCutoff = Date.now() - 5 * 60 * 1000;

    for (const [messageId, timestamp] of this.processedMessageIds.entries()) {
      if (timestamp < expiryCutoff) {
        this.processedMessageIds.delete(messageId);
      }
    }
  }
}
