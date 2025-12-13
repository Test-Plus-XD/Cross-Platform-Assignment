// Import Observable utilities, Angular and Ionic lifecycle APIs and Rx utilities
import { Component, OnInit, AfterViewInit, AfterViewChecked, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { MockDataService } from '../../services/mock-data.service';
import { LanguageService } from '../../services/language.service';
import { PlatformService } from '../../services/platform.service';
import { ReviewsService, Review } from '../../services/reviews.service';

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
    private readonly platformService: PlatformService,
    private readonly reviewsService: ReviewsService
  ) { }

  ngOnInit(): void {
    // Load all data from mock service
    // The observables will emit data when available, triggering Angular's change detection
    // which will then render the swiper elements with their slides
    this.loadData();
  }

  // Load all data from the mock data service and genuine reviews from Firestore
  private loadData(): void {
    // Subscribe to each data stream
    // Modern swiper web components work declaratively - they initialise themselves
    // when the DOM is ready, so we don't need manual initialisation logic
    this.offers$ = this.mockDataService.offers$();
    this.articles$ = this.mockDataService.articles$();
    this.restaurants$ = this.mockDataService.restaurants$();
    this.ads$ = this.mockDataService.ads$();

    // Load genuine reviews from Firestore, supplemented with mock reviews if needed
    this.reviews$ = this.loadReviews();

    // Optionally set a featured image from the first offer
    this.offers$.subscribe(offers => {
      if (offers && offers.length > 0 && offers[0].image) {
        this.featuredImage = offers[0].image;
      }
    });
  }

  /**
   * Load reviews: fetch up to 10 genuine reviews from Firestore,
   * and supplement with mock reviews if there aren't enough
   */
  private loadReviews(): Observable<any[]> {
    return forkJoin({
      genuine: this.reviewsService.getReviews().pipe(
        catchError(error => {
          console.error('Failed to load genuine reviews:', error);
          return of([] as Review[]);
        })
      ),
      mock: this.mockDataService.reviews$()
    }).pipe(
      map(({ genuine, mock }) => {
        // Convert genuine reviews to display format matching mock reviews
        const genuineFormatted = genuine.slice(0, 10).map((review: Review) => ({
          id: review.id,
          name: review.userDisplayName || 'Anonymous User',
          avatar: review.userPhotoURL || 'assets/icon/Placeholder.png',
          meta: this.formatReviewMeta(review),
          text: review.comment || '',
          rating: review.rating,
          imageUrl: review.imageUrl || null  // Include review image
        }));

        // If we have enough genuine reviews, use only genuine reviews
        if (genuineFormatted.length >= 10) {
          return genuineFormatted;
        }

        // Otherwise, supplement with mock reviews to reach at least 10 reviews
        const supplementCount = Math.max(0, 10 - genuineFormatted.length);
        const mockSupplement = mock.slice(0, supplementCount);

        return [...genuineFormatted, ...mockSupplement];
      })
    );
  }

  /**
   * Format review metadata line (restaurant name + time ago)
   */
  private formatReviewMeta(review: Review): string {
    // For now, just show the date
    // In a production app, you might fetch restaurant name and calculate "X days ago"
    const date = new Date(review.dateTime);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    let timeAgo = '';
    if (diffDays === 0) {
      timeAgo = 'today';
    } else if (diffDays === 1) {
      timeAgo = 'yesterday';
    } else if (diffDays < 7) {
      timeAgo = `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      timeAgo = weeks === 1 ? 'last week' : `${weeks} weeks ago`;
    } else {
      const months = Math.floor(diffDays / 30);
      timeAgo = months === 1 ? 'last month' : `${months} months ago`;
    }

    return timeAgo;
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