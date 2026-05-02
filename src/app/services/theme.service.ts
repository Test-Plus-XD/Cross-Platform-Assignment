// Theme service to manage persisted light/dark theme selection plus temporary
// runtime overrides such as the QR scanner's forced light mode.
import { Injectable } from '@angular/core';
import { BehaviorSubject, Subscription, combineLatest } from 'rxjs';
import { distinctUntilChanged, map, shareReplay } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  // Persisted theme preference: true => dark, false => light.
  private readonly savedThemeSubject = new BehaviorSubject<boolean>(this.readSaved());
  // Temporary runtime override used when a feature needs a forced theme briefly.
  private readonly temporaryThemeOverrideSubject = new BehaviorSubject<boolean | null>(null);
  // DOM sync subscription is stored so init() remains idempotent.
  private themeDomSyncSubscription: Subscription | null = null;
  // Public observable exposing the effective theme.
  readonly isDark$ = combineLatest([
    this.savedThemeSubject,
    this.temporaryThemeOverrideSubject
  ]).pipe(
    map(([savedTheme, temporaryThemeOverride]) => temporaryThemeOverride ?? savedTheme),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  // Brand icon follows the effective theme so temporary overrides update it too.
  readonly brandIcon$ = this.isDark$.pipe(
    map((isDarkTheme) => isDarkTheme ? 'assets/icon/App-Dark.png?theme=dark' : 'assets/icon/App-Light.png?theme=light')
  );

  // Read initial theme from localStorage or system preference.
  private readSaved(): boolean {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // Initialise once at app startup to ensure the DOM class exists before UI renders.
  init(): void {
    if (this.themeDomSyncSubscription) return;

    this.apply(this.isDark);
    this.themeDomSyncSubscription = this.isDark$.subscribe((isDarkTheme) => this.apply(isDarkTheme));
  }

  // Toggle between light and dark and persist the saved selection.
  toggle(): void {
    this.setSavedTheme(!this.savedThemeSubject.value);
  }

  // Set the saved theme explicitly and persist it to localStorage.
  setTheme(isDark: boolean): void {
    this.setSavedTheme(isDark);
  }

  // Persist the user's selected theme without touching any temporary override.
  setSavedTheme(isDark: boolean): void {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    this.savedThemeSubject.next(isDark);
  }

  // Temporarily override the effective theme without overwriting the saved preference.
  setTemporaryThemeOverride(isDark: boolean | null): void {
    this.temporaryThemeOverrideSubject.next(isDark);
  }

  // Clear the temporary override and fall back to the saved preference.
  clearTemporaryThemeOverride(): void {
    this.temporaryThemeOverrideSubject.next(null);
  }

  // Expose the currently effective theme synchronously for imperative flows.
  get isDark(): boolean {
    return this.temporaryThemeOverrideSubject.value ?? this.savedThemeSubject.value;
  }


  // Return Google Maps style array for the active app theme so all map entry points stay consistent.
  getGoogleMapStylesForCurrentTheme(): google.maps.MapTypeStyle[] {
    if (!this.isDark) return [];

    return [
      { elementType: 'geometry', stylers: [{ color: '#1e2b22' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#d3e5d6' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#1b261f' }] },
      { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#b4cab8' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#34453a' }] },
      { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#e1f2e3' }] },
      { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2a3a30' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#152d38' }] },
      { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9ac9d8' }] }
    ];
  }

  // Apply simply adds or removes the .dark class.
  private apply(isDark: boolean): void {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }
}