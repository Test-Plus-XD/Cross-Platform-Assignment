// Theme service to manage and persist light/dark theme
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  // BehaviourSubject that stores current theme state: true => dark, false => light
  private _isDark = new BehaviorSubject<boolean>(this.getInitialTheme());

  // Public observable for components to subscribe to
  isDark$ = this._isDark.asObservable();

  // Read initial theme from localStorage or system preference
  private getInitialTheme(): boolean {
    const saved = localStorage.getItem('theme');
    if (saved) {
      return saved === 'dark';
    }
    // Default to system preference when nothing saved
    return typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;
  }

  // Toggle between light and dark and persist selection
  toggle() {
    const next = !this._isDark.value;
    this.setTheme(next);
  }

  // Set theme explicitly and persist to localStorage, also update DOM class
  setTheme(dark: boolean) {
    this._isDark.next(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }
}