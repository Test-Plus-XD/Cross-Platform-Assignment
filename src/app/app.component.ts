import { Component, OnInit, OnDestroy, inject, NgZone } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AlertController, LoadingController, ModalController, ToastController } from '@ionic/angular';
import { distinctUntilChanged, filter, map, take, takeUntil } from 'rxjs/operators';
import { Subject, combineLatest } from 'rxjs';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { App as CapacitorApp, URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { environment } from '../environments/environment';
import { ThemeService } from './services/theme.service';
import { LayoutService } from './services/layout.service';
import { LanguageService } from './services/language.service';
import { PlatformService } from './services/platform.service';
import { UIService } from './services/UI.service';
import { AppStateService } from './services/app-state.service';
import { MessagingService, NotificationPayload } from './services/messaging.service';
import { NotificationCoordinatorService } from './services/notification-coordinator.service';
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
    readonly notificationCoordinator = inject(NotificationCoordinatorService);
    private readonly userService = inject(UserService);
    private readonly modalController = inject(ModalController);
    private readonly loadingController = inject(LoadingController);
    private readonly toastController = inject(ToastController);
    private alertController = inject(AlertController);
    private ngZone = inject(NgZone);

    // Cleanup subject
    private destroy$ = new Subject<void>();

    // Deep link listener handle for cleanup
    private appUrlOpenListener?: PluginListenerHandle;

    // Account setup presentation state is UID-scoped because Android cold starts can restore stale profile cache first.
    private activeAccountTypeUid: string | null = null;
    private isAccountTypeModalOpen = false;
    private isAccountTypePresentationQueued = false;
    private isProfileFetchInFlight = false;
    private profileFetchRetryTimer: ReturnType<typeof setTimeout> | null = null;

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
          const titleData = current.snapshot.data['title'] ?? { Header_EN: '', Header_TC: '' };
          window.dispatchEvent(new CustomEvent('page-title', {
            detail: titleData,
            bubbles: true,
          }));

          // Reset any contextual share action on every route change.
          window.dispatchEvent(new CustomEvent('page-share', {
            detail: { isVisible: false },
            bubbles: true,
          }));

          // Keep users on Account page until account type setup is completed.
          if (this.mustCompleteAccountTypeSetup() && !this.router.url.startsWith('/user')) {
            void this.router.navigate(['/user'], { replaceUrl: true });
          }
        });
    }

    ngOnInit(): void {
      // AppStateService now handles state management automatically

      // Initialise native Google Sign-In on Capacitor platforms
      if (Capacitor.isNativePlatform()) {
        SocialLogin.initialize({
          google: { webClientId: environment.googleClientId }
        }).catch(err => console.error('[AppComponent] SocialLogin init error:', err));
      }

      // Set up deep link listener for native platforms (QR codes, notification taps, etc.)
      void this.setupDeepLinkListener();

      this.notificationCoordinator.start();

      // Show notification permission prompt if not yet granted
      void this.promptNotificationPermission();
      this.subscribeToInAppMessages();
      this.subscribeToNotificationActions();
      this.syncProfilePreferences();

      // Watch for logged-in users whose profile has no type set.
      // When detected, present the account-type selector modal once per session.
      this.watchForMissingUserType();
    }

    // Keep the live app language and saved theme aligned with the authenticated user's preferences.
    private syncProfilePreferences(): void {
      combineLatest([
        this.appState.appState$,
        this.userService.currentProfile$
      ]).pipe(
        map(([state, profile]) => {
          if (!state.isLoggedIn || !state.uid || !profile?.preferences) {
            return null;
          }

          return {
            language: profile.preferences.language ?? null,
            theme: profile.preferences.theme ?? null
          };
        }),
        distinctUntilChanged((previousPreferences, nextPreferences) =>
          previousPreferences?.language === nextPreferences?.language &&
          previousPreferences?.theme === nextPreferences?.theme
        ),
        takeUntil(this.destroy$)
      ).subscribe((preferences) => {
        if (!preferences) {
          return;
        }

        if (preferences.language) {
          this.language.setLang(preferences.language);
        }

        if (preferences.theme) {
          this.theme.setSavedTheme(preferences.theme === 'dark');
        }
      });
    }

    private async setupDeepLinkListener(): Promise<void> {
      if (!Capacitor.isNativePlatform()) return;

      // Handle cold-start deep links (app was killed, opened via deep link)
      const launch = await CapacitorApp.getLaunchUrl();
      if (launch?.url) {
        this.handleIncomingUrl(launch.url);
      }

      // Handle live deep links (app is already running)
      this.appUrlOpenListener = await CapacitorApp.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
        this.handleIncomingUrl(event.url);
      });
    }

    private handleIncomingUrl(url: string): void {
      this.ngZone.run(() => {
        console.log('[AppComponent] Deep link received');

        try {
          // Handle pourrice:// deep links (QR codes, notification taps)
          if (url.startsWith('pourrice://')) {
            const parsed = new URL(url);
            const host = parsed.hostname.toLowerCase();
            const slug = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));

            // Route menu QR deep links into the restaurant page and ask it to open the full menu modal.
            if (host === 'menu' && slug) {
              this.router.navigateByUrl(`/restaurant/${encodeURIComponent(slug)}?menu=open`);
              return;
            }

            // pourrice://bookings → /booking
            if (host === 'bookings') {
              this.router.navigateByUrl('/booking');
              return;
            }

            // pourrice://chat/{roomId} → /chat/{roomId}
            if (host === 'chat') {
              this.router.navigateByUrl(`/chat${slug ? '/' + slug : ''}`);
              return;
            }

            // pourrice://store?payment_success=true&session_id=... → /store with query params
            if (host === 'store') {
              const paymentSuccess = parsed.searchParams.get('payment_success');
              const sessionId = parsed.searchParams.get('session_id');
              const query = paymentSuccess === 'true' && sessionId
                ? `?payment_success=true&session_id=${encodeURIComponent(sessionId)}`
                : '';
              void Browser.close().catch(() => {
                // noop: browser may already be closed
              });
              this.router.navigateByUrl(`/store${query}`);
              return;
            }

            // Unsupported deep-link type
            void this.presentDeepLinkError();
            return;
          }

        } catch (err) {
          console.error('[AppComponent] Error processing deep link:', err);
          void this.presentDeepLinkError();
        }
      });
    }

    private subscribeToInAppMessages(): void {
      this.notificationCoordinator.displayNotifications$.pipe(
        takeUntil(this.destroy$)
      ).subscribe(payload => {
        this.presentInAppMessage(payload).catch((error) => {
          console.error('[AppComponent] Failed to show in-app notification toast:', error);
        });
      });
    }

    private subscribeToNotificationActions(): void {
      this.notificationCoordinator.notificationActions$.pipe(
        takeUntil(this.destroy$)
      ).subscribe(payload => {
        this.navigateFromNotification(payload).catch((error) => {
          console.error('[AppComponent] Failed to route notification action:', error);
        });
      });
    }

    private async presentInAppMessage(payload: NotificationPayload): Promise<void> {
      const route = this.messagingService.resolveRoute(payload.data);
      const buttonText = this.language.getCurrentLanguage() === 'TC' ? '查看' : 'View';
      const buttons = route
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

      if (result.role === 'open') {
        await this.navigateFromNotification(payload);
      }
    }

    private async promptNotificationPermission(): Promise<void> {
      try {
        if (!(await this.messagingService.isSupported())) return;

        const permission = await this.messagingService.checkPermission();

        if (permission === 'granted') {
          await this.messagingService.syncTokenIfPermitted();
          return;
        }

        // Don't show on every visit — check if user dismissed our prompt before
        const dismissed = localStorage.getItem('fcmPromptDismissed');
        if (dismissed && permission === 'denied') return;

        const isTC = this.language.getCurrentLanguage() === 'TC';
        const isNativePlatform = Capacitor.isNativePlatform();

        if (permission === 'prompt') {
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
                  void this.notificationCoordinator.requestPermissionAndSync().catch((error) => {
                    console.error('[AppComponent] Permission request error:', error);
                  });
                }
              }
            ]
          });
          await alert.present();
        } else if (permission === 'denied') {
          // Previously denied — guide the user to the appropriate browser or system settings.
          const alert = await this.alertController.create({
            header: isTC ? '通知已被封鎖' : 'Notifications Blocked',
            message: isTC
              ? (isNativePlatform
                ? '系統設定已封鎖通知。請前往裝置設定，將 PourRice 的通知重新啟用。'
                : '通知已在瀏覽器中被封鎖。如要啟用，請點擊網址列旁的鎖定圖示，將「通知」改為「允許」，然後重新載入頁面。')
              : (isNativePlatform
                ? 'Notifications are blocked in system settings. Re-enable them for PourRice in your device settings.'
                : 'Notifications are blocked in your browser. To enable them, click the lock or tune icon next to the URL bar, change Notifications to Allow, then reload the page.'),
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

    private async navigateFromNotification(payload: NotificationPayload): Promise<void> {
      const route = this.messagingService.resolveRoute(payload.data);
      if (!route) return;

      await this.router.navigateByUrl(route);
    }

    // Watch auth state + user profile; present the account-type modal whenever the active profile has no type.
    // Android can restore auth before the profile request/create flow settles, so missing profiles are retried.
    private watchForMissingUserType(): void {
      combineLatest([
        this.appState.appState$,
        this.userService.currentProfile$
      ]).pipe(
        takeUntil(this.destroy$)
      ).subscribe(([state, profile]) => {
        if (!state.isLoggedIn || !state.uid) {
          this.resetAccountTypeSetupState();
          return;
        }

        if (this.activeAccountTypeUid !== state.uid) {
          this.resetAccountTypeSetupState(state.uid);
        }

        if (!profile || profile.uid !== state.uid) {
          this.loadProfileForAccountTypeSetup(state.uid);
          return;
        }

        this.clearProfileFetchRetry();
        if (profile.type) return;

        this.queueAccountTypeModalPresentation(state.uid);
      });
    }

    // Fetches the active profile and retries when auth has completed before the backend profile exists.
    private loadProfileForAccountTypeSetup(uid: string): void {
      if (this.isProfileFetchInFlight) return;

      this.isProfileFetchInFlight = true;
      this.userService.getUserProfile(uid).pipe(
        take(1),
        takeUntil(this.destroy$)
      ).subscribe({
        next: (profile) => {
          this.isProfileFetchInFlight = false;
          if (!profile && this.appState.appState.uid === uid) this.scheduleProfileFetchRetry(uid);
        },
        error: (error) => {
          console.error('[AppComponent] Failed to load profile for account setup:', error);
          this.isProfileFetchInFlight = false;
          this.scheduleProfileFetchRetry(uid);
        }
      });
    }

    // Schedules a lightweight retry so a newly created Firebase user is not missed before the API profile appears.
    private scheduleProfileFetchRetry(uid: string): void {
      if (this.profileFetchRetryTimer) return;

      this.profileFetchRetryTimer = setTimeout(() => {
        this.profileFetchRetryTimer = null;
        if (this.appState.appState.uid === uid) this.loadProfileForAccountTypeSetup(uid);
      }, 900);
    }

    // Clears the queued profile retry timer.
    private clearProfileFetchRetry(): void {
      if (!this.profileFetchRetryTimer) return;

      clearTimeout(this.profileFetchRetryTimer);
      this.profileFetchRetryTimer = null;
    }

    // Queues modal presentation once so repeated profile/router emissions cannot stack duplicate Ionic overlays.
    private queueAccountTypeModalPresentation(uid: string): void {
      if (this.isAccountTypeModalOpen || this.isAccountTypePresentationQueued) return;

      this.isAccountTypePresentationQueued = true;
      void this.presentAccountTypeModal(uid);
    }

    // Present the AccountTypeSelectorComponent as a centred, non-dismissable modal.
    private async presentAccountTypeModal(uid: string): Promise<void> {
      this.isAccountTypeModalOpen = true;
      try {
        await this.router.navigate(['/user'], { replaceUrl: true });
        await this.waitForAccountTypeOverlayWindow();

        const activeProfile = this.userService.currentProfile;
        if (this.appState.appState.uid !== uid || !activeProfile || activeProfile.uid !== uid || activeProfile.type) return;

        const modal = await this.modalController.create({
          component: AccountTypeSelectorComponent,
          // Prevent escape dismissals, but allow the setup component to close itself after a successful save.
          canDismiss: async (_data?: unknown, role?: string): Promise<boolean> => role === 'confirm',
          backdropDismiss: false,
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
      } finally {
        this.isAccountTypeModalOpen = false;
        this.isAccountTypePresentationQueued = false;
        this.recheckAccountTypeSetup(uid);
      }
    }

    // Gives login loading overlays and notification alerts time to leave before Android presents the setup modal.
    private async waitForAccountTypeOverlayWindow(): Promise<void> {
      const activeAlert = await this.alertController.getTop();
      if (activeAlert) {
        await activeAlert.dismiss(undefined, 'account-type-setup').catch(() => undefined);
      }

      for (let attempt = 0; attempt < 25; attempt++) {
        const activeLoading = await this.loadingController.getTop();
        if (!activeLoading) break;
        await this.delay(100);
      }

      await this.delay(Capacitor.isNativePlatform() ? 250 : 50);
    }

    // Re-checks after dismissal so an unexpected overlay failure cannot permanently skip mandatory setup.
    private recheckAccountTypeSetup(uid: string): void {
      setTimeout(() => {
        if (this.appState.appState.uid !== uid) return;

        const profile = this.userService.currentProfile;
        if (!profile || profile.uid !== uid) {
          this.loadProfileForAccountTypeSetup(uid);
          return;
        }

        if (!profile.type) this.queueAccountTypeModalPresentation(uid);
      }, 300);
    }

    // Resets account setup modal and profile retry state, optionally starting a new UID scope.
    private resetAccountTypeSetupState(nextUid: string | null = null): void {
      this.activeAccountTypeUid = nextUid;
      this.isAccountTypeModalOpen = false;
      this.isAccountTypePresentationQueued = false;
      this.isProfileFetchInFlight = false;
      this.clearProfileFetchRetry();
    }

    // Small promise-based delay helper used to let Android WebView settle between overlay transitions.
    private delay(milliseconds: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, milliseconds));
    }

    private mustCompleteAccountTypeSetup(): boolean {
      const state = this.appState.appState;
      if (!state.isLoggedIn || !state.uid) return false;

      const profile = this.userService.currentProfile;
      return !!profile && profile.uid === state.uid && !profile.type;
    }

    private async presentDeepLinkError(): Promise<void> {
      const isTc = this.language.getCurrentLanguage() === 'TC';
      const toast = await this.toastController.create({
        message: isTc ? '連結無效或已過期。' : 'This link is invalid or expired.',
        duration: 2500,
        position: 'top',
      });
      await toast.present();
    }

    ngOnDestroy(): void {
      void this.appUrlOpenListener?.remove();
      this.clearProfileFetchRetry();
      this.destroy$.next();
      this.destroy$.complete();
    }
}
