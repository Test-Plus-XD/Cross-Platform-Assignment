// Import Observable utilities, Angular and Ionic lifecycle APIs and Rx utilities
import { Component, OnInit, AfterViewInit, AfterViewChecked, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Observable, of } from 'rxjs';
import { MockDataService } from '../../services/mock-data.service';
import { LanguageService } from '../../services/language.service';
import { PlatformService } from '../../services/platform.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  // Observables for async data from services
  public offers$: Observable<any[]> = of([]);
  public articles$: Observable<any[]> = of([]);
  public reviews$: Observable<any[]> = of([]);
  public restaurants$: Observable<any[]> = of([]);
  public ads$: Observable<any[]> = of([]);
  // Expose language stream for template
  public lang$ = this.languageService.lang$;
  // Expose platform detection for template
  public isMobile$ = this.platformService.isMobile$;
  // Featured image for offers (optional enhancement)
  public featuredImage: string | null = null;

  constructor(
    private readonly mockDataService: MockDataService,
    private readonly languageService: LanguageService,
    private readonly platformService: PlatformService
  ) { }

  ngOnInit(): void {
    // Load all data from mock service
    // The observables will emit data when available, triggering Angular's change detection
    // which will then render the swiper elements with their slides
    this.loadData();
  }

  // Load all data from the mock data service
  private loadData(): void {
    // Subscribe to each data stream
    // Modern swiper web components work declaratively - they initialise themselves
    // when the DOM is ready, so we don't need manual initialisation logic
    this.offers$ = this.mockDataService.offers$();
    this.articles$ = this.mockDataService.articles$();
    this.reviews$ = this.mockDataService.reviews$();
    this.restaurants$ = this.mockDataService.restaurants$();
    this.ads$ = this.mockDataService.ads$();

    // Optionally set a featured image from the first offer
    this.offers$.subscribe(offers => {
      if (offers && offers.length > 0 && offers[0].image) {
        this.featuredImage = offers[0].image;
      }
    });
  }

  // Open external URL (for ads or promotional links)
  public openUrl(url: string): void {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  // Set featured image when user hovers over or interacts with an offer
  public setFeatured(imageUrl?: string | null): void {
    if (imageUrl) {
      this.featuredImage = imageUrl;
    }
  }
}