// Import Observable utilities
import { Component, OnInit } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Observable, of } from 'rxjs';
import { take, map } from 'rxjs/operators';
import { SwiperOptions } from 'swiper/types';
import { MockDataService } from '../../services/mock-data.service';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  // Observables expected to come from services (Firestore-friendly)
  offers$: Observable<any[]> = of([]);
  articles$: Observable<any[]> = of([]);
  reviews$: Observable<any[]> = of([]);
  restaurants$: Observable<any[]> = of([]);
  ads$: Observable<any[]> = of([]);
  // Expose language stream from LanguageService (emits 'EN' or 'TC')
  lang$ = this.lang.lang$;
  // Expose theme stream from ThemeService (emits true/false for dark mode)
  isDark$ = this.theme.isDark$;
  // Platform flag for native (android/ios) to hide controls
  isNative = false;
  // Bound featured image for the hero large image
  featuredImage: string | null = null;
  // Observable that emits the correct brand icon URL when theme changes
  brandIcon$ = this.isDark$.pipe(map(d => d ? 'assets/icon/App-Dark.png?theme=dark' : 'assets/icon/App-Light.png?theme=light'));

  constructor(
    private readonly mock: MockDataService,
    private platform: Platform,
    private lang: LanguageService,
    private theme: ThemeService
  ) { }

  ngOnInit() {
    // Detect native mobile platform (Android or iOS)
    this.isNative = this.platform.is('android') || this.platform.is('ios');
    // Initialise theme class early (ThemeService should apply .dark)
    this.theme.init?.();
    // Load collections from mock service
    this.offers$ = this.mock.offers$();
    this.articles$ = this.mock.articles$();
    this.reviews$ = this.mock.reviews$();
    this.restaurants$ = this.mock.restaurants$();
    this.ads$ = this.mock.ads$();
    // Set a default featured image once offers exist; take(1) avoids long-lived subscription
    this.offers$.pipe(take(1)).subscribe(arr => { if (arr && arr.length) this.featuredImage = arr[0].image || this.featuredImage; });
  }

  // Move to next slide using DOM query to avoid template ref
  async SwiperNext() {
    // Query for the first swiper-container in the document
    const el = document.querySelector('swiper-container') as any;
    if (el && typeof el.swiper !== 'undefined' && typeof el.swiper.slideNext === 'function') {
      el.swiper.slideNext();
    }
  }

  // Move to previous slide using DOM query to avoid template ref
  async SwiperPrev() {
    // Query for the first swiper-container in the document
    const el = document.querySelector('swiper-container') as any;
    if (el && typeof el.swiper !== 'undefined' && typeof el.swiper.slidePrev === 'function') {
      el.swiper.slidePrev();
    }
  }

  // Set featured image on hover/focus
  setFeatured(url?: string | null) {
    if (url) this.featuredImage = url;
  }

  // Toggle the theme (light/dark)
  toggleTheme() {
    this.theme.toggle();
  }

  // Set language
  setLang(l: 'EN' | 'TC') {
    this.lang.setLang(l);
  }
}