// Service to manage restaurant bookings via REST API
// Provides CRUD operations for user bookings with authentication
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, map, tap, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

// Booking interface matching the Firestore schema
export interface Booking {
  id?: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  dateTime: string; // ISO 8601 format
  numberOfGuests: number;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';
  declineMessage?: string | null;
  specialRequests?: string | null;
  createdAt?: any;
  modifiedAt?: any;
  // Enriched field returned by GET /restaurant/:restaurantId
  diner?: { displayName: string | null; email: string | null; phoneNumber: string | null };
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
  status?: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';
  declineMessage?: string | null;
  specialRequests?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private readonly httpClient = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly apiUrl = `${environment.apiUrl}/API/Bookings`;
  private authToken: string | null = null;
  private bookingsCache = new BehaviorSubject<Booking[] | null>(null);
  public bookings$: Observable<Booking[] | null> = this.bookingsCache.asObservable();
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$: Observable<boolean> = this.isLoadingSubject.asObservable();

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {
    console.log('BookingService: Initialised with API URL:', this.apiUrl);
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.refreshToken();
      } else {
        this.clearAuthToken();
      }
    });
  }

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

  setAuthToken(token: string): void {
    this.authToken = token;
    console.log('BookingService: Auth token set');
  }

  clearAuthToken(): void {
    this.authToken = null;
    this.bookingsCache.next(null);
    console.log('BookingService: Auth token cleared');
  }

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
   */
  getUserBookings(forceRefresh: boolean = false): Observable<Booking[]> {
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
      map(response => response.data || []),
      tap(bookings => {
        this.bookingsCache.next(bookings);
        this.isLoadingSubject.next(false);
        console.log('BookingService: Fetched', bookings.length, 'bookings');
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
   */
  getBookingById(id: string): Observable<Booking | null> {
    if (!id) {
      console.error('BookingService: Cannot fetch booking without ID');
      return of(null);
    }
    return this.httpClient.get<Booking>(
      `${this.apiUrl}/${encodeURIComponent(id)}`,
      { headers: this.getHeaders() }
    ).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) return of(null);
        console.error('BookingService: Error fetching booking:', error);
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Update an existing booking.
   * Diner: edit details or cancel (pending only).
   * Restaurant owner: accept, decline (with optional declineMessage), or complete.
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
   * Cancel a booking (sets status to 'cancelled'). Diner use only; booking must be pending.
   */
  cancelBooking(id: string): Observable<void> {
    console.log('BookingService: Cancelling booking:', id);
    return this.updateBooking(id, { status: 'cancelled' });
  }

  /**
   * Delete a booking permanently.
   * Only allowed if the booking date is older than 30 days.
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
   */
  getBookingsByStatus(status: Booking['status']): Observable<Booking[]> {
    return this.getUserBookings().pipe(
      map(bookings => bookings.filter(b => b.status === status))
    );
  }

  /**
   * Get upcoming bookings (pending or accepted, with future dates).
   */
  getUpcomingBookings(): Observable<Booking[]> {
    const now = new Date().toISOString();
    return this.getUserBookings().pipe(
      map(bookings => bookings.filter(b =>
        (b.status === 'pending' || b.status === 'accepted') &&
        b.dateTime > now
      ).sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()))
    );
  }

  /**
   * Get past bookings (completed or past date, excluding cancelled/declined).
   */
  getPastBookings(): Observable<Booking[]> {
    const now = new Date().toISOString();
    return this.getUserBookings().pipe(
      map(bookings => bookings.filter(b =>
        b.status === 'completed' ||
        (b.dateTime < now && b.status !== 'cancelled' && b.status !== 'declined')
      ).sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()))
    );
  }

  get currentBookings(): Booking[] | null {
    return this.bookingsCache.getValue();
  }

  clearCache(): void {
    this.bookingsCache.next(null);
    console.log('BookingService: Cache cleared');
  }

  // Cache for restaurant bookings (separate from user bookings)
  private restaurantBookingsCache = new Map<string, { data: Booking[]; timestamp: number }>();
  private readonly restaurantCacheExpiry = 5 * 60 * 1000;

  /**
   * Get all bookings for a specific restaurant (restaurant owners only).
   * Returns bookings enriched with diner contact info.
   */
  getRestaurantBookings(restaurantId: string, forceRefresh: boolean = false): Observable<Booking[]> {
    if (!restaurantId) {
      console.error('BookingService: Cannot fetch bookings without restaurant ID');
      return throwError(() => new Error('Restaurant ID is required'));
    }

    if (!forceRefresh) {
      const cached = this.restaurantBookingsCache.get(restaurantId);
      if (cached && (Date.now() - cached.timestamp) < this.restaurantCacheExpiry) {
        console.log('BookingService: Returning cached restaurant bookings');
        return of(cached.data);
      }
    }

    console.log('BookingService: Fetching bookings for restaurant:', restaurantId);
    this.isLoadingSubject.next(true);

    return this.httpClient.get<{ count: number; data: Booking[] }>(
      `${this.apiUrl}/restaurant/${encodeURIComponent(restaurantId)}`,
      { headers: this.getHeaders() }
    ).pipe(
      retry(1),
      map(response => response.data || []),
      tap(bookings => {
        console.log('BookingService: Restaurant bookings retrieved:', bookings.length);
        this.restaurantBookingsCache.set(restaurantId, { data: bookings, timestamp: Date.now() });
        this.isLoadingSubject.next(false);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('BookingService: Error fetching restaurant bookings:', error);
        this.isLoadingSubject.next(false);
        return throwError(() => this.handleError(error));
      })
    );
  }

  clearRestaurantCache(restaurantId?: string): void {
    if (restaurantId) {
      this.restaurantBookingsCache.delete(restaurantId);
      console.log('BookingService: Restaurant cache cleared for:', restaurantId);
    } else {
      this.restaurantBookingsCache.clear();
      console.log('BookingService: All restaurant caches cleared');
    }
  }

  private handleError(error: HttpErrorResponse): Error {
    let message = 'An error occurred whilst managing bookings';

    console.error('BookingService: HTTP Error Details:');
    console.error('- Status:', error.status);
    console.error('- URL:', error.url);

    if (error.error?.error) {
      message = error.error.error;
    } else if (error.message) {
      message = error.message;
    }

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
        message = error.error?.error || 'Forbidden: You are not authorised to perform this action.';
        break;
      case 404:
        message = 'Booking not found.';
        break;
      case 500:
        message = 'Server error: Please try again later.';
        break;
    }
    return new Error(message);
  }
}
