// Shared header component that exposes language, theme, back navigation, and contextual page actions.
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Share } from '@capacitor/share';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';
import { PlatformService } from '../../services/platform.service';
import { UIService } from '../../services/UI.service';
import { UserService } from '../../services/user.service';
import { AppStateService } from '../../services/app-state.service';

interface PageTitle {
  Header_EN: string;
  Header_TC: string;
}

interface PageShareDetail {
  isVisible: boolean;
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

@Component({
  selector: 'app-shared-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: false,
})
export class HeaderComponent implements OnInit, OnDestroy {
  readonly lang = inject(LanguageService);
  readonly theme = inject(ThemeService);
  readonly platform = inject(PlatformService);
  readonly UI = inject(UIService);
  private readonly toastController = inject(ToastController);
  private location = inject(Location);
  private router = inject(Router);

  // Observable boolean that is true when running on mobile
  isMobile$: Observable<boolean>;
  // Observable boolean for whether to show menu
  showHeaderMenu$: Observable<boolean>;
  // Expose observable stream for current language (EN or TC)
  lang$ = this.lang.lang$;
  // Expose observable stream for dark mode flag
  isDark$ = this.theme.isDark$;
  // Expose brand icon path which reacts to theme changes
  brandIcon$ = this.isDark$.pipe(map(d => d ? 'assets/icon/App-Dark.png?theme=dark' : 'assets/icon/App-Light.png?theme=light'));
  // Subject that holds the latest page titles
  private pageTitleSubject = new BehaviorSubject<PageTitle>({ Header_EN: '', Header_TC: '' });
  // Subject that holds the latest contextual share payload for the active page.
  private pageShareSubject = new BehaviorSubject<PageShareDetail>({ isVisible: false });
  // Observable that emits the currently visible title (resolved by language)
  pageTitle$ = this.pageTitleSubject.asObservable();
  // Observable that emits the current share configuration for the active page.
  pageShare$ = this.pageShareSubject.asObservable();
  // Observable for app state to check login status
  appState$ = inject(AppStateService).appState$;
  // User service for checking user type
  private userService = inject(UserService);
  // User profile observable
  userProfile$ = this.userService.currentProfile$;

  private eventHandler = (ev: Event) => this.onPageTitleEvent(ev as CustomEvent);
  private shareEventHandler = (ev: Event) => this.onPageShareEvent(ev as CustomEvent<PageShareDetail>);

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {
    // Use service observable directly for template consumption
    this.isMobile$ = this.platform.isMobile$;
    this.showHeaderMenu$ = this.UI.showHeaderMenu$;
  }

  ngOnInit(): void {
    // Register global listener for page title events
    window.addEventListener('page-title', this.eventHandler as EventListener);
    // Register global listener for page share events
    window.addEventListener('page-share', this.shareEventHandler as EventListener);
    this.syncTitleFromActiveRoute();
  }

  ngOnDestroy(): void {
    // Remove event listener
    window.removeEventListener('page-title', this.eventHandler as EventListener);
    // Remove page share listener
    window.removeEventListener('page-share', this.shareEventHandler as EventListener);
  }

  // Toggle theme via ThemeService
  toggleTheme(): void {
    this.theme.toggle();
  }

  // Set language via LanguageService
  setLang(l: 'EN' | 'TC'): void {
    this.lang.setLang(l);
  }

  // Toggle menu via UIService
  onMenuButtonClicked(): void {
    this.UI.toggleMenu();
  }

  // Navigate back using Location service
  goBack(): void {
    this.location.back();
  }

  // Open the native share sheet when the active page provides share metadata.
  async shareCurrentPage(): Promise<void> {
    const shareDetail = this.pageShareSubject.getValue();
    if (!shareDetail.isVisible) return;

    try {
      const canUseNativeShare = await this.canUseNativeShare();
      if (canUseNativeShare) {
        await Share.share({
          title: shareDetail.title,
          text: shareDetail.text,
          url: shareDetail.url,
          dialogTitle: shareDetail.dialogTitle || shareDetail.title
        });
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: shareDetail.title,
          text: shareDetail.text,
          url: shareDetail.url
        });
        return;
      }

      await this.presentShareUnavailableToast();
    } catch (error) {
      if (this.isShareCancellationError(error)) return;
      console.error('HeaderComponent: error sharing current page', error);
      await this.presentShareUnavailableToast();
    }
  }

  // Handler for custom page title events
  private onPageTitleEvent(ev: CustomEvent): void {
    try {
      const detail = ev.detail as PageTitle | undefined;
      if (detail && (typeof detail.Header_EN === 'string' || typeof detail.Header_TC === 'string')) {
        // Update the page title subject so displayedTitle$ recomputes
        this.pageTitleSubject.next({
          Header_EN: detail.Header_EN || '',
          Header_TC: detail.Header_TC || ''
        });
      } else {
        console.warn('HeaderComponent: page-title event had invalid detail', detail);
      }
    } catch (err) {
      console.error('HeaderComponent: error handling page title event', err);
    }
  }

  // Handler for custom page share events that provide contextual share metadata.
  private onPageShareEvent(ev: CustomEvent<PageShareDetail>): void {
    try {
      const detail = ev.detail;
      if (!detail || typeof detail.isVisible !== 'boolean') {
        console.warn('HeaderComponent: page-share event had invalid detail', detail);
        return;
      }

      this.pageShareSubject.next({
        isVisible: detail.isVisible,
        title: typeof detail.title === 'string' ? detail.title : undefined,
        text: typeof detail.text === 'string' ? detail.text : undefined,
        url: typeof detail.url === 'string' ? detail.url : undefined,
        dialogTitle: typeof detail.dialogTitle === 'string' ? detail.dialogTitle : undefined,
      });
    } catch (err) {
      console.error('HeaderComponent: error handling page share event', err);
    }
  }

  public emitPageTitle(title: { Header_EN: string; Header_TC: string }): void {
    const event = new CustomEvent('page-title', {
      detail: title,
      bubbles: true,
    });
    window.dispatchEvent(event);
  }

  private syncTitleFromActiveRoute(): void {
    let current = this.router.routerState.snapshot.root;
    while (current.firstChild) {
      current = current.firstChild;
    }

    const titleData = current.data['title'];
    if (titleData) {
      this.pageTitleSubject.next({
        Header_EN: titleData.Header_EN || '',
        Header_TC: titleData.Header_TC || ''
      });
    }
  }

  // Check whether the native Capacitor Share plugin can open the OS share sheet.
  private async canUseNativeShare(): Promise<boolean> {
    try {
      const canShareResult = await Share.canShare();
      return canShareResult.value;
    } catch {
      return false;
    }
  }

  // Treat common cancellation responses as a normal user action instead of an error.
  private isShareCancellationError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const message = 'message' in error && typeof error.message === 'string' ? error.message.toLowerCase() : '';
    return message.includes('cancel') || message.includes('dismiss');
  }

  // Show a short warning when sharing is unavailable on the current platform.
  private async presentShareUnavailableToast(): Promise<void> {
    const isTraditionalChinese = this.lang.getCurrentLanguage() === 'TC';
    const toast = await this.toastController.create({
      message: isTraditionalChinese ? '此裝置暫時無法分享' : 'Sharing is not available on this device',
      duration: 2500,
      position: 'bottom',
      color: 'warning'
    });
    await toast.present();
  }
}
