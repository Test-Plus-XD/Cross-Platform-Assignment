import { Component, ViewChild, OnInit, OnDestroy, inject, NgZone } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { Auth, getIdToken } from '@angular/fire/auth';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp, URLOpenListenerEvent } from '@capacitor/app';
import { HeaderComponent } from './shared/header/header.component';
import { ThemeService } from './services/theme.service';
import { LayoutService } from './services/layout.service';
import { LanguageService } from './services/language.service';
import { PlatformService } from './services/platform.service';
import { UIService } from './services/UI.service';
import { AppStateService } from './services/app-state.service';
import { MessagingService, NotificationPayload } from './services/messaging.service';
import { UserService } from './services/user.service';
import { AccountTypeSelectorComponent } from './shared/account-type-selector/account-type-selector.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
    readonly theme = inject(ThemeService);
    readonly layout = inject(LayoutService);
    readonly language = inject(LanguageService);
    readonly platform = inject(PlatformService);
    readonly UI = inject(UIService);
    readonly appState = inject(AppStateService);
    readonly router = inject(Router);
    readonly messagingService = inject(MessagingService);
    private readonly userService = inject(UserService);
    private readonly auth = inject(Auth);
    private readonly modalController = inject(ModalController);
    private readonly toastController = inject(ToastController);
    private alertController = inject(AlertController);
    private ngZone = inject(NgZone);

    @ViewChild(HeaderComponent) header!: HeaderComponent;

    // Cleanup subject
    private destroy$ = new Subject<void>();

    // Guard: prevent presenting the account-type modal more than once per session
    private hasShownTypeSelector = false;

    /** Inserted by Angular inject() migration for backwards compatibility */
    constructor(...args: unknown[]);

    constructor() {
        // Ensure the initial theme is applied right away.
        // This re-applies whatever ThemeService computed in getInitialTheme().
        // (ThemeService's setTheme will also write to localStorage.)
        this.theme.init();
        this.language.init();
        this.platform.init();
        this.UI.init();

        // Listen to router events
      this.router.events
        .pipe(
          filter((event): event is NavigationEnd => event instanceof NavigationEnd),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          // Find the currently active child route
          let current = this.router.routerState.root;
          while (current.firstChild) {
            current = current.firstChild;
          }

          // Read the 'title' data field if it exists
          const titleData = current.snapshot.data['title'];
          if (titleData && this.header) {
            this.header.emitPageTitle(titleData);
          }
        });
    }

    ngOnInit(): void {
      // AppStateService now handles state management automatically

      // Set up deep link listener for native platforms (OAuth redirects, QR codes, etc.)
      this.setupDeepLinkListener();

      // Show notification permission prompt if not yet granted
      this.promptNotificationPermission();
      this.subscribeToInAppMessages();

      // Watch for logged-in users whose profile has no type set.
      // When detected, present the account-type selector modal once per session.
      this.watchForMissingUserType();
    }

    private setupDeepLinkListener(): void {
      if (!Capacitor.isNativePlatform()) return;

      CapacitorApp.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
        this.ngZone.run(() => {
          const url = event.url;
          console.log('[AppComponent] Deep link received:', url);

          try {
            // Handle pourrice:// deep links (QR codes, notification taps)
            if (url.startsWith('pourrice://')) {
              const parsed = new URL(url);
              const path = parsed.hostname + parsed.pathname;
              if (path) {
                this.router.navigateByUrl('/' + path);
              }
              return;
            }

            // Handle com.example.app:// scheme (OAuth redirect callback)
            // Firebase Auth processes the redirect internally via getRedirectResult()
            // in AuthService — no manual navigation needed here.
            if (url.startsWith('com.example.app://')) {
              console.log('[AppComponent] OAuth redirect callback received');
              return;
            }
          } catch (err) {
            console.error('[AppComponent] Error processing deep link:', err);
          }
        });
      });
    }

    private subscribeToInAppMessages(): void {
      this.messagingService.getMessages$().pipe(
        filter((payload): payload is NotificationPayload => payload !== null),
        takeUntil(this.destroy$)
      ).subscribe(payload => {
        this.presentInAppMessage(payload).catch((error) => {
          console.error('[AppComponent] Failed to show in-app notification toast:', error);
        });
      });
    }

    private async presentInAppMessage(payload: NotificationPayload): Promise<void> {
      const buttonText = this.language.getCurrentLanguage() === 'TC' ? '查看' : 'View';
      const buttons = payload.data?.url
        ? [{ text: buttonText, role: 'open' }]
        : [];

      const toast = await this.toastController.create({
        header: payload.title,
        message: payload.body,
        duration: 5000,
        position: 'top',
        buttons
      });

      await toast.present();
      const result = await toast.onDidDismiss();

      if (result.role === 'open' && payload.data?.url) {
        await this.router.navigateByUrl(payload.data.url);
      }
    }

    private async promptNotificationPermission(): Promise<void> {
      try {
        if (!this.messagingService?.isSupported()) return;

        const permission = Notification.permission;

        if (permission === 'granted') {
          // Already granted — silently obtain token and register with backend
          this.messagingService.requestPermission().then(async token => {
            if (token && this.auth.currentUser) {
              try {
                const idToken = await getIdToken(this.auth.currentUser);
                await this.messagingService.registerTokenWithBackend(token, idToken);
              } catch (err) {
                console.error('[AppComponent] Failed to register FCM token with backend:', err);
              }
            }
          }).catch(err => {
            console.error('[AppComponent] FCM token error (auto):', err);
          });
          return;
        }

        // Don't show on every visit — check if user dismissed our prompt before
        const dismissed = localStorage.getItem('fcmPromptDismissed');
        if (dismissed && permission === 'denied') return;

        const isTC = this.language.getCurrentLanguage() === 'TC';

        if (permission === 'default') {
          // Never asked — show custom prompt before triggering the browser popup
          const alert = await this.alertController.create({
            header: isTC ? '啟用通知' : 'Enable Notifications',
            message: isTC
              ? '接收預訂確認、新訊息和餐廳更新的推送通知。'
              : 'Receive push notifications for booking confirmations, new messages, and restaurant updates.',
            buttons: [
              {
                text: isTC ? '稍後再說' : 'Not Now',
                role: 'cancel',
                handler: () => {
                  localStorage.setItem('fcmPromptDismissed', 'true');
                }
              },
              {
                text: isTC ? '允許' : 'Allow',
                handler: () => {
                  // Call Notification.requestPermission() DIRECTLY in the click
                  // handler to preserve the transient user activation. Routing
                  // through the async service method first can lose the gesture
                  // context due to Ionic's overlay dismiss processing, causing
                  // the browser to silently skip the native permission popup.
                  Notification.requestPermission().then(permission => {
                    console.log('[AppComponent] Browser permission result:', permission);
                    if (permission === 'granted') {
                      // Permission granted — obtain FCM token and register with backend
                      this.messagingService.requestPermission().then(async token => {
                        if (token) {
                          console.log('[AppComponent] FCM token obtained.');
                          if (this.auth.currentUser) {
                            try {
                              const idToken = await getIdToken(this.auth.currentUser);
                              await this.messagingService.registerTokenWithBackend(token, idToken);
                            } catch (err) {
                              console.error('[AppComponent] Failed to register FCM token with backend:', err);
                            }
                          }
                        } else {
                          console.warn('[AppComponent] Permission granted but no FCM token returned.');
                        }
                      }).catch(err => console.error('[AppComponent] FCM token error:', err));
                    } else {
                      console.warn('[AppComponent] Notification permission not granted:', permission);
                    }
                  }).catch(err => console.error('[AppComponent] Permission request error:', err));
                }
              }
            ]
          });
          await alert.present();
        } else if (permission === 'denied') {
          // Previously denied in browser — guide user to reset
          const alert = await this.alertController.create({
            header: isTC ? '通知已被封鎖' : 'Notifications Blocked',
            message: isTC
              ? '通知已在瀏覽器中被封鎖。如要啟用，請點擊網址列旁的鎖定圖示，將「通知」改為「允許」，然後重新載入頁面。'
              : 'Notifications are blocked in your browser. To enable them, click the lock/tune icon next to the URL bar, change "Notifications" to "Allow", then reload the page.',
            buttons: [
              {
                text: isTC ? '知道了' : 'Got It',
                handler: () => {
                  localStorage.setItem('fcmPromptDismissed', 'true');
                }
              }
            ]
          });
          await alert.present();
        }
      } catch (err) {
        console.error('[AppComponent] Notification prompt error:', err);
      }
    }

    // Watch auth state + user profile; present the account-type modal when a
    // logged-in user has no type field.  The guard flag prevents re-presentation
    // on each navigation (appState$ emits on every route change).
    private watchForMissingUserType(): void {
      this.appState.appState$.pipe(
        takeUntil(this.destroy$)
      ).subscribe(state => {
        if (!state.isLoggedIn || !state.uid) return;

        // Read the cached profile synchronously; if type is already set, skip
        const profile = this.userService.currentProfile;
        if (profile?.type) return;

        // Subscribe to the profile observable for one emission to check type
        this.userService.currentProfile$.pipe(
          takeUntil(this.destroy$)
        ).subscribe(async userProfile => {
          // Only act if logged in and profile has no type
          if (!userProfile || userProfile.type) return;
          if (this.hasShownTypeSelector) return;

          this.hasShownTypeSelector = true;
          await this.presentAccountTypeModal();
        });
      });
    }

    // Present the AccountTypeSelectorComponent as a non-dismissable bottom sheet
    private async presentAccountTypeModal(): Promise<void> {
      try {
        const modal = await this.modalController.create({
          component: AccountTypeSelectorComponent,
          // Prevent swipe-to-dismiss — user must complete the selection
          canDismiss: false,
          breakpoints: [0, 0.6, 1],
          initialBreakpoint: 0.6,
          cssClass: 'account-type-modal',
        });
        await modal.present();

        // After the user confirms, reload their profile so tabs update
        const { data } = await modal.onWillDismiss();
        if (data?.type) {
          console.log('[AppComponent] Account type selected:', data.type);
          // Re-fetch profile so navigation guards and tabs reflect the new type
          const uid = this.appState.appState.uid;
          if (uid) {
            this.userService.getUserProfile(uid).pipe(takeUntil(this.destroy$)).subscribe();
          }
        }
      } catch (err) {
        console.error('[AppComponent] Error presenting account type modal:', err);
      }
    }

    ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
    }
}
