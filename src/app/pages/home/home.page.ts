// Import Observable utilities, Angular and Ionic lifecycle APIs and Rx utilities
import { Component, OnInit, AfterViewInit, AfterViewChecked, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Observable, of, Subscription } from 'rxjs';
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
export class HomePage implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy {
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

  // Guard flags to ensure each swiper is initialised only once per page presentation
  private hasInit: Record<string, boolean> = { ads: false, offers: false, articles: false, reviews: false, restaurants: false };
  // Subscriptions for data arrival to reinitialise swipers when async data arrives
  private subs: Subscription[] = [];

  constructor(
    private readonly mock: MockDataService,
    private platform: Platform,
    readonly lang: LanguageService,
    readonly theme: ThemeService
  ) {
    // Ensure Swiper custom elements are registered at runtime if not already registered
    try {
      if (typeof (window as any).customElements !== 'undefined' && !(window as any).customElements.get('swiper-container')) {
        register(); // Register web components: swiper-container, swiper-slide ...
        console.log('HomePage: Swiper elements registered at runtime');
      } else {
        console.log('HomePage: Swiper elements already registered');
      }
    } catch (err) {
      // Log registration error for debugging
      console.error('HomePage: Failed to register Swiper elements', err);
    }
  }

  // Initialise observables and subscribe once to set featured image and trigger re-init after data arrival
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

    // Reinitialise specific swipers when their data arrives asynchronously
    // This ensures slides exist before we call initialise/update
    this.subs.push(this.ads$.pipe(take(1)).subscribe(() => this.triggerInit('ads')));
    this.subs.push(this.offers$.pipe(take(1)).subscribe(() => this.triggerInit('offers')));
    this.subs.push(this.articles$.pipe(take(1)).subscribe(() => this.triggerInit('articles')));
    this.subs.push(this.reviews$.pipe(take(1)).subscribe(() => this.triggerInit('reviews')));
    this.subs.push(this.restaurants$.pipe(take(1)).subscribe(() => this.triggerInit('restaurants')));
  }

  // After Angular has initialised the view, perform a first attempt to initialise swipers
  ngAfterViewInit(): void {
    // Try initialisation once; actual readiness is detected in ngAfterViewChecked
    this.tryInitAll();
  }

  // After each view check, test whether slides exist and initialise the corresponding swiper once
  ngAfterViewChecked(): void {
    // For each section, if not already initialised, check whether slide children exist and init
    this.tryInitIfReady('ads', this.adsSwiper, this.adsSwiperConfig);
    this.tryInitIfReady('offers', this.offersSwiper, this.offersSwiperConfig);
    this.tryInitIfReady('articles', this.articlesSwiper, this.articlesSwiperConfig);
    this.tryInitIfReady('reviews', this.reviewsSwiper, this.reviewsSwiperConfig);
    this.tryInitIfReady('restaurants', this.restaurantsSwiper, this.restaurantsSwiperConfig);
  }

  // Ensure subscriptions are cleaned up on destroy to avoid leaks
  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  // Public Next method for UI buttons; uses the internal swiper API
  async SwiperNext(section: 'ads' | 'offers' | 'articles' | 'reviews' | 'restaurants' = 'ads') {
    const el = this.getSwiperEl(section);
    if (el && el.swiper && typeof el.swiper.slideNext === 'function') {
      el.swiper.slideNext(); // Use internal API to advance
      console.log('HomePage: SwiperNext() invoked for', section);
    } else {
      console.warn('HomePage: SwiperNext() — swiper not ready for', section);
      // Try safe initialize fallback if available
      if (el && typeof el.initialize === 'function') {
        try { el.initialize(); console.log(`HomePage: SwiperNext() fallback initialize() for ${section}`); } catch { /* ignore */ }
      }
    }
  }

  // Public Prev method for UI buttons; uses the internal swiper API
  async SwiperPrev(section: 'ads' | 'offers' | 'articles' | 'reviews' | 'restaurants' = 'ads') {
    const el = this.getSwiperEl(section);
    if (el && el.swiper && typeof el.swiper.slidePrev === 'function') {
      el.swiper.slidePrev(); // Use internal API to go previous
      console.log('HomePage: SwiperPrev() invoked for', section);
    } else {
      console.warn('HomePage: SwiperPrev() — swiper not ready for', section);
      if (el && typeof el.initialize === 'function') {
        try { el.initialize(); console.log(`HomePage: SwiperPrev() fallback initialize() for ${section}`); } catch { /* ignore */ }
      }
    }
  }

  // Trigger init attempt for a specific section (used when async data arrives)
  private triggerInit(section: 'ads' | 'offers' | 'articles' | 'reviews' | 'restaurants') {
    // Reset guard so ngAfterViewChecked will attempt initialisation again
    this.hasInit[section] = false;
    // Immediate attempt after a short delay to allow change detection to run
    setTimeout(() => this.tryInitAll(), 10);
  }

  // Try initialisation for all sections (used by ngAfterViewInit and triggerInit)
  private tryInitAll() {
    this.tryInitIfReady('ads', this.adsSwiper, this.adsSwiperConfig);
    this.tryInitIfReady('offers', this.offersSwiper, this.offersSwiperConfig);
    this.tryInitIfReady('articles', this.articlesSwiper, this.articlesSwiperConfig);
    this.tryInitIfReady('reviews', this.reviewsSwiper, this.reviewsSwiperConfig);
    this.tryInitIfReady('restaurants', this.restaurantsSwiper, this.restaurantsSwiperConfig);
  }

  // Attempt to initialise a swiper only if it is present, has slides and has not been initialised yet
  private tryInitIfReady(
    name: 'ads' | 'offers' | 'articles' | 'reviews' | 'restaurants',
    viewRef: ElementRef | undefined,
    config: any
  ) {
    // Guard if already initialised
    if (this.hasInit[name]) return;
    // Guard if ViewChild not found in this cycle
    if (!viewRef || !viewRef.nativeElement) {
      // Not in DOM yet; will be picked up in subsequent ngAfterViewChecked runs
      return;
    }
    const el: any = viewRef.nativeElement;
    // Count child slides; require at least one slide to avoid Swiper internal errors
    const slideCount = el.querySelectorAll ? el.querySelectorAll('swiper-slide').length : 0;
    if (slideCount <= 0) {
      // Slides not yet rendered; skip this cycle and wait for next ngAfterViewChecked
      return;
    }
    // Slides exist; mark as initialised to avoid duplicate work
    this.hasInit[name] = true;
    // Call central initializer that handles update vs initialise and safety checks
    this.initIfPresent(viewRef, config, name);
  }

  // Central initialisation logic that assigns config and calls update/initialize safely
  private async initIfPresent(viewChildRef: ElementRef | undefined, config: any, name: string) {
    // Guard if view child is not present
    if (!viewChildRef || !viewChildRef.nativeElement) {
      console.warn(`HomePage: initIfPresent() — ${name} swiper element not found`);
      return;
    }
    const el: any = viewChildRef.nativeElement; // Native custom element instance

    try {
      // If pagination is expected but missing, create a slot element so Swiper internals find it
      if (config && config.pagination && !el.querySelector('[slot="pagination"]')) {
        const pag = document.createElement('div'); // Create element for pagination slot
        pag.setAttribute('slot', 'pagination'); // Give it the pagination slot
        pag.className = 'swiper-pagination'; // Swiper expects this class for styling/behaviour
        el.appendChild(pag); // Append into the custom element so swiper internals find it
        console.log(`HomePage: initIfPresent() — ${name} pagination slot created`);
      }

      // Compute slides count and effective slidesPerView to prevent loop duplication issues
      const slidesCount = el.querySelectorAll ? el.querySelectorAll('swiper-slide').length : 0;
      const slidesPerView = this.effectiveSlidesPerView(config);
      if (config && config.loop && slidesCount > 0 && slidesCount < Math.ceil(slidesPerView)) {
        // Mutate a shallow copy of config so caller's object is not mutated unexpectedly
        config = { ...config, loop: false };
        console.warn(`HomePage: initIfPresent() — ${name} loop disabled because slides (${slidesCount}) < slidesPerView (${slidesPerView})`);
      }

      // Assign configuration onto the custom element so it picks options from properties
      Object.assign(el, config);
      console.log(`HomePage: initIfPresent() — ${name} config assigned`, config);

      // If the internal Swiper already exists, call update() to refresh slides; otherwise call initialize()
      if (el.swiper) {
        try {
          el.swiper.update(); // Refresh slides and re-render
          console.log(`HomePage: initIfPresent() — ${name} el.swiper.update() called`);
        } catch (e) {
          console.warn(`HomePage: initIfPresent() — ${name} update() failed, attempting initialize()`, e);
          if (typeof el.initialize === 'function') { el.initialize(); console.log(`HomePage: initIfPresent() — ${name} initialize() called after failed update`); }
        }
      } else {
        // Safe initialise path
        if (typeof el.initialize === 'function') {
          el.initialize();
          console.log(`HomePage: initIfPresent() — ${name} initialize() called`);
        } else {
          // Some builds auto-initialize on attribute assignment; warn but continue
          console.warn(`HomePage: initIfPresent() — ${name} initialize() not available; maybe auto-initialised`);
        }
      }

      // Attach debug event listener for slide changes
      el.addEventListener('swiperslidechange', (ev: any) => {
        console.log(`HomePage: ${name} swiperslidechange`, { event: ev, activeIndex: el.swiper ? el.swiper.activeIndex : null });
      });

      // Small post-init log to show internal swiper object state
      setTimeout(() => console.log(`HomePage: ${name} el.swiper =`, el.swiper), 150);
    } catch (err) {
      // Detailed error log for debugging initialisation issues
      console.error(`HomePage: initIfPresent() failed for ${name}`, err);
      // Reset the guard so Angular can try again later if appropriate
      this.hasInit[name] = false;
    }
  }

  // Utility: compute an effective slidesPerView from config (numbers or partial values)
  private effectiveSlidesPerView(config: any): number {
    if (!config) return 1;
    if (typeof config.slidesPerView === 'number') return config.slidesPerView;
    if (config.breakpoints) {
      const values = Object.values(config.breakpoints).map((b: any) => (b && b.slidesPerView) ? Number(b.slidesPerView) : NaN).filter(n => !isNaN(n));
      if (values.length) return Math.min(...values);
    }
    return 1;
  }

  // Resolve the native element by section name from ViewChild references
  private getSwiperEl(section: string): any {
    switch (section) {
      case 'ads': return this.adsSwiper?.nativeElement;
      case 'offers': return this.offersSwiper?.nativeElement;
      case 'articles': return this.articlesSwiper?.nativeElement;
      case 'reviews': return this.reviewsSwiper?.nativeElement;
      case 'restaurants': return this.restaurantsSwiper?.nativeElement;
      default: return this.adsSwiper?.nativeElement;
    }
  }

  // Toggle the theme (light/dark) and re-init Swipers after theme change to handle reflow
  toggleTheme() {
    try {
      this.theme.toggle(); // Toggle using ThemeService
      // After toggling theme, re-run initialisation guards in case DOM reflow replaced elements
      setTimeout(() => this.tryInitAll(), 100);
    } catch (err) {
      console.error('HomePage: toggleTheme() failed', err);
    }
  }

  // Set featured image on hover/focus
  setFeatured(url?: string | null) {
    if (url) this.featuredImage = url; // Replace featured image when provided
  }

  // Set language
  setLang(l: 'EN' | 'TC') {
    this.lang.setLang(l); // Switch language using LanguageService
  }
}