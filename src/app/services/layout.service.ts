// LayoutService centralises simple header/footer spacing and footer visibility
import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  // BehaviourSubject that emits whether footer should be visible
  private showFooterSubject = new BehaviorSubject<boolean>(false);
  // Public observable for footer components to subscribe to
  showFooter$ = this.showFooterSubject.asObservable();
  // Renderer used to update styles on the router outlet
  private renderer: Renderer2;
  constructor(private rendererFactory: RendererFactory2) {
    this.renderer = this.rendererFactory.createRenderer(null, null);
  }
  // Set the --header-spacing CSS variable on ion-router-outlet
  setHeaderSpacing(value: string): void {
    const outlet = document.querySelector('ion-router-outlet') as HTMLElement | null;
    if (!outlet) return;
    this.renderer.setStyle(outlet, '--header-spacing', value);
  }
  // Set the --footer-spacing CSS variable on ion-router-outlet
  setFooterSpacing(value: string): void {
    const outlet = document.querySelector('ion-router-outlet') as HTMLElement | null;
    if (!outlet) return;
    this.renderer.setStyle(outlet, '--footer-spacing', value);
  }
  // Show or hide the footer and emit the state to subscribers
  setShowFooter(visible: boolean): void {
    this.showFooterSubject.next(visible);
  }
}