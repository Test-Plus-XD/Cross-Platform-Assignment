// Import Observable utilities and Angular lifecycle APIs
import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Observable, of } from 'rxjs';
import { take, map } from 'rxjs/operators';
import { MockDataService } from '../../services/mock-data.service';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';
import { register } from 'swiper/element/bundle'; // Register Swiper web components if not already registered

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, AfterViewInit {
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

  // Template references to each swiper-container so we can control them individually
  @ViewChild('adsSwiper', { static: false }) adsSwiper!: ElementRef;
  @ViewChild('offersSwiper', { static: false }) offersSwiper!: ElementRef;
  @ViewChild('articlesSwiper', { static: false }) articlesSwiper!: ElementRef;
  @ViewChild('reviewsSwiper', { static: false }) reviewsSwiper!: ElementRef;
  @ViewChild('restaurantsSwiper', { static: false }) restaurantsSwiper!: ElementRef;

  // Per-section Swiper configurations — tweak here to control each carousel independently
  adsSwiperConfig: any = { slidesPerView: 1, loop: true, autoplay: { delay: 4000 }, pagination: { clickable: true } };
  offersSwiperConfig: any = { slidesPerView: 2, spaceBetween: 12, breakpoints: { 768: { slidesPerView: 3 } }, pagination: false };
  articlesSwiperConfig: any = { slidesPerView: 1.2, spaceBetween: 12, breakpoints: { 768: { slidesPerView: 2 } }, pagination: { clickable: true } };
  reviewsSwiperConfig: any = { slidesPerView: 1.2, spaceBetween: 10, breakpoints: { 768: { slidesPerView: 2 } }, pagination: false };
  restaurantsSwiperConfig: any = { slidesPerView: 1.2, spaceBetween: 12, breakpoints: { 640: { slidesPerView: 2 }, 1024: { slidesPerView: 3 } }, pagination: { clickable: true } };

  constructor(
    private readonly mock: MockDataService,
    private platform: Platform,
    private lang: LanguageService,
    private theme: ThemeService
  ) {
    // Ensure Swiper custom elements are registered at runtime if not already registered
    try {
      // Register only if the custom element is not yet present to avoid duplicates
      if (typeof (window as any).customElements !== 'undefined' && !(window as any).customElements.get('swiper-container')) {
        register(); // Register web components: swiper-container, swiper-slide ...
        console.log('HomePage: Swiper elements registered at runtime');
      } else {
        console.log('HomePage: Swiper elements already registered');
      }
    } catch (err) {
      // Log any registration error to the console for debug
      console.error('HomePage: Failed to register Swiper elements', err);
    }
  }

  ngOnInit() {
    // Detect native mobile platform (Android or iOS)
    this.isNative = this.platform.is('android') || this.platform.is('ios');
    // Initialise theme class early (ThemeService should apply .dark)
    this.theme.init?.();
    // Load collections from mock service via observables
    this.offers$ = this.mock.offers$();
    this.articles$ = this.mock.articles$();
    this.reviews$ = this.mock.reviews$();
    this.restaurants$ = this.mock.restaurants$();
    this.ads$ = this.mock.ads$();
    // Set a default featured image once offers exist; take(1) avoids long-lived subscription
    this.offers$.pipe(take(1)).subscribe(arr => { if (arr && arr.length) this.featuredImage = arr[0].image || this.featuredImage; });
  }

  // After the view is initialised we wire up each swiper element with its config
  ngAfterViewInit(): void {
    // Delay initialisation slightly to let Angular render slides inside the swiper containers
    setTimeout(() => {
      // Initialise each swiper container if found in the template
      this.initIfPresent(this.adsSwiper, this.adsSwiperConfig, 'ads');
      this.initIfPresent(this.offersSwiper, this.offersSwiperConfig, 'offers');
      this.initIfPresent(this.articlesSwiper, this.articlesSwiperConfig, 'articles');
      this.initIfPresent(this.reviewsSwiper, this.reviewsSwiperConfig, 'reviews');
      this.initIfPresent(this.restaurantsSwiper, this.restaurantsSwiperConfig, 'restaurants');
    }, 50); // Short timeout to allow child ngFor rendering
  }

  // Helper to safely initialise a Swiper custom element if the ViewChild exists
  private initIfPresent(viewChildRef: ElementRef | undefined, config: any, name: string) {
    // Guard if the view child is not present or not initialised
    if (!viewChildRef || !viewChildRef.nativeElement) {
      console.warn(`HomePage: initIfPresent() — ${name} swiper element not found`);
      return;
    }
    const el: any = viewChildRef.nativeElement; // Native custom element instance
    try {
      // Assign config onto the custom element so it picks options from properties
      Object.assign(el, config);
      console.log(`HomePage: initIfPresent() — ${name} config assigned`, config);
      // Some builds expose an initialize() method to create the internal Swiper instance
      if (typeof el.initialize === 'function') {
        el.initialize();
        console.log(`HomePage: initIfPresent() — ${name} initialize() called`);
      } else {
        console.warn(`HomePage: initIfPresent() — ${name} initialize() not available (maybe already initialised)`);
      }
      // Attach a DOM event listener for slide changes for debugging and optional behaviours
      el.addEventListener('swiperslidechange', (ev: any) => {
        console.log(`HomePage: ${name} swiperslidechange`, { event: ev, activeIndex: el.swiper ? el.swiper.activeIndex : null });
      });
      // Small post-init log to show internal swiper object state
      setTimeout(() => console.log(`HomePage: ${name} el.swiper =`, el.swiper), 150);
    } catch (err) {
      // Detailed error log for debugging initialisation issues
      console.error(`HomePage: initIfPresent() failed for ${name}`, err);
    }
  }

  // Generic Next for a named swiper section (defaults to ads to preserve current behaviour)
  async SwiperNext(section: 'ads' | 'offers' | 'articles' | 'reviews' | 'restaurants' = 'ads') {
    // Resolve chosen swiper element
    const el = this.getSwiperEl(section);
    if (el && el.swiper && typeof el.swiper.slideNext === 'function') {
      el.swiper.slideNext(); // Move to next slide using internal API
      console.log('HomePage: SwiperNext() invoked for', section);
    } else {
      console.warn('HomePage: SwiperNext() — swiper not ready for', section);
    }
  }

  // Generic Prev for a named swiper section (defaults to ads to preserve current behaviour)
  async SwiperPrev(section: 'ads' | 'offers' | 'articles' | 'reviews' | 'restaurants' = 'ads') {
    // Resolve chosen swiper element
    const el = this.getSwiperEl(section);
    if (el && el.swiper && typeof el.swiper.slidePrev === 'function') {
      el.swiper.slidePrev(); // Move to previous slide using internal API
      console.log('HomePage: SwiperPrev() invoked for', section);
    } else {
      console.warn('HomePage: SwiperPrev() — swiper not ready for', section);
    }
  }

  // Resolve a native swiper element by section name from ViewChild references
  private getSwiperEl(section: string): any {
    // Switch to the appropriate ViewChild and return its native element or undefined
    switch (section) {
      case 'ads': return this.adsSwiper?.nativeElement;
      case 'offers': return this.offersSwiper?.nativeElement;
      case 'articles': return this.articlesSwiper?.nativeElement;
      case 'reviews': return this.reviewsSwiper?.nativeElement;
      case 'restaurants': return this.restaurantsSwiper?.nativeElement;
      default: return this.adsSwiper?.nativeElement;
    }
  }

  // Set featured image on hover/focus
  setFeatured(url?: string | null) {
    if (url) this.featuredImage = url; // Replace featured image when provided
  }

  // Toggle the theme (light/dark)
  toggleTheme() {
    this.theme.toggle(); // Toggle using ThemeService
  }

  // Set language
  setLang(l: 'EN' | 'TC') {
    this.lang.setLang(l); // Switch language using LanguageService
  }
}