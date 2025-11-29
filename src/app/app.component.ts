import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject, BehaviorSubject } from 'rxjs';
import { HeaderComponent } from './shared/header/header.component';
import { ThemeService } from './services/theme.service';
import { LayoutService } from './services/layout.service';
import { LanguageService } from './services/language.service';
import { PlatformService } from './services/platform.service';
import { UIService } from './services/UI.service';
import { AuthService } from './services/auth.service';

// Centralized app state interface
export interface AppState {
  sessionId: string;
  isLoggedIn: boolean;
  uid: string | null;
  displayName: string | null;
  email: string | null;
}

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
    @ViewChild(HeaderComponent) header!: HeaderComponent;

    // Centralised app state - accessible by all components
    private appStateSubject = new BehaviorSubject<AppState>(this.loadStateFromStorage());
    public appState$ = this.appStateSubject.asObservable();

    // Cleanup subject
    private destroy$ = new Subject<void>();

    constructor(
        readonly theme: ThemeService,
        readonly layout: LayoutService,
        readonly language: LanguageService,
        readonly platform: PlatformService,
        readonly UI: UIService,
        readonly authService: AuthService,
        readonly router: Router
    ) {
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
      // Subscribe to auth state changes and update centralized state
      this.authService.currentUser$
        .pipe(takeUntil(this.destroy$))
        .subscribe(user => {
          const newState: AppState = {
            sessionId: this.generateSessionId(),
            isLoggedIn: !!user,
            uid: user?.uid || null,
            displayName: user?.displayName || null,
            email: user?.email || null
          };

          this.appStateSubject.next(newState);
          this.saveStateToStorage(newState);

          console.log('AppComponent: State updated', {
            isLoggedIn: newState.isLoggedIn,
            uid: newState.uid
          });
        });
    }

    ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
    }

    // Get current app state synchronously
    get appState(): AppState {
      return this.appStateSubject.value;
    }

    // Generate session ID (persists across page reloads within same session)
    private generateSessionId(): string {
      const existingSessionId = sessionStorage.getItem('sessionId');
      if (existingSessionId) {
        return existingSessionId;
      }

      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      sessionStorage.setItem('sessionId', newSessionId);
      return newSessionId;
    }

    // Load state from localStorage
    private loadStateFromStorage(): AppState {
      try {
        const stored = localStorage.getItem('appState');
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            sessionId: this.generateSessionId(),
            isLoggedIn: parsed.isLoggedIn || false,
            uid: parsed.uid || null,
            displayName: parsed.displayName || null,
            email: parsed.email || null
          };
        }
      } catch (error) {
        console.error('AppComponent: Error loading state from storage', error);
      }

      return {
        sessionId: this.generateSessionId(),
        isLoggedIn: false,
        uid: null,
        displayName: null,
        email: null
      };
    }

    // Save state to localStorage
    private saveStateToStorage(state: AppState): void {
      try {
        localStorage.setItem('appState', JSON.stringify(state));
      } catch (error) {
        console.error('AppComponent: Error saving state to storage', error);
      }
    }
}