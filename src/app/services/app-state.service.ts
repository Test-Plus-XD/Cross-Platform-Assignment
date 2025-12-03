import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from './auth.service';

// Centralized app state interface
export interface AppState {
  sessionId: string;
  isLoggedIn: boolean;
  uid: string | null;
  displayName: string | null;
  email: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AppStateService implements OnDestroy {
  // Centralized app state - accessible by all components
  private appStateSubject = new BehaviorSubject<AppState>(this.loadStateFromStorage());
  public appState$: Observable<AppState> = this.appStateSubject.asObservable();

  // Cleanup subject
  private destroy$ = new Subject<void>();

  constructor(private auth: AuthService) {
    // Subscribe to auth state changes and update centralized state
    this.auth.currentUser$
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

        console.log('AppStateService: State updated', {
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
      console.error('AppStateService: Error loading state from storage', error);
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
      console.error('AppStateService: Error saving state to storage', error);
    }
  }
}
