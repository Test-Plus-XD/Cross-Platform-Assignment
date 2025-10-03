import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Lang = 'EN' | 'TC';

@Injectable({ providedIn: 'root' })
export class LanguageService {
    private _lang = new BehaviorSubject<Lang>(this.getSaved());
    lang$ = this._lang.asObservable();

    private getSaved(): Lang {
        return (localStorage.getItem('lang') as Lang) || 'EN';
    }

    setLang(lang: Lang) {
        localStorage.setItem('lang', lang);
        this._lang.next(lang);
    }

    // helper to pick field from record
    t<T extends Record<string, any>>(obj: T, keyEN: string, keyTC: string) {
        return this._lang.value === 'TC' ? obj[keyTC] ?? obj[keyEN] : obj[keyEN] ?? obj[keyTC];
    }
}