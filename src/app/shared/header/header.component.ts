// Shared header component that exposes language & theme controls and brand icon
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Router } from '@angular/router';
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
  // Observable that emits the currently visible title (resolved by language)
  pageTitle$ = this.pageTitleSubject.asObservable();
  // Observable for app state to check login status
  appState$ = inject(AppStateService).appState$;
  // User service for checking user type
  private userService = inject(UserService);
  // User profile observable
  userProfile$ = this.userService.currentProfile$;

  private eventHandler = (ev: Event) => this.onPageTitleEvent(ev as CustomEvent);

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
    this.syncTitleFromActiveRoute();
  }

  ngOnDestroy(): void {
    // Remove event listener
    window.removeEventListener('page-title', this.eventHandler as EventListener);
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
}
