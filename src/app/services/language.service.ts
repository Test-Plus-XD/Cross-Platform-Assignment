// Language service to manage and persist selected language
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Lang = 'EN' | 'TC';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  // BehaviourSubject that holds the current language
  private _lang = new BehaviorSubject<Lang>(this.getSaved());
  // Public observable the UI subscribes to
  lang$ = this._lang.asObservable();

  // Read saved language from localStorage, default to EN
  private getSaved(): Lang {
    const saved = localStorage.getItem('language') as Lang | null;
    return saved || 'EN';
  }

  // Return the currently active language as a value, not an observable
  getCurrentLanguage(): Lang {
    return this._lang.value; // Return latest emitted language
  }

  // Set a language and persist to localStorage, then emit it
  setLang(language: Lang) {
    localStorage.setItem('language', language);
    this._lang.next(language); // Emit updated language
  }

  toggleLanguage() {
    const current = this._lang.value;
    this.setLang(current === 'EN' ? 'TC' : 'EN'); // Toggle between EN and TC
  }

  // Initialise service and sync with DOM on app start
  init() {
    const currentLang = this.getSaved();
    this._lang.next(currentLang); // Ensure BehaviourSubject emits current value
  }
}