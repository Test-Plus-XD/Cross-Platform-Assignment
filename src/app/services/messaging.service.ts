import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { getMessaging, getToken, onMessage, deleteToken, Messaging, MessagePayload } from 'firebase/messaging';
import { environment } from '../../environments/environment';

/**
 * Firebase Cloud Messaging Models
 */

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  data?: NotificationData;
  timestamp: number;
}

export interface NotificationData {
  url?: string;
  restaurantId?: string;
  bookingId?: string;
  roomId?: string;
  type?: NotificationType;
  [key: string]: any;
}

export type NotificationType =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_reminder'
  | 'new_review'
  | 'chat_message'
  | 'restaurant_claimed'
  | 'general';

export interface FcmTokenInfo {
  token: string;
  userId: string;
  deviceType: 'web' | 'ios' | 'android';
  createdAt: Date;
  updatedAt: Date;
}

export interface SendNotificationRequest {
  fcmToken: string;
  title: string;
  body: string;
  data?: NotificationData;
}

export interface SendToTopicRequest {
  topic: string;
  title: string;
  body: string;
  data?: NotificationData;
}

export interface SubscribeToTopicRequest {
  token: string;
  topic: string;
}

export interface NotificationTemplate {
  type: NotificationType;
  titleTemplate: (params: any) => string;
  bodyTemplate: (params: any) => string;
  dataTemplate?: (params: any) => NotificationData;
}

export const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  booking_confirmed: {
    type: 'booking_confirmed',
    titleTemplate: () => 'Booking Confirmed',
    bodyTemplate: (params) =>
      `Your reservation at ${params.restaurantName} is confirmed for ${params.dateTime}`,
    dataTemplate: (params) => ({
      type: 'booking_confirmed',
      url: '/bookings',
      bookingId: params.bookingId
    })
  },
  booking_cancelled: {
    type: 'booking_cancelled',
    titleTemplate: () => 'Booking Cancelled',
    bodyTemplate: (params) =>
      `Your reservation at ${params.restaurantName} has been cancelled`,
    dataTemplate: (params) => ({
      type: 'booking_cancelled',
      url: '/bookings',
      bookingId: params.bookingId
    })
  },
  booking_reminder: {
    type: 'booking_reminder',
    titleTemplate: () => 'Booking Reminder',
    bodyTemplate: (params) =>
      `Reminder: Your reservation at ${params.restaurantName} is in ${params.timeUntil}`,
    dataTemplate: (params) => ({
      type: 'booking_reminder',
      url: '/bookings',
      bookingId: params.bookingId
    })
  },
  new_review: {
    type: 'new_review',
    titleTemplate: () => 'New Review',
    bodyTemplate: (params) =>
      `Someone left a ${params.rating}-star review on your restaurant!`,
    dataTemplate: (params) => ({
      type: 'new_review',
      url: `/restaurant/${params.restaurantId}`,
      restaurantId: params.restaurantId
    })
  },
  chat_message: {
    type: 'chat_message',
    titleTemplate: (params) => `New message from ${params.senderName}`,
    bodyTemplate: (params) => params.messagePreview,
    dataTemplate: (params) => ({
      type: 'chat_message',
      url: '/chat',
      roomId: params.roomId
    })
  },
  restaurant_claimed: {
    type: 'restaurant_claimed',
    titleTemplate: () => 'Restaurant Claimed',
    bodyTemplate: (params) =>
      `You have successfully claimed ${params.restaurantName}`,
    dataTemplate: (params) => ({
      type: 'restaurant_claimed',
      url: '/store',
      restaurantId: params.restaurantId
    })
  },
  general: {
    type: 'general',
    titleTemplate: (params) => params.title || 'Notification',
    bodyTemplate: (params) => params.body || '',
    dataTemplate: (params) => params.data || {}
  }
};

/**
 * Firebase Cloud Messaging Service
 * Handles push notifications for the application
 */
@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private messaging: Messaging | null = null;
  private tokenSubject = new BehaviorSubject<string | null>(null);
  private messageSubject = new BehaviorSubject<NotificationPayload | null>(null);
  private permissionSubject = new BehaviorSubject<NotificationPermission>('default');

  public token$ = this.tokenSubject.asObservable();
  public message$ = this.messageSubject.asObservable();
  public permission$ = this.permissionSubject.asObservable();

  constructor() {
    this.initialiseMessaging();
  }

  /**
   * Initialise Firebase Cloud Messaging
   * Sets up the messaging instance and permission tracking
   */
  private initialiseMessaging(): void {
    try {
      if (!environment.fcmVapidKey) {
        console.warn('[Messaging] VAPID key not configured in environment');
        return;
      }

      if (typeof window === 'undefined' || !('Notification' in window)) {
        console.warn('[Messaging] Notifications not supported in this environment');
        return;
      }

      this.messaging = getMessaging();
      this.permissionSubject.next(Notification.permission);

      // Listen for foreground messages
      this.setupForegroundMessageListener();
    } catch (error) {
      console.error('[Messaging] Initialisation error:', error);
    }
  }

  /**
   * Request notification permission and obtain FCM token
   * @returns Promise resolving to FCM token or null if permission denied
   */
  async requestPermission(): Promise<string | null> {
    try {
      if (!this.messaging) {
        console.error('[Messaging] Messaging not initialised');
        return null;
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      this.permissionSubject.next(permission);

      if (permission !== 'granted') {
        console.warn('[Messaging] Notification permission denied');
        return null;
      }

      // Obtain FCM token
      const token = await getToken(this.messaging, {
        vapidKey: environment.fcmVapidKey
      });

      if (token) {
        console.log('[Messaging] Token obtained:', token.substring(0, 20) + '...');
        this.tokenSubject.next(token);

        // Store token in localStorage
        localStorage.setItem('fcmToken', token);

        return token;
      } else {
        console.warn('[Messaging] No registration token available');
        return null;
      }
    } catch (error) {
      console.error('[Messaging] Error obtaining token:', error);
      return null;
    }
  }

  /**
   * Retrieve current FCM token from memory or localStorage
   * @returns Current FCM token or null
   */
  getCurrentToken(): string | null {
    return this.tokenSubject.value || localStorage.getItem('fcmToken');
  }

  /**
   * Retrieve current notification permission status
   * @returns Current permission status
   */
  getCurrentPermission(): NotificationPermission {
    return this.permissionSubject.value;
  }

  /**
   * Delete current FCM token and remove from storage
   * @returns Promise resolving to true if successful
   */
  async deleteCurrentToken(): Promise<boolean> {
    try {
      if (!this.messaging) {
        console.error('[Messaging] Messaging not initialised');
        return false;
      }

      await deleteToken(this.messaging);
      this.tokenSubject.next(null);
      localStorage.removeItem('fcmToken');
      console.log('[Messaging] Token deleted successfully');
      return true;
    } catch (error) {
      console.error('[Messaging] Error deleting token:', error);
      return false;
    }
  }

  /**
   * Set up listener for foreground messages
   * Automatically displays notifications when app is in foreground
   */
  private setupForegroundMessageListener(): void {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload: MessagePayload) => {
      console.log('[Messaging] Foreground message received:', payload);

      const notificationPayload: NotificationPayload = {
        title: payload.notification?.title || 'New Notification',
        body: payload.notification?.body || '',
        icon: payload.notification?.icon,
        data: payload.data,
        timestamp: Date.now()
      };

      this.messageSubject.next(notificationPayload);

      // Display browser notification if permission granted
      if (Notification.permission === 'granted') {
        this.showNotification(notificationPayload);
      }
    });
  }

  /**
   * Display browser notification
   * @param payload Notification payload containing title, body, and metadata
   */
  private showNotification(payload: NotificationPayload): void {
    try {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/assets/icon/icon.png',
        badge: '/assets/icon/icon.png',
        tag: 'fcm-notification',
        requireInteraction: false,
        data: payload.data
      });

      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notification.close();

        // Navigate to specified URL if provided
        if (payload.data?.url) {
          window.location.href = payload.data.url;
        }
      };
    } catch (error) {
      console.error('[Messaging] Error displaying notification:', error);
    }
  }

  /**
   * Check if notifications are supported in current environment
   * @returns True if notifications are supported
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * Check if notification permission has been granted
   * @returns True if permission is granted
   */
  isPermissionGranted(): boolean {
    return Notification.permission === 'granted';
  }

  /**
   * Subscribe to a topic (requires backend implementation)
   * Topics allow sending notifications to groups of users
   * @param token FCM token
   * @param topic Topic name
   * @returns Promise resolving to true if successful
   */
  async subscribeToTopic(token: string, topic: string): Promise<boolean> {
    try {
      // This requires a backend endpoint to call Firebase Admin SDK
      // POST /API/FCM/subscribe { token, topic }
      console.log(`[Messaging] Subscribe to topic: ${topic} (requires backend implementation)`);
      return true;
    } catch (error) {
      console.error('[Messaging] Error subscribing to topic:', error);
      return false;
    }
  }

  /**
   * Unsubscribe from a topic (requires backend implementation)
   * @param token FCM token
   * @param topic Topic name
   * @returns Promise resolving to true if successful
   */
  async unsubscribeFromTopic(token: string, topic: string): Promise<boolean> {
    try {
      // This requires a backend endpoint to call Firebase Admin SDK
      // POST /API/FCM/unsubscribe { token, topic }
      console.log(`[Messaging] Unsubscribe from topic: ${topic} (requires backend implementation)`);
      return true;
    } catch (error) {
      console.error('[Messaging] Error unsubscribing from topic:', error);
      return false;
    }
  }

  /**
   * Retrieve token as Observable stream
   * @returns Observable emitting token changes
   */
  getToken$(): Observable<string | null> {
    return this.token$;
  }

  /**
   * Retrieve messages as Observable stream
   * @returns Observable emitting incoming messages
   */
  getMessages$(): Observable<NotificationPayload | null> {
    return this.message$;
  }

  /**
   * Retrieve permission status as Observable stream
   * @returns Observable emitting permission changes
   */
  getPermission$(): Observable<NotificationPermission> {
    return this.permission$;
  }

  /**
   * Refresh FCM token by deleting current token and requesting new one
   * Useful when token becomes invalid or needs to be regenerated
   * @returns Promise resolving to new FCM token or null
   */
  async refreshToken(): Promise<string | null> {
    await this.deleteCurrentToken();
    return await this.requestPermission();
  }

  /**
   * Generate notification from template
   * Provides consistent notification formatting across the application
   * @param type Notification type
   * @param params Parameters for template interpolation
   * @returns Notification payload ready to be sent
   */
  generateNotification(type: NotificationType, params: any): NotificationPayload {
    const template = NOTIFICATION_TEMPLATES[type];
    return {
      title: template.titleTemplate(params),
      body: template.bodyTemplate(params),
      data: template.dataTemplate ? template.dataTemplate(params) : undefined,
      timestamp: Date.now()
    };
  }
}
