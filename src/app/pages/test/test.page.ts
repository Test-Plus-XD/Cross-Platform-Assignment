// src/app/pages/test/test.page.ts
// TestPage with header copied from Home and a minimal Swiper demo for narrowing the theme issue
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-test',
  templateUrl: './test.page.html',
  styleUrls: ['./test.page.scss'],
  standalone: false,
})
export class TestPage implements OnInit, OnDestroy {
  // Language and theme streams exposed for template binding
  lang$ = this.lang.lang$;
  isDark$ = this.theme.isDark$;
  // Brand icon that changes with theme
  brandIcon$ = this.isDark$.pipe(map(d => d ? 'assets/icon/App-Dark.png?theme=dark' : 'assets/icon/App-Light.png?theme=light'));
  // Minimal demo slides for the test swiper
  slides: string[] = ['Slide one — hello', 'Slide two — greetings', 'Slide three — farewell'];
  // ViewChild reference to the demo swiper-element
  @ViewChild('swiperEl', { static: false }) swiperEl!: ElementRef;
  // Subscriptions container so we can tear down listeners
  private subs: Subscription[] = [];

  constructor(private lang: LanguageService, private theme: ThemeService) {
    // Log construction for debug
    console.log('TestPage: constructor()');
  }

  ngOnInit(): void {
    // Log initialisation and ensure theme service initialises if it exposes init()
    console.log('TestPage: ngOnInit()');
    this.theme.init?.();
    // Subscribe to theme changes to log them (helps reproduce the error)
    this.subs.push(this.isDark$.subscribe(d => console.log('TestPage: isDark$ ->', d)));
  }

  // Toggle theme via ThemeService with defensive logging
  toggleTheme(): void {
    try {
      console.log('TestPage: toggleTheme() called');
      this.theme.toggle();
    } catch (err) {
      console.error('TestPage: toggleTheme() error', err);
    }
  }

  // Language setter to mirror Home behaviour
  setLang(l: 'EN' | 'TC'): void {
    this.lang.setLang(l);
  }

  // Minimal Next button for the demo swiper to confirm control after theme toggle
  nextSlide(): void {
    const el: any = this.swiperEl?.nativeElement;
    if (el && el.swiper && typeof el.swiper.slideNext === 'function') {
      el.swiper.slideNext();
      console.log('TestPage: nextSlide() invoked');
    } else {
      console.warn('TestPage: nextSlide() — swiper not ready', !!el, !!(el && el.swiper));
    }
  }

  // Clean up subscriptions on destroy
  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }
}