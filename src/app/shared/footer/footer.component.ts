// FooterComponent slides up when LayoutService signals showFooter = true
import { Component, OnInit, OnDestroy } from '@angular/core';
import { LayoutService } from '../../services/layout.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-shared-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  standalone: false,
})
export class FooterComponent implements OnInit, OnDestroy {
  // Bind language stream for bilingual links
  lang$ = this.lang.lang$;
  // Local flag used to drive animation class
  isVisible = false;
  // Current year used in template
  currentYear = new Date().getFullYear();
  // Internal references for cleanup
  private scrollElement: HTMLElement | null = null;
  private scrollHandler = this.onScroll.bind(this);
  private lastEmitTime = 0;
  private readonly debounceMs = 80;

  constructor(readonly layout: LayoutService, readonly lang: LanguageService) {
    // Subscribe to layout visibility so component toggles class when service emits
    this.layout.showFooter$.subscribe(visible => this.isVisible = visible);
  }

  // Initialise scroll listener once component is initialised
  async ngOnInit(): Promise<void> {
    try {
      this.scrollElement = await this.findActiveScrollElement();
      if (!this.scrollElement) return;
      // Attach passive scroll listener for performance
      this.scrollElement.addEventListener('scroll', this.scrollHandler, { passive: true });
      // Run an initial evaluation in case page is already at bottom
      this.onScroll();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[FooterComponent] init error', err);
    }
  }

  // Remove scroll listener on destroy
  ngOnDestroy(): void {
    if (this.scrollElement) {
      this.scrollElement.removeEventListener('scroll', this.scrollHandler);
      this.scrollElement = null;
    }
  }

  // Scroll handler: compute whether user is at bottom after footer spacing
  private onScroll(): void {
    try {
      const now = Date.now();
      if ((now - this.lastEmitTime) < this.debounceMs) return; // simple debounce
      this.lastEmitTime = now;

      const el = this.scrollElement;
      if (!el) {
        // If no scroll element, ensure footer hidden
        this.layout.setShowFooter(false);
        return;
      }

      // Read scroll metrics
      const scrollTop = (el as any).scrollTop || 0;
      const clientHeight = el.clientHeight || el.offsetHeight || 0;
      const scrollHeight = el.scrollHeight || clientHeight;

      // Determine footer spacing (read from router outlet CSS var), fallback to 64px
      const outlet = document.querySelector('ion-router-outlet') as HTMLElement | null;
      let footerSpacingPx = 64;
      if (outlet) {
        const computed = getComputedStyle(outlet).getPropertyValue('--footer-spacing') || '';
        // Extract number from values like '64px' or '4rem' conservatively (only px supported here)
        const match = computed.trim().match(/^(-?\d+(?:\.\d+)?)px$/);
        if (match) footerSpacingPx = Number(match[1]);
      }

      // Consider small tolerance to avoid jitter
      const tolerancePx = 8;

      // Decide whether near bottom after accounting for footer spacing
      const atBottom = (scrollTop + clientHeight) >= (scrollHeight - footerSpacingPx - tolerancePx);

      // Notify layout service to show/hide footer
      this.layout.setShowFooter(Boolean(atBottom));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[FooterComponent] onScroll error', err);
    }
  }

  // Try to locate the active ion-content scroll element reliably
  private async findActiveScrollElement(): Promise<HTMLElement | null> {
    try {
      // Prefer the ion-content inside the active page in the router outlet
      const outlet = document.querySelector('ion-router-outlet') as HTMLElement | null;
      if (outlet) {
        const firstPage = outlet.querySelector('ion-page, .ion-page') as HTMLElement | null;
        if (firstPage) {
          const ionContent = firstPage.querySelector('ion-content') as any;
          if (ionContent) {
            if (typeof ionContent.getScrollElement === 'function') {
              return await ionContent.getScrollElement();
            } else if (ionContent instanceof HTMLElement) {
              return ionContent as HTMLElement;
            }
          }
        }
      }

      // Fallback: any ion-content on the page
      const anyIonContent = document.querySelector('ion-content') as any;
      if (anyIonContent) {
        if (typeof anyIonContent.getScrollElement === 'function') {
          return await anyIonContent.getScrollElement();
        } else if (anyIonContent instanceof HTMLElement) {
          return anyIonContent as HTMLElement;
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[FooterComponent] findActiveScrollElement fallback failed', err);
    }
    return null;
  }
}