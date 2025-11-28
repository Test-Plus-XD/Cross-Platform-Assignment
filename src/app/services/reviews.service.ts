// Reviews service handles all review-related operations through the API
import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { DataService } from './data.service';

// Interface representing a restaurant review
export interface Review {
  id: string;
  userId: string;
  restaurantId: string;
  rating: number;
  comment?: string;
  dateTime: string;
  createdAt?: any;
  modifiedAt?: any;
}

// Interface for creating a new review
export interface CreateReviewRequest {
  restaurantId: string;
  rating: number;
  comment?: string;
}

// Interface for updating an existing review
export interface UpdateReviewRequest {
  rating?: number;
  comment?: string;
}

// Interface for review statistics aggregated by restaurant
export interface ReviewStats {
  restaurantId: string;
  totalReviews: number;
  averageRating: number;
  //ratingDistribution: { [key: number]: number };
  ratingDistribution: { 1: number;2: number;3: number;4: number;5: number; };
}

@Injectable({
  providedIn: 'root'
})
export class ReviewsService {
  // Base endpoint for review operations
  private readonly reviewsEndpoint = '/API/Reviews';

  constructor(
    private readonly dataService: DataService,
    private readonly authService: AuthService // Inject authentication service
  ) { console.log('ReviewsService: Initialised'); }

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
    
    // Get auth token first, then make the request
    return from(this.getAuthToken()).pipe(
      switchMap(token => 
        this.dataService.post<{ id: string }>(
          this.reviewsEndpoint,
          reviewData,
          token // Pass the actual token instead of boolean true
        )
      )
    );
  }

  // Get all reviews with optional filtering by restaurantId or userId
  getReviews(restaurantId?: string, userId?: string): Observable<Review[]> {
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
      map(response => response.data || [])
    );
  }

  // Get a single review by ID
  getReviewById(reviewId: string): Observable<Review> {
    console.log('ReviewsService: Fetching review:', reviewId);
    return this.dataService.get<Review>(`${this.reviewsEndpoint}/${reviewId}`);
  }

  // Update an existing review (requires authentication and ownership)
  updateReview(reviewId: string, updates: UpdateReviewRequest): Observable<void> {
    console.log('ReviewsService: Updating review:', reviewId);

    // Get auth token first, then make the request
    return from(this.getAuthToken()).pipe(
      switchMap(token =>
        this.dataService.put<void>(
          `${this.reviewsEndpoint}/${reviewId}`,
          updates,
          token // Pass the toke
        )
      )
    );
  }

  // Delete a review (requires authentication and ownership)
  deleteReview(reviewId: string): Observable<void> {
    console.log('ReviewsService: Deleting review:', reviewId);

    // Get auth token first, then make the request
    return from(this.getAuthToken()).pipe(
      switchMap(token =>
        this.dataService.delete<void>(
          `${this.reviewsEndpoint}/${reviewId}`,
          token // Pass the token
        )
      )
    );
  }

  // Get review statistics for a specific restaurant
  // Returns aggregate data including average rating and distribution
  getRestaurantStats(restaurantId: string): Observable<ReviewStats> {
    console.log('ReviewsService: Fetching stats for restaurant:', restaurantId);
    return this.dataService.get<ReviewStats>(
      `${this.reviewsEndpoint}/Restaurant/${restaurantId}/stats`
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