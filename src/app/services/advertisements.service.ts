// Advertisements service handles all advertisement-related operations through the API
import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { DataService } from './data.service';

/**
 * Interface for an advertisement document stored in Firestore.
 * Language-specific fields use Snake_Case with language suffix (e.g. Title_EN, Title_TC).
 * Other fields use camelCase.
 *
 * Note: Advertisement images are stored in Firebase Storage and referenced via URL.
 * Language fallback is applied before submission — if one language's fields are empty,
 * they are copied from the other language by the caller.
 */
export interface Advertisement {
  id?: string;
  Title_EN?: string | null;
  Title_TC?: string | null;
  Content_EN?: string | null;
  Content_TC?: string | null;
  Image_EN?: string | null;
  Image_TC?: string | null;
  restaurantId?: string | null;
  userId?: string | null;
  status?: 'active' | 'inactive' | null;
  createdAt?: any;
  modifiedAt?: any;
}

/**
 * DTO for creating a new advertisement.
 * restaurantId is required; all language fields are optional (fallback is applied by caller).
 */
export interface CreateAdvertisementRequest {
  restaurantId: string;
  Title_EN?: string | null;
  Title_TC?: string | null;
  Content_EN?: string | null;
  Content_TC?: string | null;
  Image_EN?: string | null;
  Image_TC?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AdvertisementsService {
  private readonly adsEndpoint = '/API/Advertisements';

  constructor(
    private readonly dataService: DataService,
    private readonly authService: AuthService
  ) { }

  /** Helper to retrieve the current user's Firebase ID token. Returns null if unauthenticated. */
  private async getAuthToken(): Promise<string | null> {
    return await this.authService.getIdToken();
  }

  /**
   * Retrieve all active advertisements, optionally filtered by restaurantId.
   * @param restaurantId Optional restaurant ID to filter by.
   */
  getAdvertisements(restaurantId?: string): Observable<Advertisement[]> {
    const endpoint = restaurantId
      ? `${this.adsEndpoint}?restaurantId=${restaurantId}`
      : this.adsEndpoint;

    return this.dataService.get<{ count: number; data: Advertisement[] }>(endpoint).pipe(
      map(response => response.data || []),
      catchError(err => {
        console.error('AdvertisementsService: Failed to fetch advertisements', err);
        return of([]);
      })
    );
  }

  /**
   * Retrieve a single advertisement by its Firestore document ID.
   * @param id Firestore document ID.
   */
  getAdvertisement(id: string): Observable<Advertisement> {
    return this.dataService.get<Advertisement>(`${this.adsEndpoint}/${id}`).pipe(
      catchError(err => {
        console.error(`AdvertisementsService: Failed to fetch advertisement ${id}`, err);
        throw err;
      })
    );
  }

  /**
   * Create a new advertisement. Requires authentication.
   * userId is automatically set by the backend from the auth token.
   * @param data Advertisement creation payload.
   */
  createAdvertisement(data: CreateAdvertisementRequest): Observable<{ id: string; message: string }> {
    return from(this.getAuthToken()).pipe(
      switchMap(token =>
        this.dataService.post<{ id: string; message: string }>(
          this.adsEndpoint,
          data,
          token
        )
      )
    );
  }

  /**
   * Update an existing advertisement. Requires authentication and ownership.
   * @param id Firestore document ID.
   * @param data Fields to update (partial update supported).
   */
  updateAdvertisement(id: string, data: Partial<Advertisement>): Observable<{ message: string }> {
    return from(this.getAuthToken()).pipe(
      switchMap(token =>
        this.dataService.put<{ message: string }>(
          `${this.adsEndpoint}/${id}`,
          data,
          token
        )
      )
    );
  }

  /**
   * Delete an advertisement. Requires authentication and ownership.
   * @param id Firestore document ID.
   */
  deleteAdvertisement(id: string): Observable<void> {
    return from(this.getAuthToken()).pipe(
      switchMap(token =>
        this.dataService.delete<void>(
          `${this.adsEndpoint}/${id}`,
          token
        )
      )
    );
  }
}
