import { Component, ViewChild, OnInit, OnDestroy, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { HeaderComponent } from './shared/header/header.component';
import { ThemeService } from './services/theme.service';
import { LayoutService } from './services/layout.service';
import { LanguageService } from './services/language.service';
import { PlatformService } from './services/platform.service';
import { UIService } from './services/UI.service';
import { AppStateService } from './services/app-state.service';
import { MessagingService } from './services/messaging.service';

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
    private alertController = inject(AlertController);

    @ViewChild(HeaderComponent) header!: HeaderComponent;

    // Cleanup subject
    private destroy$ = new Subject<void>();

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

      // Show notification permission prompt if not yet granted
      this.promptNotificationPermission();
    }

    private async promptNotificationPermission(): Promise<void> {
      try {
        if (!this.messagingService?.isSupported()) return;

        const permission = Notification.permission;

        if (permission === 'granted') {
          // Already granted — silently obtain token
          this.messagingService.requestPermission().catch(err => {
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
                      // Permission granted — now obtain FCM token via service
                      this.messagingService.requestPermission().then(token => {
                        if (token) {
                          console.log('[AppComponent] FCM token obtained.');
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

    ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
    }
}
