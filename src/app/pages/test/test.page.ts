// src/app/pages/test/test.page.ts
// TestPage with header copied from Home and a minimal Swiper demo for narrowing the theme issue
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { IonContent, ScrollDetail } from '@ionic/angular/standalone';
import { Subscription, Observable } from 'rxjs';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';
import { LayoutService } from '../../services/layout.service';
import { PlatformService } from '../../services/platform.service';

@Component({
  selector: 'app-test',
  templateUrl: './test.page.html',
  styleUrls: ['./test.page.scss'],
  standalone: false,
})
export class TestPage implements OnInit, OnDestroy {
  // Language, theme, and platform streams exposed for template binding
  lang$ = this.lang.lang$;
  isDark$ = this.theme.isDark$;
  isMobile$: Observable<boolean>;
  // Minimal demo slides for the test swiper
  slides: string[] = ['Slide one — hello', 'Slide two — greetings', 'Slide three — farewell'];
  longText: string[] = [];
  // ViewChild reference to the demo swiper-element
  @ViewChild('swiperEl', { static: false }) swiperEl!: ElementRef;
  // Subscriptions container so we can tear down listeners
  private subs: Subscription[] = [];

  constructor(
    readonly lang: LanguageService,
    readonly theme: ThemeService,
    public layout: LayoutService,
    readonly platformService: PlatformService
  ) {
    // Log construction for debug
    console.log('TestPage: constructor()');
    this.isMobile$ = this.platformService.isMobile$;
  }

  ngOnInit(): void {
    // Log initialisation and ensure theme service initialises if it exposes init()
    console.log('TestPage: ngOnInit()');
    this.theme.init?.();
    // Subscribe to theme changes to log them (helps reproduce the error)
    this.subs.push(this.isDark$.subscribe(d => console.log('TestPage: isDark$ ->', d)));
    // Generate many lines so scrolling is possible
    this.longText = Array.from({ length: 200 }).map((_, i) => `Line ${i + 1} — scroll test.`);
  }

  onScroll(ev: CustomEvent): void {
    console.log('Scroll event detected! detail:', ev.detail);
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