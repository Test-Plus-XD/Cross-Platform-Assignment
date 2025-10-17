// Service to detect platform with Capacitor, client-hints, touch and viewport heuristics
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, fromEvent, merge, Observable, of, Subscription } from 'rxjs';
import { debounceTime, map, startWith, distinctUntilChanged } from 'rxjs/operators';
import { Capacitor } from '@capacitor/core';

export type PlatformType = 'mobile' | 'web' | 'web-dev';

// Configuration for the PlatformService detection logic
// Allows enabling/disabling specific detection strategies
export interface PlatformServiceConfig {
  useCapacitor?: boolean;
  useIonic?: boolean;
  useUserAgent?: boolean;
  useTouch?: boolean;
  useScreenOrientation?: boolean; // If true, emits 'mobile' when height > width
}

@Injectable({ providedIn: 'root' })
export class PlatformService implements OnDestroy {
  // BehaviorSubject to hold current platform state
  private platformSubject = new BehaviorSubject<PlatformType>('web');

  // Observable that emits platform changes, distinctUntilChanged prevents repeated emissions
  platform$: Observable<PlatformType> = this.platformSubject.asObservable().pipe(distinctUntilChanged());

  // Observable boolean for convenience, true if current platform is 'mobile'
  isMobile$: Observable<boolean> = this.platform$.pipe(map(p => p === 'mobile'));

  private subscription: Subscription | null = null; // Subscription for resize/orientation events
  private readonly RESIZE_DEBOUNCE_MS = 150; // Debounce delay for resize/orientation events
  private readonly FORCE_KEY = 'forcePlatform'; // LocalStorage key to force a platform
  private readonly CURRENT_PLATFORM_KEY = 'platform'; // LocalStorage key for current detected platform

  // Default configuration, can be overridden in init()
  private _config: PlatformServiceConfig = {
    useCapacitor: true,
    useIonic: true,
    useUserAgent: true,
    useTouch: true,
    useScreenOrientation: false, // Avoid classifying tall desktop windows as mobile
  };

  constructor() { }

  // Initialises the service. Call once in AppComponent.ngOnInit().
  // @param config Optional configuration to override default detection strategies.
  init(config: Partial<PlatformServiceConfig> = {}): void {
    // Merge default config with user-provided config
    this._config = { ...this._config, ...config };

    // Perform the *first* real detection now that the service is constructed and configured.
    const initialPlatform = this.readPersistedPlatform() ?? this.detectPlatformDecision();
    this.platformSubject.next(initialPlatform);
    this.saveCurrentPlatform(initialPlatform); // Persist the initial decision

    // Set up listeners for dynamic changes (e.g., resizing the window)
    const resize$ = fromEvent(window, 'resize').pipe(map(() => this.detectPlatformDecision()));
    const orientation$ = fromEvent(window, 'orientationchange').pipe(map(() => this.detectPlatformDecision()));

    const merged$ = merge(resize$, orientation$).pipe(
      // No need for startWith since we already set the initial value above
      debounceTime(this.RESIZE_DEBOUNCE_MS)
    );

    this.subscription = merged$.subscribe(decision => {
      if (decision !== this.platformSubject.getValue()) {
        this.platformSubject.next(decision);
        this.saveCurrentPlatform(decision);
      }
    });
  }

  // Getter for current platform value
  get platform(): PlatformType {
    return this.platformSubject.getValue();
  }

  // Getter boolean convenience property for mobile check
  get isMobile(): boolean {
    return this.platform === 'mobile';
  }

  // Allows forcing a platform manually, persists in localStorage
  setForcePlatform(force: PlatformType | null): void {
    try {
      if (force) {
        localStorage.setItem(this.FORCE_KEY, force); // Persist forced platform
      } else {
        localStorage.removeItem(this.FORCE_KEY); // Clear forced platform
      }
      localStorage.removeItem(this.CURRENT_PLATFORM_KEY); // Clear current platform to allow fresh detection
    } catch (e) {
      console.error('Failed to access localStorage', e); // Handle errors gracefully
    }
    const decision = this.detectPlatformDecision(); // Recalculate platform
    this.platformSubject.next(decision); // Update observable
    this.saveCurrentPlatform(decision); // Persist new platform
  }

  // Reads forced platform from URL query parameter or localStorage
  private readForceFromUrlOrStorage(): PlatformType | null {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlForce = urlParams.get('forcePlatform') as PlatformType;
      if (['mobile', 'web', 'web-dev'].includes(urlForce)) return urlForce;

      const stored = localStorage.getItem(this.FORCE_KEY) as PlatformType;
      if (['mobile', 'web', 'web-dev'].includes(stored)) return stored;
    } catch { /* ignore errors */ }
    return null;
  }

  // Reads the last detected platform from localStorage
  private readPersistedPlatform(): PlatformType | null {
    try {
      const stored = localStorage.getItem(this.CURRENT_PLATFORM_KEY) as PlatformType;
      if (['mobile', 'web', 'web-dev'].includes(stored)) return stored;
    } catch { /* ignore errors */ }
    return null;
  }

  // Saves current detected platform to localStorage
  private saveCurrentPlatform(platform: PlatformType): void {
    try {
      localStorage.setItem(this.CURRENT_PLATFORM_KEY, platform);
    } catch { /* ignore errors */ }
  }

  // Determines the platform to use, taking forced platforms into account
  private detectPlatformDecision(): PlatformType {
    const forced = this.readForceFromUrlOrStorage();
    if (forced) return forced; // Return forced platform if present

    // Perform fresh detection for natural platform
    let naturalDecision = this.naturalPlatformDecision();

    // Adjust for development mode
    if (naturalDecision === 'web' && this.isDevMode()) {
      naturalDecision = 'web-dev';
    }

    // Persist detected platform
    this.saveCurrentPlatform(naturalDecision);
    return naturalDecision;
  }

  // Detect if running in development environment
  private isDevMode(): boolean {
    try {
      const { hostname, port } = window.location;
      return hostname === 'localhost' || hostname === '127.0.0.1' || port === '4200' || port === '8100';
    } catch {
      return false;
    }
  }

  // Computes natural platform based on configured detection strategies
  private naturalPlatformDecision(): PlatformType {
    // Priority 1: Native container detection (Capacitor, Ionic)
    if (this._config.useCapacitor) {
      const capacitorDecision = this.capacitorPlatform();
      if (capacitorDecision === 'mobile') return 'mobile';
    }
    if (this._config.useIonic) {
      const ionicDecision = this.ionicPlatform();
      if (ionicDecision === 'mobile') return 'mobile';
    }

    // Priority 2: Browser-based feature detection
    return this.browserBasedDetect();
  }

  // Detect platform using Capacitor global object
  private capacitorPlatform(): PlatformType | null {
    try {
      if (Capacitor?.isNativePlatform()) {
        return 'mobile'; // Native app detected
      }
      if (Capacitor?.getPlatform() !== 'web') {
        return 'mobile'; // Any non-web Capacitor platform is considered mobile
      }
    } catch { /* ignore errors */ }
    return null;
  }

  // Detect if running in Ionic environment by checking for Ionic-specific CSS classes
  private ionicPlatform(): PlatformType | null {
    try {
      const isIonic = document.documentElement.classList.contains('ion-page'); // Ionic adds 'ion-page' class
      if (isIonic) return 'mobile';
    } catch { /* ignore errors */ }
    return null;
  }

  // Fallback detection for standard web browsers using feature detection
  private browserBasedDetect(): PlatformType {
    try {
      const uaData = (navigator as any).userAgentData;

      // Modern User-Agent Client Hints
      if (uaData?.mobile) return 'mobile';

      // Fallback: User-Agent string detection
      if (this._config.useUserAgent) {
        const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
        if (/android|iphone|ipad|ipod|windows phone|mobile/i.test(userAgent)) return 'mobile';
      }

      // Touch capability detection
      if (this._config.useTouch) {
        const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        if (hasTouch && window.innerWidth < 1024) return 'mobile'; // Combine touch + viewport width
      }

      // Screen orientation detection (height > width)
      if (this._config.useScreenOrientation) {
        if (window.innerHeight > window.innerWidth) return 'mobile';
      }

      return 'web'; // Default to web if no mobile conditions met
    } catch {
      return 'web'; // Fallback to web on error
    }
  }

  // Clean up subscriptions on service destroy
  ngOnDestroy(): void {
    this.subscription?.unsubscribe(); // Prevent memory leaks
  }
}