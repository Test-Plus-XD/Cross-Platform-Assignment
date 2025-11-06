// Theme service to manage and persist light/dark theme
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  // BehaviourSubject that stores current theme state: true => dark, false => light
  private _isDark = new BehaviorSubject<boolean>(this.readSaved());
  // Public observable for components to subscribe to
  isDark$ = this._isDark.asObservable();
  // Brand icon that changes with theme
  brandIcon$ = this.isDark$.pipe(map(d => d ? 'assets/icon/App-Dark.png?theme=dark' : 'assets/icon/App-Light.png?theme=light'));

  // Read initial theme from localStorage or system preference
  private readSaved(): boolean {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // Initialise once at app startup to ensure class exists before UI renders
  init() {
    // Apply current state immediately
    this.apply(this._isDark.value);
    // Keep DOM synced with future changes
    this._isDark.subscribe(v => this.apply(v));
  }

  // Toggle between light and dark and persist selection
  toggle() {
    const next = !this._isDark.value;
    localStorage.setItem('theme', next ? 'dark' : 'light');
    this._isDark.next(next);
  }

  // Set theme explicitly and persist to localStorage, also update DOM class
  setTheme(isDark: boolean) {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    this._isDark.next(isDark);
  }

  // Apply simply adds or removes the .dark class
  private apply(isDark: boolean) {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }
}