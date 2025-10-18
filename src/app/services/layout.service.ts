// LayoutService centralises footer visibility logic driven by ion-content scroll events
// LayoutService centralises footer visibility logic driven by ion-content scroll events
import { Injectable, NgZone, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  // BehaviourSubject that emits whether footer should be visible
  private showFooterSubject = new BehaviorSubject<boolean>(false);
  // Public observable for footer components to subscribe to
  showFooter$ = this.showFooterSubject.asObservable();
  // Used to manipulate DOM safely
  private renderer: Renderer2;
  // Pixel threshold from bottom to show footer
  private readonly thresholdPx = 75;
  // Small debounce interval to avoid jitter (ms)
  private readonly debounceMs = 50;
  // Last time we emitted a change
  private lastEmitTime = 0;
  // Last boolean value emitted
  private lastEmitValue = false;
  // Cached reference to the current scrollable element inside ion-content
  private cachedScrollElement: HTMLElement | null = null;
  // Class name used for the spacer element appended to the scroll element
  private readonly spacerClass = 'spacer';
  // CSS variable used to size the spacer; default inlined fallback used if not set
  private readonly footerCssVar = '--spacer';
  // CSS variable used to add extra space below the header; default fallback 0px
  private readonly headerCssVar = '--header-spacing';

  constructor(
    private ngZone: NgZone,
    private router: Router,
    private rendererFactory: RendererFactory2
  ) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
    // Listen to router navigation end so we can invalidate cache when route changes
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      // Invalidate cached scroll element when navigation occurs
      this.cachedScrollElement = null;
      // Remove any lingering spacer (route changed, new page may have different structure)
      this.removeFooterSpacing();
      // Schedule a short re-evaluation in case new page is already visible
      setTimeout(() => this.reEvaluateUsingCache(), 120);
    });
    // When footer visibility changes, inject or remove spacing
    this.showFooter$.subscribe(isVisible => {
      if (isVisible) this.injectFooterSpacing().catch(err => console.warn('[LayoutService] inject error', err));
      else this.removeFooterSpacing();
    });
  }

  // Public method pages call on (ionScroll)
  // Forward ev from the template: (ionScroll)="layout.handleScrollEvent($event)"
  async handleScrollEvent(ev: CustomEvent): Promise<void> {
    try {
      // Attempt to read metrics from event.detail if available
      const d: any = ev?.detail ?? {};
      const scrollTopFromDetail: number = Number(d.scrollTop ?? Number.NaN);
      const scrollHeightFromDetail: number = Number(d.scrollHeight ?? Number.NaN);
      const clientHeightFromDetail: number = Number(d.clientHeight ?? Number.NaN);

      // If detail has both scrollHeight and clientHeight, we can calculate directly
      if (!Number.isNaN(scrollTopFromDetail) && !Number.isNaN(scrollHeightFromDetail) && !Number.isNaN(clientHeightFromDetail)) {
        // Debug log to inspect detail payload
        // eslint-disable-next-line no-console
        console.debug('LayoutService: using event.detail metrics', { scrollTopFromDetail, clientHeightFromDetail, scrollHeightFromDetail });
        this.evaluateAndEmit(scrollTopFromDetail, clientHeightFromDetail, scrollHeightFromDetail);
        return;
      }

      // Fallback: use cached scroll element (create if missing)
      const scrollEl = await this.getOrCreateScrollElement(ev);
      if (!scrollEl) {
        // If we cannot get any metrics, bail out safely
        // eslint-disable-next-line no-console
        console.warn('LayoutService: no scroll element available for fallback');
        return;
      }

      // Use actual DOM metrics from the scroll element
      const scrollTop = (scrollEl as any).scrollTop || 0;
      const clientHeight = scrollEl.clientHeight || scrollEl.offsetHeight || 0;
      const scrollHeight = scrollEl.scrollHeight || clientHeight;
      // Debug log to inspect fallback metrics
      // eslint-disable-next-line no-console
      console.debug('LayoutService: using scrollElement metrics', { scrollTop, clientHeight, scrollHeight });
      this.evaluateAndEmit(scrollTop, clientHeight, scrollHeight);

    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('LayoutService.handleScrollEvent error', err);
    }
  }

  // Create a spacer element at the bottom of the scroll element when footer is shown
  private async injectFooterSpacing(): Promise<void> {
    try {
      const scrollEl = await this.getOrCreateScrollElement();
      if (!scrollEl) {
        console.warn('[LayoutService] injectFooterSpacing: no scroll element available');
        return;
      }

      // Prevent duplicate spacer
      if (scrollEl.querySelector(`.${this.spacerClass}`)) return;

      // Create spacer div and style it using a CSS variable so your theme can override it
      const spacer = this.renderer.createElement('div');
      this.renderer.addClass(spacer, this.spacerClass);
      // Mark spacer as presentational
      this.renderer.setAttribute(spacer, 'aria-hidden', 'true');
      // Set a reasonable default height and allow override from CSS variable
      // Use 'height' rather than many <br> elements for robust spacing
      const cssValue = `var(${this.footerCssVar}, 64px)`;
      this.renderer.setStyle(spacer, 'height', cssValue);
      this.renderer.setStyle(spacer, 'minHeight', cssValue);
      this.renderer.setStyle(spacer, 'display', 'block');
      this.renderer.setStyle(spacer, 'pointerEvents', 'none');
      this.renderer.appendChild(scrollEl, spacer);

      // Ensure header spacing is applied to the scroll element as well
      this.applyHeaderSpacing(scrollEl);

      // Debug info
      // eslint-disable-next-line no-console
      console.info('[LayoutService] Added footer spacer to scroll element.');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[LayoutService] injectFooterSpacing error', err);
    }
  }

  // Remove the spacer when the footer hides or when navigating away
  private removeFooterSpacing(): void {
    try {
      const cached = this.cachedScrollElement;
      // Try cached element first, otherwise search document
      const el = cached && document.contains(cached) ? cached : document.querySelector('ion-content') as HTMLElement | null;
      if (!el) return;
      const spacer = el.querySelector(`.${this.spacerClass}`);
      if (spacer) {
        this.renderer.removeChild(el, spacer);
        // eslint-disable-next-line no-console
        console.info('[LayoutService] Removed footer spacer from scroll element.');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[LayoutService] removeFooterSpacing error', err);
    }
  }

  // Internal helper: compute near-bottom and emit with debounce & change guard
  private evaluateAndEmit(scrollTop: number, clientHeight: number, scrollHeight: number): void {
    // Guard invalid metrics
    if (!scrollHeight || !clientHeight) return;

    // Compute whether near bottom
    const isNearBottom = (scrollTop + clientHeight) >= (scrollHeight - this.thresholdPx);

    // Debounce / throttle emissions a bit to avoid rapid toggles
    const now = Date.now();
    if (isNearBottom !== this.lastEmitValue && (now - this.lastEmitTime) > this.debounceMs) {
      this.lastEmitValue = isNearBottom;
      this.lastEmitTime = now;
      // Emit via BehaviourSubject
      this.showFooterSubject.next(isNearBottom);
      // Debug emit log
      // eslint-disable-next-line no-console
      console.debug('LayoutService: showFooter =>', isNearBottom, { scrollTop, clientHeight, scrollHeight });
    }
  }

  // Try to obtain or reuse a cached scroll element (the inner element returned by ion-content.getScrollElement())
  // This function caches the element for subsequent fast access
  private async getOrCreateScrollElement(ev?: CustomEvent): Promise<HTMLElement | null> {
    // If cached and still in DOM, return it
    if (this.cachedScrollElement && document.contains(this.cachedScrollElement)) {
      // Ensure header spacing is applied to cached element
      this.applyHeaderSpacing(this.cachedScrollElement);
      return this.cachedScrollElement;
    }

    try {
      // Strategy: try to find the active ion-content within the router outlet first
      let ionContent: any = null;

      // If the event has a composed path, search it for ion-content first (handles shadow DOM)
      if (ev && typeof (ev as any).composedPath === 'function') {
        const path = (ev as any).composedPath();
        for (const node of path) {
          if (node && (node as HTMLElement).tagName && (node as HTMLElement).tagName.toLowerCase() === 'ion-content') {
            ionContent = node;
            break;
          }
        }
      }

      // If the event target exists and is inside an ion-content, prefer that
      const tgt = ev?.target as HTMLElement | null;
      if (!ionContent && tgt) {
        ionContent = this.findClosestIonContent(tgt);
      }

      // Fallback: query for the first ion-content inside active ion-page in the router outlet
      if (!ionContent) {
        const outlet = document.querySelector('ion-router-outlet') as HTMLElement | null;
        if (outlet) {
          const firstPage = outlet.querySelector('ion-page, .ion-page') as HTMLElement | null;
          if (firstPage) ionContent = firstPage.querySelector('ion-content');
        }
      }

      // Last resort: any ion-content in the document
      if (!ionContent) {
        ionContent = document.querySelector('ion-content');
      }

      if (ionContent && typeof ionContent.getScrollElement === 'function') {
        // Await the internal scroll element
        const scrollElem: HTMLElement = await ionContent.getScrollElement();
        if (scrollElem) {
          this.cachedScrollElement = scrollElem;
          // Apply header spacing so user CSS variable --header-spacing is respected
          this.applyHeaderSpacing(scrollElem);
          return scrollElem;
        }
      }

      // If we cannot obtain the ionic internal scroll element, try to use the ion-content element itself as fallback
      if (ionContent && ionContent instanceof HTMLElement) {
        this.cachedScrollElement = ionContent as HTMLElement;
        // Apply header spacing so user CSS variable --header-spacing is respected
        this.applyHeaderSpacing(ionContent as HTMLElement);
        return ionContent as HTMLElement;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('LayoutService.getOrCreateScrollElement fallback failed', err);
    }

    // Final fallback: null
    return null;
  }

  // Helper: walk up from startElement to find the closest ancestor ion-content element
  private findClosestIonContent(startElement: HTMLElement): HTMLElement | null {
    let el: HTMLElement | null = startElement;
    while (el) {
      if (el.tagName && el.tagName.toLowerCase() === 'ion-content') return el;
      el = el.parentElement;
    }
    return null;
  }

  // Re-evaluate using cached scroll element (used after navigation)
  private async reEvaluateUsingCache(): Promise<void> {
    const scrollEl = await this.getOrCreateScrollElement();
    if (!scrollEl) return;
    const scrollTop = (scrollEl as any).scrollTop || 0;
    const clientHeight = scrollEl.clientHeight || scrollEl.offsetHeight || 0;
    const scrollHeight = scrollEl.scrollHeight || clientHeight;
    this.evaluateAndEmit(scrollTop, clientHeight, scrollHeight);
  }

  // Apply header spacing to the scroll element using CSS variable so theme can override it
  private applyHeaderSpacing(scrollEl: HTMLElement): void {
    try {
      // Set padding-top to the CSS variable --header-spacing with a 0px fallback
      const cssValue = `var(${this.headerCssVar}, 0px)`;
      this.renderer.setStyle(scrollEl, 'paddingTop', cssValue);
      // Ensure box-sizing includes padding so layout calculations remain consistent
      this.renderer.setStyle(scrollEl, 'boxSizing', 'border-box');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[LayoutService] applyHeaderSpacing error', err);
    }
  }
}