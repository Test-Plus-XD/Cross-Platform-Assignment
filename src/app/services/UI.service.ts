// UIService controls menu and platform-only tab visibility; route logic belongs in components
import { Injectable, OnDestroy } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { startWith } from 'rxjs/operators';
import { PlatformService } from '../services/platform.service';

@Injectable({ providedIn: 'root' })
export class UIService implements OnDestroy {
  // BehaviourSubject whether bottom tabs should be shown because device is mobile
  private showTabsSubject = new BehaviorSubject<boolean>(false);
  showTabs$: Observable<boolean> = this.showTabsSubject.asObservable();
  // BehaviourSubject whether header menu should be shown (default true)
  private showHeaderMenuSubject = new BehaviorSubject<boolean>(true);
  showHeaderMenu$: Observable<boolean> = this.showHeaderMenuSubject.asObservable();
  // BehaviourSubject tracking whether menu is open
  private menuOpenSubject = new BehaviorSubject<boolean>(false);
  menuOpen$: Observable<boolean> = this.menuOpenSubject.asObservable();
  // Subscription for platform listener created in init()
  private subscription: Subscription | null = null;

  constructor(
    private platform: PlatformService,
    private menu: MenuController
  ) {
    // Constructor intentionally lightweight; call init() from AppComponent.ngOnInit()
  }

  // Initialise the UI service; start listening to platform changes
  init(): void {
    // If already initialised, do nothing
    if (this.subscription) return;

    // Use platform.isMobile$ and seed with synchronous value to avoid flicker
    const platformObservable = this.platform.isMobile$.pipe(startWith(this.platform.isMobile));

    // Subscribe and update showTabsSubject based solely on platform (mobile => true)
    this.subscription = platformObservable.subscribe(isMobile => {
      // Set tabs visibility purely on platform; components decide route-specific rendering
      this.showTabsSubject.next(Boolean(isMobile));
      // Keep header menu visible by default; components can subscribe and hide items internally
      this.showHeaderMenuSubject.next(true);
    });
  }

  // Stop the UI service; tear down listeners (useful for tests)
  stop(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    // Reset to defaults
    this.showTabsSubject.next(false);
    this.showHeaderMenuSubject.next(true);
    this.menuOpenSubject.next(false);
  }

  // Toggle menu using Ionic MenuController
  async toggleMenu(): Promise<void> {
    try {
      const isOpen = await this.menu.isOpen();
      if (isOpen) {
        await this.menu.close();
        this.menuOpenSubject.next(false);
      } else {
        await this.menu.open();
        this.menuOpenSubject.next(true);
      }
      console.debug('UIService showTabs set =>', isOpen);
    } catch (error) {
      console.error('UIService.toggleMenu error', error);
    }
  }

  // Open menu programmatically
  async openMenu(): Promise<void> {
    try {
      await this.menu.open();
      this.menuOpenSubject.next(true);
    } catch (error) {
      console.error('UIService.openMenu error', error);
    }
  }

  // Close menu programmatically
  async closeMenu(): Promise<void> {
    try {
      await this.menu.close();
      this.menuOpenSubject.next(false);
    } catch (error) {
      console.error('UIService.closeMenu error', error);
    }
  }

  // Clean up when Angular destroys the service (good hygiene)
  ngOnDestroy(): void {
    this.stop();
  }
}