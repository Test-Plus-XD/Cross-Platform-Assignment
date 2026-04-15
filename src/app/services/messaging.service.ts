import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject, firstValueFrom } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging, type Notification as FirebaseNotification } from '@capacitor-firebase/messaging';
import { environment } from '../../environments/environment';
import { DataService } from './data.service';

// Cross-platform permission state used by both the browser Notification API and native Capacitor messaging.
export type NotificationPermissionStatus = 'prompt' | 'granted' | 'denied';

// Firebase Cloud Messaging Models

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  data?: NotificationData;
  timestamp: number;
}

export interface NotificationData {
  route?: string;
  url?: string;
  restaurantId?: string;
  bookingId?: string;
  roomId?: string;
  messageId?: string;
  type?: NotificationType;
  [key: string]: any;
}

export type NotificationType =
  | 'booking_pending'
  | 'booking_accepted'
  | 'booking_declined'
  | 'booking_completed'
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
  booking_pending: {
    type: 'booking_pending',
    titleTemplate: () => 'New Booking Request',
    bodyTemplate: (params) =>
      `${params.restaurantName} has a new booking request for ${params.dateTime}.`,
    dataTemplate: (params) => ({
      type: 'booking_pending',
      route: '/booking',
      url: 'pourrice://bookings',
      bookingId: params.bookingId
    })
  },
  booking_accepted: {
    type: 'booking_accepted',
    titleTemplate: () => 'Booking Confirmed',
    bodyTemplate: (params) =>
      `Your booking at ${params.restaurantName} on ${params.dateTime} has been confirmed.`,
    dataTemplate: (params) => ({
      type: 'booking_accepted',
      route: '/booking',
      url: 'pourrice://bookings',
      bookingId: params.bookingId
    })
  },
  booking_declined: {
    type: 'booking_declined',
    titleTemplate: () => 'Booking Declined',
    bodyTemplate: (params) =>
      `Your booking at ${params.restaurantName} on ${params.dateTime} has been declined.`,
    dataTemplate: (params) => ({
      type: 'booking_declined',
      route: '/booking',
      url: 'pourrice://bookings',
      bookingId: params.bookingId
    })
  },
  booking_completed: {
    type: 'booking_completed',
    titleTemplate: () => 'Booking Completed',
    bodyTemplate: (params) =>
      `Your booking at ${params.restaurantName} has been marked as completed.`,
    dataTemplate: (params) => ({
      type: 'booking_completed',
      route: '/booking',
      url: 'pourrice://bookings',
      bookingId: params.bookingId
    })
  },
  booking_confirmed: {
    type: 'booking_confirmed',
    titleTemplate: () => 'Booking Confirmed',
    bodyTemplate: (params) =>
      `Your reservation at ${params.restaurantName} is confirmed for ${params.dateTime}`,
    dataTemplate: (params) => ({
      type: 'booking_confirmed',
      route: '/booking',
      url: 'pourrice://bookings',
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
      route: '/booking',
      url: 'pourrice://bookings',
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
      route: '/booking',
      url: 'pourrice://bookings',
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
      route: `/restaurant/${params.restaurantId}`,
      restaurantId: params.restaurantId
    })
  },
  chat_message: {
    type: 'chat_message',
    titleTemplate: (params) => `New message from ${params.senderName}`,
    bodyTemplate: (params) => params.messagePreview,
    dataTemplate: (params) => ({
      type: 'chat_message',
      route: `/chat/${params.roomId}`,
      url: `pourrice://chat/${params.roomId}`,
      roomId: params.roomId,
      messageId: params.messageId
    })
  },
  restaurant_claimed: {
    type: 'restaurant_claimed',
    titleTemplate: () => 'Restaurant Claimed',
    bodyTemplate: (params) =>
      `You have successfully claimed ${params.restaurantName}`,
    dataTemplate: (params) => ({
      type: 'restaurant_claimed',
      route: '/store',
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

// Unified push messaging service for web and native Capacitor builds.
@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private readonly dataService = inject(DataService);
  private readonly tokenSubject = new BehaviorSubject<string | null>(this.getStoredToken());
  private readonly messageSubject = new Subject<NotificationPayload>();
  private readonly actionSubject = new Subject<NotificationPayload>();
  private readonly permissionSubject = new BehaviorSubject<NotificationPermissionStatus>('prompt');
  private readonly isNativePlatform = Capacitor.isNativePlatform();
  private hasInitialised = false;

  public token$ = this.tokenSubject.asObservable();
  public message$ = this.messageSubject.asObservable();
  public action$ = this.actionSubject.asObservable();
  public permission$ = this.permissionSubject.asObservable();

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {
    void this.initialiseMessaging();
  }

  // Initialise the shared messaging listeners and current permission state.
  private async initialiseMessaging(): Promise<void> {
    if (this.hasInitialised) return;

    try {
      const supported = await this.isSupported();
      if (!supported) {
        console.warn('MessagingService Messaging is not supported in this environment');
        return;
      }

      this.hasInitialised = true;
      this.permissionSubject.next(await this.checkPermission());

      await FirebaseMessaging.addListener('notificationReceived', (event) => {
        const notificationPayload = this.createPayloadFromFirebaseNotification(event.notification);
        this.messageSubject.next(notificationPayload);
      });

      if (this.isNativePlatform) {
        await FirebaseMessaging.addListener('tokenReceived', (event) => {
          this.persistToken(event.token);
        });

        await FirebaseMessaging.addListener('notificationActionPerformed', (event) => {
          const notificationPayload = this.createPayloadFromFirebaseNotification(event.notification);
          this.actionSubject.next(notificationPayload);
        });
      }

      console.log('MessagingService Messaging service initialised successfully');
    } catch (error) {
      console.error('MessagingService Initialisation error:', error);
    }
  }

  // Request notification permission and obtain an FCM token if the user allows notifications.
  async requestPermission(): Promise<string | null> {
    try {
      await this.initialiseMessaging();

      const result = await FirebaseMessaging.requestPermissions();
      const permission = this.normalisePermissionState(result.receive);
      this.permissionSubject.next(permission);
      console.log('MessagingService Notification permission result:', permission);

      if (permission !== 'granted') {
        console.warn('MessagingService Notification permission denied');
        return null;
      }

      return await this.obtainToken();
    } catch (error) {
      console.error('MessagingService Error requesting permission:', error);
      return null;
    }
  }

  // Retrieve the current permission state without prompting the user.
  async checkPermission(): Promise<NotificationPermissionStatus> {
    try {
      const result = await FirebaseMessaging.checkPermissions();
      return this.normalisePermissionState(result.receive);
    } catch (error) {
      console.error('MessagingService Error checking permission:', error);
      return 'denied';
    }
  }

  // Re-read a token when permission has already been granted, without showing a permission prompt.
  async syncTokenIfPermitted(): Promise<string | null> {
    try {
      await this.initialiseMessaging();

      const permission = await this.checkPermission();
      this.permissionSubject.next(permission);

      if (permission !== 'granted') {
        return null;
      }

      return await this.obtainToken();
    } catch (error) {
      console.error('MessagingService Error syncing token:', error);
      return null;
    }
  }

  // Obtain an FCM token for the current platform.
  private async obtainToken(): Promise<string | null> {
    try {
      const tokenResult = await FirebaseMessaging.getToken(
        this.isNativePlatform ? {} : await this.getWebTokenOptions()
      );
      const token = tokenResult.token?.trim();

      if (!token) {
        console.warn('MessagingService No registration token available');
        return null;
      }

      this.persistToken(token);
      console.log('MessagingService Token obtained:', token.substring(0, 20) + '...');
      return token;
    } catch (error) {
      console.error('MessagingService Error obtaining token:', error);
      return null;
    }
  }

  // Build the explicit service worker registration required by FCM on the web.
  private async getWebTokenOptions(): Promise<{ vapidKey?: string; serviceWorkerRegistration?: ServiceWorkerRegistration }> {
    if (this.isNativePlatform) {
      return {};
    }

    const options: { vapidKey?: string; serviceWorkerRegistration?: ServiceWorkerRegistration } = {};

    if (environment.fcmVapidKey) {
      options.vapidKey = environment.fcmVapidKey;
    }

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        options.serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('MessagingService Firebase SW registered:', options.serviceWorkerRegistration.scope);
      } catch (error) {
        console.warn('MessagingService Failed to register Firebase SW:', error);
      }
    }

    return options;
  }

  // Persist the current token locally so auth restoration can re-register it later.
  private persistToken(token: string): void {
    this.tokenSubject.next(token);
    localStorage.setItem('fcmToken', token);
  }

  // Retrieve the token from memory or durable storage.
  getCurrentToken(): string | null {
    return this.tokenSubject.value || this.getStoredToken();
  }

  // Read the last stored token from local storage.
  private getStoredToken(): string | null {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage.getItem('fcmToken');
    } catch {
      return null;
    }
  }

  // Retrieve the last known permission state synchronously.
  getCurrentPermission(): NotificationPermissionStatus {
    return this.permissionSubject.value;
  }

  // Delete the current token locally and optionally remove it from the backend first.
  async deleteCurrentToken(authToken?: string): Promise<boolean> {
    try {
      const currentToken = this.getCurrentToken();

      if (currentToken && authToken) {
        await this.removeTokenFromBackend(currentToken, authToken);
      }

      await FirebaseMessaging.deleteToken();
      this.tokenSubject.next(null);
      localStorage.removeItem('fcmToken');

      console.log('MessagingService Token deleted successfully');
      return true;
    } catch (error) {
      console.error('MessagingService Error deleting token:', error);
      return false;
    }
  }

  // Register the current device token with the backend for server-side push delivery.
  async registerTokenWithBackend(fcmToken: string, authToken: string): Promise<void> {
    try {
      await firstValueFrom(
        this.dataService.post<void>('/API/Messaging/register-token', { token: fcmToken }, authToken)
      );
      console.log('MessagingService Token registered with backend');
    } catch (error) {
      console.error('MessagingService Failed to register token with backend:', error);
    }
  }

  // Remove the current device token from the backend using the documented query parameter form.
  async removeTokenFromBackend(fcmToken: string, authToken: string): Promise<void> {
    try {
      const encodedToken = encodeURIComponent(fcmToken);
      await firstValueFrom(
        this.dataService.delete<void>(`/API/Messaging/register-token?token=${encodedToken}`, authToken)
      );
      console.log('MessagingService Token removed from backend');
    } catch (error) {
      console.error('MessagingService Failed to remove token from backend:', error);
    }
  }

  // Convert a raw plugin notification into the shared application payload.
  private createPayloadFromFirebaseNotification(notification: FirebaseNotification): NotificationPayload {
    return {
      title: notification.title || 'New Notification',
      body: notification.body || '',
      icon: notification.image,
      data: this.normaliseNotificationData(notification.data),
      timestamp: Date.now()
    };
  }

  // Normalise unknown notification data into a plain record the app can route with.
  private normaliseNotificationData(data: unknown): NotificationData | undefined {
    if (!data || typeof data !== 'object') {
      return undefined;
    }

    const notificationData = { ...(data as Record<string, unknown>) } as NotificationData;
    const resolvedRoute = this.resolveRoute(notificationData);

    if (resolvedRoute) {
      notificationData.route = resolvedRoute;
    }

    return notificationData;
  }

  // Resolve a preferred app route using the new contract first and the legacy URL fallback second.
  resolveRoute(data?: NotificationData | null): string | null {
    if (!data) {
      return null;
    }

    if (typeof data.route === 'string' && data.route.trim()) {
      return data.route.trim();
    }

    if (typeof data.url === 'string' && data.url.trim()) {
      return this.convertLegacyUrlToRoute(data.url.trim());
    }

    return null;
  }

  // Convert the legacy notification URL contract into an Angular route.
  private convertLegacyUrlToRoute(url: string): string | null {
    if (!url) {
      return null;
    }

    if (url.startsWith('/')) {
      return url;
    }

    if (url.startsWith('pourrice://')) {
      try {
        const parsed = new URL(url);
        const slug = parsed.pathname.replace(/^\/+/, '');
        const host = parsed.hostname.toLowerCase();

        if (host === 'bookings') {
          return '/booking';
        }

        if (host === 'chat') {
          return `/chat${slug ? '/' + slug : ''}`;
        }

        if (host === 'menu' && slug) {
          return `/restaurant/${slug}`;
        }
      } catch (error) {
        console.warn('MessagingService Failed to parse legacy notification URL:', error);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        const resolvedUrl = new URL(url, window.location.origin);
        if (resolvedUrl.origin === window.location.origin) {
          return `${resolvedUrl.pathname}${resolvedUrl.search}${resolvedUrl.hash}`;
        }
      } catch (error) {
        console.warn('MessagingService Failed to resolve notification URL:', error);
      }
    }

    return null;
  }

  // Check whether notifications are supported on the current platform.
  async isSupported(): Promise<boolean> {
    try {
      const result = await FirebaseMessaging.isSupported();
      return result.isSupported;
    } catch (error) {
      console.error('MessagingService Error checking support:', error);
      return false;
    }
  }

  // Check if notification permission has already been granted.
  async isPermissionGranted(): Promise<boolean> {
    return (await this.checkPermission()) === 'granted';
  }

  // Subscribe an FCM token to a backend topic group.
  async subscribeToTopic(token: string, topic: string, authToken: string): Promise<boolean> {
    try {
      await firstValueFrom(
        this.dataService.post<void>('/API/Messaging/subscribe', { token, topic }, authToken)
      );
      console.log(`MessagingService Subscribed to topic: ${topic}`);
      return true;
    } catch (error) {
      console.error('MessagingService Error subscribing to topic:', error);
      return false;
    }
  }

  // Unsubscribe an FCM token from a backend topic group.
  async unsubscribeFromTopic(token: string, topic: string, authToken: string): Promise<boolean> {
    try {
      await firstValueFrom(
        this.dataService.post<void>('/API/Messaging/unsubscribe', { token, topic }, authToken)
      );
      console.log(`MessagingService Unsubscribed from topic: ${topic}`);
      return true;
    } catch (error) {
      console.error('MessagingService Error unsubscribing from topic:', error);
      return false;
    }
  }

  // Retrieve token changes as an observable stream.
  getToken$(): Observable<string | null> {
    return this.token$;
  }

  // Retrieve foreground notification events as an observable stream.
  getMessages$(): Observable<NotificationPayload> {
    return this.message$;
  }

  // Retrieve notification tap events as an observable stream.
  getActions$(): Observable<NotificationPayload> {
    return this.action$;
  }

  // Retrieve permission state changes as an observable stream.
  getPermission$(): Observable<NotificationPermissionStatus> {
    return this.permission$;
  }

  // Refresh the current token by deleting it and reading it again if permission remains granted.
  async refreshToken(authToken?: string): Promise<string | null> {
    await this.deleteCurrentToken(authToken);
    return await this.syncTokenIfPermitted();
  }

  // Generate a typed notification payload from a template.
  generateNotification(type: NotificationType, params: any): NotificationPayload {
    const template = NOTIFICATION_TEMPLATES[type];
    return {
      title: template.titleTemplate(params),
      body: template.bodyTemplate(params),
      data: template.dataTemplate ? template.dataTemplate(params) : undefined,
      timestamp: Date.now()
    };
  }

  // Convert plugin permission states into the app-level permission union.
  private normalisePermissionState(permission: string): NotificationPermissionStatus {
    if (permission === 'granted') {
      return 'granted';
    }

    if (permission === 'denied') {
      return 'denied';
    }

    return 'prompt';
  }
}
