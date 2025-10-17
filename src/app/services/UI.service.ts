// UIService controls visibility of menu and bottom tabs and reacts to platform changes
import { Injectable, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';
import { debounceTime, map, startWith } from 'rxjs/operators';
import { PlatformService } from '../services/platform.service';

@Injectable({ providedIn: 'root' })
export class UIService implements OnDestroy {
  // BehaviourSubject whether bottom tabs are shown
  private showTabsSubject = new BehaviorSubject<boolean>(false);
  showTabs$: Observable<boolean> = this.showTabsSubject.asObservable();
  // BehaviourSubject whether header menu is shown
  private showHeaderMenuSubject = new BehaviorSubject<boolean>(true);
  showHeaderMenu$: Observable<boolean> = this.showHeaderMenuSubject.asObservable();
  // BehaviourSubject tracking whether menu is open
  private menuOpenSubject = new BehaviorSubject<boolean>(false);
  menuOpen$: Observable<boolean> = this.menuOpenSubject.asObservable();
  // Subscription for combined listeners
  private subscription: Subscription | null = null;
  // Debounce for router+platform combination to prevent jitter
  private readonly DEBOUNCE_MS = 60;

  constructor(
    private platformService: PlatformService,
    private router: Router,
    private menuController: MenuController
  ) {
    // Combine platform indicator and router url to decide UI pieces
    const platform$ = this.platformService.isMobile$.pipe(startWith(this.platformService.isMobile));
    const route$ = this.router.events.pipe(
      map(evt => (evt instanceof NavigationEnd) ? evt.urlAfterRedirects : this.router.url),
      startWith(this.router.url)
    );

    this.subscription = combineLatest([platform$, route$]).pipe(
      debounceTime(this.DEBOUNCE_MS),
      map(([isMobile, currentUrl]) => {
        // Determine header menu visibility (you may add route exclusions here)
        this.showHeaderMenuSubject.next(true);

        // Determine bottom tabs visibility: show on mobile and if the current route is a root tab route
        if (isMobile) {
          const tabRoutes = ['/home', '/search', '/account']; // adjust to your app routes
          const inTabRoute = tabRoutes.some(route => currentUrl.startsWith(route));
          return inTabRoute;
        }
        return false;
      })
    ).subscribe(show => {
      this.showTabsSubject.next(show);
    });
  }

  // Toggle menu using Ionic MenuController
  async toggleMenu(): Promise<void> {
    try {
      const isOpen = await this.menuController.isOpen();
      if (isOpen) {
        await this.menuController.close();
        this.menuOpenSubject.next(false);
      } else {
        await this.menuController.open();
        this.menuOpenSubject.next(true);
      }
    } catch (error) {
      console.error('UIService.toggleMenu error', error);
    }
  }

  // Open menu programmatically
  async openMenu(): Promise<void> {
    try {
      await this.menuController.open();
      this.menuOpenSubject.next(true);
    } catch (error) {
      console.error('UIService.openMenu error', error);
    }
  }

  // Close menu programmatically
  async closeMenu(): Promise<void> {
    try {
      await this.menuController.close();
      this.menuOpenSubject.next(false);
    } catch (error) {
      console.error('UIService.closeMenu error', error);
    }
  }

  // Clean up
  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }
}