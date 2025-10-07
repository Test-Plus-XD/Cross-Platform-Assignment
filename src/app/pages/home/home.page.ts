// Import Observable utilities
import { Component, OnInit, ViewChild } from '@angular/core';
import { Platform, IonicSlides } from '@ionic/angular';
import { Swiper } from 'swiper';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
// Import services and types
import { MockDataService, Restaurant } from '../../services/mock-data.service';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';
//import { DataService } from '../../services/data.service'; // Firestore

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
  // Swiper template ref
  @ViewChild('SwiperBar', { static: false }) SwiperBarRef: any;

  // Bound featured image for the hero large image
  featuredImage: string | null = null;
  // Observable that emits the correct brand icon URL when theme changes
  brandIcon$ = this.isDark$.pipe(map(d => d ? 'assets/icon/App-Dark.png?theme=dark' : 'assets/icon/App-Light.png?theme=light'));

  // Inject services for data, language and theme
  constructor(
    private readonly mock: MockDataService,
    //private data: DataService,
    private platform: Platform,
    private lang: LanguageService,
    private theme: ThemeService
  ) { }

  // Lifecycle hook: runs after constructor, good for initial data loading
  ngOnInit() {
    // Detect native mobile platform (Android or iOS)
    this.isNative = this.platform.is('android') || this.platform.is('ios');
    // Initialise theme class early (ThemeService should apply .dark)
    this.theme.init?.();

    // Load Firestore collections via DataService
    // Collections: "offers", "articles", "reviews", "restaurants", "ads"
    this.offers$ = this.mock.offers$();
    this.articles$ = this.mock.articles$();
    this.reviews$ = this.mock.reviews$();
    this.restaurants$ = this.mock.restaurants$();
    this.ads$ = this.mock.ads$();
    // Set a default featured image once offers exist
    this.offers$.subscribe(arr => { if (arr && arr.length) this.featuredImage = arr[0].image || this.featuredImage; });
  }

  // Swiper navigation helpers used by template arrows
  async SwiperNext() {
    const el = this.SwiperBarRef?.nativeElement as any;
    if (el && typeof el.swiper !== 'undefined') {
      el.swiper.slideNext();
    }
  }
  async SwiperPrev() {
    const el = this.SwiperBarRef?.nativeElement as any;
    if (el && typeof el.swiper !== 'undefined') {
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