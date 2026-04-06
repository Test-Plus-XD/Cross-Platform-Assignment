// Import Observable utilities, Angular and Ionic lifecycle APIs and Rx utilities
import { Component, OnInit, AfterViewInit, AfterViewChecked, ViewChild, ElementRef, OnDestroy, inject } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { Observable, of, forkJoin, BehaviorSubject, combineLatest } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { MockDataService } from '../../services/mock-data.service';
import { LanguageService } from '../../services/language.service';
import { PlatformService } from '../../services/platform.service';
import { ReviewsService, Review } from '../../services/reviews.service';
import { LocationService, Coordinates } from '../../services/location.service';
import { RestaurantsService, Restaurant } from '../../services/restaurants.service';
import { AdvertisementsService, Advertisement } from '../../services/advertisements.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  private readonly mockDataService = inject(MockDataService);
  private readonly languageService = inject(LanguageService);
  private readonly platformService = inject(PlatformService);
  private readonly reviewsService = inject(ReviewsService);
  private readonly router = inject(Router);
  private readonly locationService = inject(LocationService);
  private readonly restaurantsService = inject(RestaurantsService);
  private readonly advertisementsService = inject(AdvertisementsService);

  // Observables for async data from services
  public offers$: Observable<any[]> = of([]);
  public articles$: Observable<any[]> = of([]);
  public reviews$: Observable<any[]> = of([]);
  public restaurants$: Observable<any[]> = of([]);
  public ads$: Observable<any[]> = of([]);
  public nearby$: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);
  // Expose language stream for template
  public lang$ = this.languageService.lang$;
  // Expose platform detection for template
  public isMobile$ = this.platformService.isMobile$;
  // Featured image for offers (optional enhancement)
  public featuredImage: string | null = null;
  // Nearby restaurants loading state
  public isLoadingNearby = false;
  public locationError: string | null = null;
  // Placeholder image path
  public readonly placeholderImage = environment.placeholderImageUrl || 'assets/icon/Placeholder.png';
  // Rating stats for restaurant cards (keyed by restaurant ID)
  public ratingMap: Record<string, { totalReviews: number; averageRating: number }> = {};
  // Internal ID lists used to merge into a single getBatchStats call
  private trendingIds$ = new BehaviorSubject<string[]>([]);
  private nearbyIds$ = new BehaviorSubject<string[]>([]);

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() { }

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
    this.offers$ = this.loadOffers();
    this.articles$ = this.mockDataService.articles$();
    this.restaurants$ = this.mockDataService.restaurants$();
    this.ads$ = this.mockDataService.ads$();

    // Collect trending restaurant IDs for the merged getBatchStats call
    this.restaurants$.subscribe(restaurants => {
      const ids = restaurants.map((r: any) => r.id).filter(Boolean);
      this.trendingIds$.next(ids);
    });

    // Wire up a single getBatchStats call once both ID lists are available
    combineLatest([this.trendingIds$, this.nearbyIds$]).subscribe(([trendingIds, nearbyIds]) => {
      const allIds = [...new Set([...trendingIds, ...nearbyIds])];
      if (allIds.length > 0) {
        this.reviewsService.getBatchStats(allIds).subscribe({
          next: statsMap => { this.ratingMap = statsMap; },
          error: err => console.warn('HomePage: Failed to load ratings', err)
        });
      }
    });

    // Load genuine reviews from Firestore, supplemented with mock reviews if needed
    this.reviews$ = this.loadReviews();

    // Load nearby restaurants from API with GPS sorting
    this.loadNearbyRestaurants();

    // Optionally set a featured image from the first offer
    this.offers$.subscribe(offers => {
      if (offers && offers.length > 0) {
        const first = offers[0];
        this.featuredImage = first.image_EN || first.image_TC || first.image || null;
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
          restaurantId: review.restaurantId,  // Include for navigation
          name: review.userDisplayName || 'Anonymous User',
          avatar: review.userPhotoURL || this.placeholderImage,
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

  // Load featured offers: real Firestore advertisements + mock offers as supplement
  private loadOffers(): Observable<any[]> {
    return forkJoin({
      ads: this.advertisementsService.getAdvertisements().pipe(catchError(() => of([] as Advertisement[]))),
      mock: this.mockDataService.offers$()
    }).pipe(
      map(({ ads, mock }) => {
        const realOffers = ads.map((ad: Advertisement) => ({
          id: ad.id,
          title_EN: ad.Title_EN,
          title_TC: ad.Title_TC,
          content_EN: ad.Content_EN,
          content_TC: ad.Content_TC,
          image_EN: ad.Image_EN,
          image_TC: ad.Image_TC,
          restaurantId: ad.restaurantId,
          isReal: true
        }));
        const mockOffers = mock.map((o: any) => ({ ...o, isReal: false, restaurantId: null }));
        return [...realOffers, ...mockOffers];
      })
    );
  }

  // Navigate to restaurant page when an offer card is clicked
  public navigateToOffer(offer: any): void {
    if (offer.restaurantId) {
      this.router.navigate(['/restaurant', offer.restaurantId]);
    }
  }

  // Navigate to restaurant review section when review is clicked
  public navigateToReview(review: any): void {
    if (review.restaurantId) {
      this.router.navigate(['/restaurant', review.restaurantId], { queryParams: { tab: 'review' } });
    }
  }

  // Navigate to restaurant detail page
  public navigateToRestaurant(restaurant: any): void {
    const restaurantId = restaurant.id;
    if (restaurantId) {
      this.router.navigate(['/restaurant', restaurantId]);
    }
  }

  // Load nearby restaurants from API and sort by GPS distance
  private async loadNearbyRestaurants(): Promise<void> {
    this.isLoadingNearby = true;
    this.locationError = null;

    try {
      // Step 1: Get current location (request permission if needed)
      const location = await this.locationService.getCurrentLocation(true).toPromise();

      if (!location) {
        throw new Error('Location not available');
      }

      // Step 2: Fetch all restaurants from Vercel API via RestaurantsService
      const allRestaurants = await this.restaurantsService.getRestaurants().toPromise() || [];

      // Step 3: Filter restaurants with valid coordinates
      const restaurantsWithCoords = allRestaurants.filter(r =>
        r.Latitude != null && r.Longitude != null
      );

      // Step 4: Sort by distance from current location
      const sorted = this.locationService.sortByDistance(restaurantsWithCoords);

      // Step 5: Take first 10 closest restaurants
      const nearbySlice = sorted.slice(0, 10);
      this.nearby$.next(nearbySlice);
      this.isLoadingNearby = false;

      // Push nearby IDs into the shared stream — the combineLatest in loadData
      // will fire getBatchStats exactly once with the merged deduplicated ID set
      const nearbyIds = nearbySlice.map((r: any) => r.id).filter(Boolean);
      this.nearbyIds$.next(nearbyIds);
    } catch (error) {
      console.error('Error loading nearby restaurants:', error);
      this.locationError = 'Unable to load nearby restaurants';
      this.isLoadingNearby = false;
      this.nearby$.next([]);
    }
  }

  // Get distance badge with color-coded indicator
  public getDistanceBadge(restaurant: any): { text: string; color: string } | null {
    if (!restaurant.Latitude || !restaurant.Longitude) return null;

    const result = this.locationService.calculateDistanceFromCurrentLocation(
      restaurant.Latitude,
      restaurant.Longitude
    );

    if (!result) return null;

    // Match Flutter app's color logic:
    // < 500m = green, 500m-2km = orange, > 2km = grey
    let color = 'medium'; // grey
    if (result.distanceMeters < 500) {
      color = 'success'; // green
    } else if (result.distanceKm < 2) {
      color = 'warning'; // orange
    }

    return { text: result.displayText, color };
  }

  // Refresh location and reload nearby restaurants
  public async refreshLocation(): Promise<void> {
    await this.loadNearbyRestaurants();
  }

  // Format average rating as star string for display
  // Rounds to nearest 0.5: e.g. 3.7 → ★★★½☆, 3.3 → ★★★½☆, 4.2 → ★★★★☆
  public formatRatingStars(rating: number): string {
    const rounded = Math.round(rating * 2) / 2;
    const fullStars = Math.floor(rounded);
    const hasHalfStar = rounded - fullStars > 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    return '★'.repeat(fullStars) + (hasHalfStar ? '½' : '') + '☆'.repeat(emptyStars);
  }

  // Get display keywords for a restaurant (limited to 2)
  public getDisplayKeywords(restaurant: any, lang: string): string[] {
    const keywords = lang === 'TC' ? restaurant.Keyword_TC : restaurant.Keyword_EN;
    if (!keywords || keywords.length === 0) return [];
    return keywords.slice(0, 2);
  }

  // Get total keyword count for a restaurant
  public getKeywordCount(restaurant: any, lang: string): number {
    const keywords = lang === 'TC' ? restaurant.Keyword_TC : restaurant.Keyword_EN;
    return keywords ? keywords.length : 0;
  }

  // Check if a restaurant is currently open based on Opening_Hours and HK time.
  // Mirrors the identical method in search.page.ts — kept as a local copy to
  // avoid circular service dependencies.
  public getOpeningStatus(restaurant: any): 'open' | 'closed' | 'unknown' {
    if (!restaurant?.Opening_Hours) return 'unknown';

    const now = new Date();
    // Extract HK weekday and time parts using Intl (avoids manual UTC offset maths)
    const hkDay = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Hong_Kong', weekday: 'long'
    }).format(now);
    const hkTimeParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Hong_Kong', hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(now);
    const hkH = parseInt(hkTimeParts.find(p => p.type === 'hour')?.value || '0', 10);
    const hkM = parseInt(hkTimeParts.find(p => p.type === 'minute')?.value || '0', 10);
    const currentMins = hkH * 60 + hkM;

    const hours = restaurant.Opening_Hours;
    const todayKey = Object.keys(hours).find(k => k.toLowerCase() === hkDay.toLowerCase());
    if (!todayKey) return 'unknown';

    const entry = hours[todayKey];
    if (!entry) return 'closed';

    let openStr: string;
    let closeStr: string;

    if (typeof entry === 'string') {
      // Supports "HH:MM-HH:MM", "HH:MM–HH:MM", "HH:MM~HH:MM"
      const match = entry.match(/(\d{1,2}:\d{2})\s*[-–~]\s*(\d{1,2}:\d{2})/);
      if (!match) return 'unknown';
      openStr = match[1];
      closeStr = match[2];
    } else if (typeof entry === 'object' && entry !== null && entry.open && entry.close) {
      openStr = entry.open as string;
      closeStr = entry.close as string;
    } else {
      return 'unknown';
    }

    const [openH, openM] = openStr.split(':').map(Number);
    const [closeH, closeM] = closeStr.split(':').map(Number);
    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;

    return currentMins >= openMins && currentMins < closeMins ? 'open' : 'closed';
  }
}