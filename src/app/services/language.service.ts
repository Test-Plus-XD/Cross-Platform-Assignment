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
    const saved = localStorage.getItem('lang') as Lang | null;
    return saved || 'EN';
  }

  // Set a language and persist to localStorage, then emit it
  setLang(lang: Lang) {
    localStorage.setItem('lang', lang);
    this._lang.next(lang);
  }

  // Initialise service and sync with DOM on app start
  init() {
    const currentLang = this.getSaved();
    this._lang.next(currentLang); // Ensure BehaviourSubject emits current value
  }
}