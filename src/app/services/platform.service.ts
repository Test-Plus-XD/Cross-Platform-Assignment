// Service to detect platform with Capacitor, client-hints, touch and viewport heuristics
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, fromEvent, merge, Observable, Subscription } from 'rxjs';
import { debounceTime, map, distinctUntilChanged } from 'rxjs/operators';
import { Capacitor } from '@capacitor/core';

export type PlatformType = 'mobile' | 'web' | 'web-dev';

export interface PlatformServiceConfig {
  useCapacitor?: boolean;
  useIonic?: boolean;
  useUserAgent?: boolean;
  useTouch?: boolean;
  useScreenOrientation?: boolean;
}

@Injectable({ providedIn: 'root' })
export class PlatformService implements OnDestroy {
  // Seed with synchronous early check so pages render correctly before init() runs.
  // On Android Capacitor, earlyMobileCheck() returns true immediately.
  private platformSubject = new BehaviorSubject<PlatformType>(
    PlatformService.earlyMobileCheck() ? 'mobile' : 'web'
  );

  private static earlyMobileCheck(): boolean {
    try {
      if (typeof Capacitor !== 'undefined' && Capacitor?.isNativePlatform?.()) return true;
      if (/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)) return true;
    } catch { /* swallow */ }
    return false;
  }

  platform$: Observable<PlatformType> = this.platformSubject.asObservable().pipe(distinctUntilChanged());
  isMobile$: Observable<boolean> = this.platform$.pipe(map(p => p === 'mobile'));

  private subscription: Subscription | null = null;
  private readonly RESIZE_DEBOUNCE_MS = 150;

  private _config: PlatformServiceConfig = {
    useCapacitor: true,
    useIonic: true,
    useUserAgent: true,
    useTouch: true,
    useScreenOrientation: false,
  };

  constructor() { }

  init(config: Partial<PlatformServiceConfig> = {}): void {
    this._config = { ...this._config, ...config };

    // Re-detect now that DI is fully wired (no localStorage — avoids stale 'web' on Android)
    const initialPlatform = this.detectPlatformDecision();
    this.platformSubject.next(initialPlatform);

    const resize$ = fromEvent(window, 'resize').pipe(map(() => this.detectPlatformDecision()));
    const orientation$ = fromEvent(window, 'orientationchange').pipe(map(() => this.detectPlatformDecision()));

    this.subscription = merge(resize$, orientation$).pipe(
      debounceTime(this.RESIZE_DEBOUNCE_MS)
    ).subscribe(decision => {
      if (decision !== this.platformSubject.getValue()) {
        this.platformSubject.next(decision);
      }
    });
  }

  get platform(): PlatformType {
    return this.platformSubject.getValue();
  }

  get isMobile(): boolean {
    return this.platform === 'mobile';
  }

  setForcePlatform(force: PlatformType | null): void {
    try {
      if (force) {
        localStorage.setItem('forcePlatform', force);
      } else {
        localStorage.removeItem('forcePlatform');
      }
    } catch { /* ignore */ }
    this.platformSubject.next(this.detectPlatformDecision());
  }

  private readForceFromUrlOrStorage(): PlatformType | null {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlForce = urlParams.get('forcePlatform') as PlatformType;
      if (['mobile', 'web', 'web-dev'].includes(urlForce)) return urlForce;
      const stored = localStorage.getItem('forcePlatform') as PlatformType;
      if (['mobile', 'web', 'web-dev'].includes(stored)) return stored;
    } catch { /* ignore */ }
    return null;
  }

  private detectPlatformDecision(): PlatformType {
    const forced = this.readForceFromUrlOrStorage();
    if (forced) return forced;
    let natural = this.naturalPlatformDecision();
    if (natural === 'web' && this.isDevMode()) natural = 'web-dev';
    return natural;
  }

  private isDevMode(): boolean {
    try {
      const { hostname, port } = window.location;
      return hostname === 'localhost' || hostname === '127.0.0.1' || port === '4200' || port === '8100';
    } catch { return false; }
  }

  private naturalPlatformDecision(): PlatformType {
    if (this._config.useCapacitor && this.capacitorPlatform() === 'mobile') return 'mobile';
    if (this._config.useIonic && this.ionicPlatform() === 'mobile') return 'mobile';
    return this.browserBasedDetect();
  }

  private capacitorPlatform(): PlatformType | null {
    try {
      if (Capacitor?.isNativePlatform()) return 'mobile';
      if (Capacitor?.getPlatform() !== 'web') return 'mobile';
    } catch { /* ignore */ }
    return null;
  }

  private ionicPlatform(): PlatformType | null {
    try {
      if (document.documentElement.classList.contains('ion-page')) return 'mobile';
    } catch { /* ignore */ }
    return null;
  }

  private browserBasedDetect(): PlatformType {
    try {
      const uaData = (navigator as any).userAgentData;
      if (uaData?.mobile) return 'mobile';
      if (this._config.useUserAgent) {
        if (/android|iphone|ipad|ipod|windows phone|mobile/i.test(navigator.userAgent)) return 'mobile';
      }
      if (this._config.useTouch) {
        if (('ontouchstart' in window || navigator.maxTouchPoints > 0) && window.innerWidth < 1024) return 'mobile';
      }
      if (this._config.useScreenOrientation && window.innerHeight > window.innerWidth) return 'mobile';
      return 'web';
    } catch { return 'web'; }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
