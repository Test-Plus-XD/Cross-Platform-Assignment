import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private _isDark = new BehaviorSubject<boolean>(this.getInitialTheme());
    isDark$ = this._isDark.asObservable();

    private getInitialTheme(): boolean {
        const saved = localStorage.getItem('theme');
        if (saved) return saved === 'dark';
        // Default to system preference
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    toggle() {
        const next = !this._isDark.value;
        this.setTheme(next);
    }

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