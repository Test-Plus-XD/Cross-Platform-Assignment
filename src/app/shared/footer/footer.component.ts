// Presentational SharedFooter that slides up when LayoutService signals showFooter = true
import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { LayoutService } from '../../services/layout.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-shared-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  standalone: false,
})
export class FooterComponent implements OnDestroy {
  readonly footerFixed = false;
  currentYear = new Date().getFullYear();
  // Bind language stream for bilingual links
  lang$ = this.lang.lang$;
  // Local flag used to drive animation class
  isVisible = false;
  private subscription: Subscription;
  constructor(readonly layout: LayoutService, readonly lang: LanguageService) {
    // Subscribe to layout service to toggle visibility
    this.subscription = this.layout.showFooter$.subscribe(v => this.isVisible = v);
  }

  // Clean up subscription on destroy
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}