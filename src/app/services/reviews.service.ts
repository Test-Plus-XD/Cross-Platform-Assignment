// Reviews service handles all review-related operations through the API
import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { DataService } from './data.service';

// Interface representing a restaurant review with enriched user information
export interface Review {
  id: string;
  userId: string;
  userDisplayName?: string | null;
  userPhotoURL?: string | null;
  restaurantId: string;
  rating: number;
  comment?: string;
  imageUrl?: string | null;  // Review image (optional)
  dateTime: string;
  createdAt?: any;
  modifiedAt?: any;
}

// Interface for creating a new review
export interface CreateReviewRequest {
  restaurantId: string;
  rating: number;
  comment?: string;
  imageUrl?: string;  // Optional review image
}

// Interface for updating an existing review
export interface UpdateReviewRequest {
  rating?: number;
  comment?: string;
  imageUrl?: string;  // Optional review image
}

// Interface for review statistics aggregated by restaurant
export interface ReviewStats {
  restaurantId: string;
  totalReviews: number;
  averageRating: number;
  //ratingDistribution: { [key: number]: number };
  ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number; };
}

// Type alias for batch stats response
export type BatchStats = Record<string, { totalReviews: number; averageRating: number }>;

// TTL cache entry wrapper
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReviewsService {
  // Base endpoint for review operations
  private readonly reviewsEndpoint = '/API/Reviews';

  // TTL constant: 5 minutes in milliseconds
  private readonly REVIEWS_TTL_MS = 300_000;

  // In-memory TTL caches
  private reviewsCache = new Map<string, CacheEntry<Review[]>>();
  private statsCache = new Map<string, CacheEntry<ReviewStats>>();
  private batchStatsCache = new Map<string, CacheEntry<BatchStats>>();

  constructor(
    private readonly dataService: DataService,
    private readonly authService: AuthService
  ) { console.log('ReviewsService: Initialised'); }

  /**
   * Returns true if the cached entry is still within the TTL window.
   */
  private isCacheValid(timestamp: number, ttlMs: number): boolean {
    return Date.now() - timestamp < ttlMs;
  }

  /**
   * Helper method to get the current user's authentication token
   * Returns null if user is not authenticated
   */
  private async getAuthToken(): Promise<string | null> {
    return await this.authService.getIdToken();
  }

  // Create a new review for a restaurant (requires authentication)
  // The userId is automatically extracted from the authentication token on the backend
  createReview(reviewData: CreateReviewRequest): Observable<{ id: string }> {
    console.log('ReviewsService: Creating review for restaurant:', reviewData.restaurantId);
    const { restaurantId } = reviewData;

    // Get auth token first, then make the request
    return from(this.getAuthToken()).pipe(
      switchMap(token =>
        this.dataService.post<{ id: string }>(
          this.reviewsEndpoint,
          reviewData,
          token
        )
      ),
      tap(() => {
        this.reviewsCache.delete(restaurantId);
        this.statsCache.delete(restaurantId);
        this.batchStatsCache.clear();
      })
    );
  }

  // Get all reviews with optional filtering by restaurantId or userId
  // Reviews now include userDisplayName and userPhotoURL from the backend
  getReviews(restaurantId?: string, userId?: string): Observable<Review[]> {
    // When restaurantId is provided, use the TTL cache
    if (restaurantId) {
      const cached = this.reviewsCache.get(restaurantId);
      if (cached && this.isCacheValid(cached.timestamp, this.REVIEWS_TTL_MS)) {
        console.log('ReviewsService: Returning cached reviews for restaurant:', restaurantId);
        return of(cached.data);
      }
    }

    let endpoint = this.reviewsEndpoint;
    const params: string[] = [];

    // Build query parameters for filtering
    if (restaurantId) params.push(`restaurantId=${encodeURIComponent(restaurantId)}`);
    if (userId) params.push(`userId=${encodeURIComponent(userId)}`);

    // Append query parameters if any exist
    if (params.length > 0) {
      endpoint += `?${params.join('&')}`;
    }

    console.log('ReviewsService: Fetching reviews from:', endpoint);
    // No authentication required for reading reviews
    return this.dataService.get<{ count: number; data: Review[] }>(endpoint).pipe(
      map(response => response.data || []),
      tap(reviews => {
        // Only cache when fetching by restaurantId (not global list)
        if (restaurantId) {
          this.reviewsCache.set(restaurantId, { data: reviews, timestamp: Date.now() });
        }
      })
    );
  }

  // Get a single review by ID
  // Returns review with userDisplayName and userPhotoURL included
  getReviewById(reviewId: string): Observable<Review> {
    console.log('ReviewsService: Fetching review:', reviewId);
    return this.dataService.get<Review>(`${this.reviewsEndpoint}/${reviewId}`);
  }

  // Update an existing review (requires authentication and ownership)
  // restaurantId is required to invalidate the relevant cache entries
  updateReview(reviewId: string, updates: UpdateReviewRequest, restaurantId: string): Observable<void> {
    console.log('ReviewsService: Updating review:', reviewId);

    // Get auth token first, then make the request
    return from(this.getAuthToken()).pipe(
      switchMap(token =>
        this.dataService.put<void>(
          `${this.reviewsEndpoint}/${reviewId}`,
          updates,
          token
        )
      ),
      tap(() => {
        this.reviewsCache.delete(restaurantId);
        this.statsCache.delete(restaurantId);
        this.batchStatsCache.clear();
      })
    );
  }

  // Delete a review (requires authentication and ownership)
  // restaurantId is required to invalidate the relevant cache entries
  deleteReview(reviewId: string, restaurantId: string): Observable<void> {
    console.log('ReviewsService: Deleting review:', reviewId);

    // Get auth token first, then make the request
    return from(this.getAuthToken()).pipe(
      switchMap(token =>
        this.dataService.delete<void>(
          `${this.reviewsEndpoint}/${reviewId}`,
          token
        )
      ),
      tap(() => {
        this.reviewsCache.delete(restaurantId);
        this.statsCache.delete(restaurantId);
        this.batchStatsCache.clear();
      })
    );
  }

  // Get review statistics for a specific restaurant
  // Returns aggregate data including average rating and distribution
  getRestaurantStats(restaurantId: string): Observable<ReviewStats> {
    const cached = this.statsCache.get(restaurantId);
    if (cached && this.isCacheValid(cached.timestamp, this.REVIEWS_TTL_MS)) {
      console.log('ReviewsService: Returning cached stats for restaurant:', restaurantId);
      return of(cached.data);
    }

    console.log('ReviewsService: Fetching stats for restaurant:', restaurantId);
    return this.dataService.get<ReviewStats>(
      `${this.reviewsEndpoint}/Restaurant/${restaurantId}/stats`
    ).pipe(
      tap(stats => {
        this.statsCache.set(restaurantId, { data: stats, timestamp: Date.now() });
      })
    );
  }

  // Get review statistics for multiple restaurants in a single request
  getBatchStats(restaurantIds: string[]): Observable<BatchStats> {
    if (restaurantIds.length === 0) return new Observable(sub => { sub.next({}); sub.complete(); });

    const key = restaurantIds.slice().sort().join(',');
    const cached = this.batchStatsCache.get(key);
    if (cached && this.isCacheValid(cached.timestamp, this.REVIEWS_TTL_MS)) {
      console.log('ReviewsService: Returning cached batch stats for key:', key);
      return of(cached.data);
    }

    const ids = restaurantIds.join(',');
    return this.dataService.get<BatchStats>(
      `${this.reviewsEndpoint}/batch-stats?restaurantIds=${encodeURIComponent(ids)}`
    ).pipe(
      tap(stats => {
        this.batchStatsCache.set(key, { data: stats, timestamp: Date.now() });
      })
    );
  }

  // Helper method to format rating as stars (for display purposes)
  formatRatingStars(rating: number): string {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let stars = '★'.repeat(fullStars);
    if (hasHalfStar) stars += '½';
    stars += '☆'.repeat(emptyStars);
    return stars;
  }

  // Helper method to get rating colour based on value
  getRatingColour(rating: number): string {
    if (rating >= 4.5) return 'success';
    if (rating >= 3.5) return 'primary';
    if (rating >= 2.5) return 'warning';
    return 'danger';
  }
}
