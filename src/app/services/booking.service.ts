// Service to manage restaurant bookings via REST API
// Provides CRUD operations for user bookings with authentication
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, map, tap, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

// Booking interface matching the Firestore schema and Flutter model
export interface Booking {
  id?: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  dateTime: string; // ISO 8601 format
  numberOfGuests: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  paymentIntentId?: string | null;
  specialRequests?: string | null;
  createdAt?: any;
  modifiedAt?: any;
}

// Interface for creating a new booking (without id and timestamps)
export interface CreateBookingRequest {
  restaurantId: string;
  restaurantName: string;
  dateTime: string;
  numberOfGuests: number;
  specialRequests?: string | null;
}

// Interface for updating an existing booking
export interface UpdateBookingRequest {
  dateTime?: string;
  numberOfGuests?: number;
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentStatus?: 'unpaid' | 'paid' | 'refunded';
  specialRequests?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  // Base URL for the bookings API endpoint
  private readonly apiUrl = `${environment.apiUrl}/API/Bookings`;
  // Authentication token for API calls
  private authToken: string | null = null;
  // Cache for user bookings
  private bookingsCache = new BehaviorSubject<Booking[] | null>(null);
  // Public observable for components to subscribe to
  public bookings$: Observable<Booking[] | null> = this.bookingsCache.asObservable();
  // Loading state
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$: Observable<boolean> = this.isLoadingSubject.asObservable();

  constructor(
    private readonly httpClient: HttpClient,
    private readonly authService: AuthService
  ) {
    console.log('BookingService: Initialised with API URL:', this.apiUrl);
    // Subscribe to auth state changes to update token
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.refreshToken();
      } else {
        this.clearAuthToken();
      }
    });
  }

  // Refresh the authentication token from AuthService
  private async refreshToken(): Promise<void> {
    try {
      const token = await this.authService.getIdToken();
      if (token) {
        this.authToken = token;
        console.log('BookingService: Token refreshed');
      }
    } catch (error) {
      console.error('BookingService: Failed to refresh token', error);
    }
  }

  // Store authentication token for API calls
  setAuthToken(token: string): void {
    this.authToken = token;
    console.log('BookingService: Auth token set');
  }

  // Clear authentication token
  clearAuthToken(): void {
    this.authToken = null;
    this.bookingsCache.next(null);
    console.log('BookingService: Auth token cleared');
  }

  // Build HTTP headers with authentication
  private getHeaders(): HttpHeaders {
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json',
      'x-api-passcode': 'PourRice'
    };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    } else {
      console.warn('BookingService: No auth token available for request');
    }
    return new HttpHeaders(headers);
  }

  /**
   * Create a new booking for the authenticated user.
   * The userId is automatically set from the authenticated user's token.
   */
  createBooking(booking: CreateBookingRequest): Observable<{ id: string }> {
    console.log('BookingService: Creating booking', booking);
    this.isLoadingSubject.next(true);

    return this.httpClient.post<{ id: string }>(
      this.apiUrl,
      booking,
      { headers: this.getHeaders() }
    ).pipe(
      tap(response => {
        console.log('BookingService: Booking created with ID:', response.id);
        // Invalidate cache to force refresh
        this.bookingsCache.next(null);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('BookingService: Error creating booking:', error);
        return throwError(() => this.handleError(error));
      }),
      tap(() => this.isLoadingSubject.next(false))
    );
  }

  /**
   * Retrieve all bookings for the authenticated user.
   * Uses caching to reduce API calls.
   */
  getUserBookings(forceRefresh: boolean = false): Observable<Booking[]> {
    // Return cached bookings if available and not forcing refresh
    const cached = this.bookingsCache.getValue();
    if (cached && !forceRefresh) {
      console.log('BookingService: Returning cached bookings');
      return of(cached);
    }

    console.log('BookingService: Fetching user bookings from API');
    this.isLoadingSubject.next(true);

    return this.httpClient.get<{ count: number; data: Booking[] }>(
      this.apiUrl,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => {
        const bookings = response.data || [];
        console.log('BookingService: Fetched', bookings.length, 'bookings');
        return bookings;
      }),
      tap(bookings => {
        this.bookingsCache.next(bookings);
        this.isLoadingSubject.next(false);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('BookingService: Error fetching bookings:', error);
        this.isLoadingSubject.next(false);
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Retrieve a single booking by ID.
   * Ownership is verified on the server side.
   */
  getBookingById(id: string): Observable<Booking | null> {
    if (!id) {
      console.error('BookingService: Cannot fetch booking without ID');
      return of(null);
    }

    console.log('BookingService: Fetching booking by ID:', id);

    return this.httpClient.get<Booking>(
      `${this.apiUrl}/${encodeURIComponent(id)}`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(booking => {
        console.log('BookingService: Booking fetched successfully');
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          console.log('BookingService: Booking not found');
          return of(null);
        }
        console.error('BookingService: Error fetching booking:', error);
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Update an existing booking.
   * Only the booking owner can update their booking.
   */
  updateBooking(id: string, updates: UpdateBookingRequest): Observable<void> {
    if (!id) {
      console.error('BookingService: Cannot update booking without ID');
      return throwError(() => new Error('Booking ID is required'));
    }

    console.log('BookingService: Updating booking:', id, updates);
    this.isLoadingSubject.next(true);

    return this.httpClient.put<void>(
      `${this.apiUrl}/${encodeURIComponent(id)}`,
      updates,
      { headers: this.getHeaders() }
    ).pipe(
      tap(() => {
        console.log('BookingService: Booking updated successfully');
        // Invalidate cache to force refresh
        this.bookingsCache.next(null);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('BookingService: Error updating booking:', error);
        return throwError(() => this.handleError(error));
      }),
      tap(() => this.isLoadingSubject.next(false))
    );
  }

  /**
   * Cancel a booking (sets status to 'cancelled').
   * This is a convenience method that calls updateBooking.
   */
  cancelBooking(id: string): Observable<void> {
    console.log('BookingService: Cancelling booking:', id);
    return this.updateBooking(id, { status: 'cancelled' });
  }

  /**
   * Delete a booking permanently.
   * Only the booking owner can delete their booking.
   */
  deleteBooking(id: string): Observable<void> {
    if (!id) {
      console.error('BookingService: Cannot delete booking without ID');
      return throwError(() => new Error('Booking ID is required'));
    }

    console.log('BookingService: Deleting booking:', id);
    this.isLoadingSubject.next(true);

    return this.httpClient.delete<void>(
      `${this.apiUrl}/${encodeURIComponent(id)}`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(() => {
        console.log('BookingService: Booking deleted successfully');
        // Invalidate cache to force refresh
        this.bookingsCache.next(null);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('BookingService: Error deleting booking:', error);
        return throwError(() => this.handleError(error));
      }),
      tap(() => this.isLoadingSubject.next(false))
    );
  }

  /**
   * Get bookings filtered by status.
   * Useful for showing upcoming, past, or cancelled bookings separately.
   */
  getBookingsByStatus(status: Booking['status']): Observable<Booking[]> {
    return this.getUserBookings().pipe(
      map(bookings => bookings.filter(b => b.status === status))
    );
  }

  /**
   * Get upcoming bookings (pending or confirmed, with future dates).
   */
  getUpcomingBookings(): Observable<Booking[]> {
    const now = new Date().toISOString();
    return this.getUserBookings().pipe(
      map(bookings => bookings.filter(b =>
        (b.status === 'pending' || b.status === 'confirmed') &&
        b.dateTime > now
      ).sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()))
    );
  }

  /**
   * Get past bookings (completed or with past dates).
   */
  getPastBookings(): Observable<Booking[]> {
    const now = new Date().toISOString();
    return this.getUserBookings().pipe(
      map(bookings => bookings.filter(b =>
        b.status === 'completed' ||
        (b.dateTime < now && b.status !== 'cancelled')
      ).sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()))
    );
  }

  // Get cached bookings synchronously
  get currentBookings(): Booking[] | null {
    return this.bookingsCache.getValue();
  }

  // Clear cached bookings
  clearCache(): void {
    this.bookingsCache.next(null);
    console.log('BookingService: Cache cleared');
  }

  // Cache for restaurant bookings (separate from user bookings)
  private restaurantBookingsCache = new Map<string, { data: Booking[]; timestamp: number }>();
  // Cache expiry time in milliseconds (5 minutes)
  private readonly restaurantCacheExpiry = 5 * 60 * 1000;

  /**
   * Get all bookings for a specific restaurant.
   * Used by Restaurant-type users to manage incoming reservations.
   * @param restaurantId - The ID of the restaurant to fetch bookings for
   * @param forceRefresh - If true, bypasses the cache
   */
  getRestaurantBookings(restaurantId: string, forceRefresh: boolean = false): Observable<Booking[]> {
    if (!restaurantId) {
      console.error('BookingService: Cannot fetch bookings without restaurant ID');
      return throwError(() => new Error('Restaurant ID is required'));
    }

    // Check cache if not forcing refresh
    if (!forceRefresh) {
      const cached = this.restaurantBookingsCache.get(restaurantId);
      if (cached && (Date.now() - cached.timestamp) < this.restaurantCacheExpiry) {
        console.log('BookingService: Returning cached restaurant bookings');
        return of(cached.data);
      }
    }

    console.log('BookingService: Fetching bookings for restaurant:', restaurantId);
    this.isLoadingSubject.next(true);

    return this.httpClient.get<Booking[]>(
      `${this.apiUrl}/restaurant/${encodeURIComponent(restaurantId)}`,
      { headers: this.getHeaders() }
    ).pipe(
      retry(1),
      tap(bookings => {
        console.log('BookingService: Restaurant bookings retrieved:', bookings.length);
        // Update cache
        this.restaurantBookingsCache.set(restaurantId, {
          data: bookings,
          timestamp: Date.now()
        });
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('BookingService: Error fetching restaurant bookings:', error);
        return throwError(() => this.handleError(error));
      }),
      tap(() => this.isLoadingSubject.next(false))
    );
  }

  /// Clear restaurant bookings cache for a specific restaurant.
  clearRestaurantCache(restaurantId?: string): void {
    if (restaurantId) {
      this.restaurantBookingsCache.delete(restaurantId);
      console.log('BookingService: Restaurant cache cleared for:', restaurantId);
    } else {
      this.restaurantBookingsCache.clear();
      console.log('BookingService: All restaurant caches cleared');
    }
  }

  /// Handle HTTP errors and return user-friendly error messages.
  private handleError(error: HttpErrorResponse): Error {
    let message = 'An error occurred whilst managing bookings';

    console.error('BookingService: HTTP Error Details:');
    console.error('- Status:', error.status);
    console.error('- Status Text:', error.statusText);
    console.error('- URL:', error.url);

    // Try to extract error message from server response
    if (error.error?.error) {
      message = error.error.error;
    } else if (error.message) {
      message = error.message;
    }

    // Provide specific messages for common HTTP status codes
    switch (error.status) {
      case 0:
        message = 'Cannot connect to server. Please check your internet connection.';
        break;
      case 400:
        message = error.error?.error || 'Invalid booking data provided.';
        break;
      case 401:
        message = 'Unauthorised: Please log in again.';
        break;
      case 403:
        message = 'Forbidden: You can only manage your own bookings.';
        break;
      case 404:
        message = 'Booking not found.';
        break;
      case 409:
        message = 'Booking conflict: This time slot may no longer be available.';
        break;
      case 500:
        message = 'Server error: Please try again later.';
        break;
    }
    return new Error(message);
  }
}