// Service to fetch restaurants from backend and cache results
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { searchClient, SearchClient } from '@algolia/client-search';

// Types for menu / contacts / opening hours
export interface MenuItem {
  id?: string;
  Name_EN?: string;
  Name_TC?: string;
  Price?: number | null;
  Description_EN?: string;
  Description_TC?: string;
  // Add other fields you need for menu items
}

export interface OpeningHours {
  // e.g. { Monday: '09:00-18:00', Tuesday: 'closed', ... }
  [Day: string]: string | null;
}

export interface Contacts {
  Phone?: string | null;
  Email?: string | null;
  Website?: string | null;
}

export interface Restaurant {
  id: string;
  Name_EN?: string | null;
  Name_TC?: string | null;
  Address_EN?: string | null;
  Address_TC?: string | null;
  District_EN?: string | null;
  District_TC?: string | null;
  Latitude?: number | null;
  Longitude?: number | null;
  Keyword_EN?: string[] | null;
  Keyword_TC?: string[] | null;
  Menu?: MenuItem[] | null; // Could be denormalised array of menu items
  Opening_Hours?: OpeningHours | null;
  Seats?: number | null;
  Contacts?: Contacts | null;
  ImageUrl?: string | null; // Public URL to an image, or null if not provided
}

@Injectable({ providedIn: 'root' })
export class RestaurantsService {
  // Base URL for your server-side CRUD API
  private readonly apiUrl = environment.apiRestaurantsUrl;
  // Algolia index name
  private readonly algoliaIndexName = 'Restaurants';
  // Algolia client initialised with search-only key for client queries
  private readonly algoliaClient: SearchClient = searchClient(
    environment.algoliaAppId,
    environment.algoliaSearchKey
  );
  // Local cache to reduce network calls
  private readonly restaurantsCache = new BehaviorSubject<Restaurant[] | null>(null);

  constructor(private readonly http: HttpClient) { }

  /**
   * Search using Algolia with pagination and EN-primary filters.
   * Uses `filters` (single string) to avoid facet quoting pitfalls for multi-word values.
   */
  searchRestaurants(
    query: string,
    districtEn: string,
    selectedKeywordEn: string | null,
    lang: 'EN' | 'TC',
    page = 0,
    hitsPerPage = 10
  ): Observable<{ hits: Restaurant[]; nbHits: number; page: number; nbPages: number }> {
    // Helper: escape double quotes and wrap multi-word values in quotes
    const quoteFilterValue = (value: string): string => {
      const safe = String(value || '').replace(/"/g, '').trim();
      return /\s/.test(safe) ? `"${safe}"` : safe;
    };

    // Build filters parts (EN-primary). Use AND to combine.
    const filterParts: string[] = [];

    if (districtEn && districtEn.trim() !== '') {
      filterParts.push(`District_EN:${quoteFilterValue(districtEn)}`);
    }

    if (selectedKeywordEn && selectedKeywordEn.trim() !== '') {
      // Note: don't quote single-token keywords unless necessary — quoting is safe
      filterParts.push(`Keyword_EN:${quoteFilterValue(selectedKeywordEn)}`);
    }

    // Combine into a single filters string understood by Algolia
    const filtersString = filterParts.length ? filterParts.join(' AND ') : undefined;

    // Build params object for Algolia search
    const params: any = {
      query: query ?? '',
      page,
      hitsPerPage
    };
    if (filtersString) {
      params.filters = filtersString;
    }

    // Debug: inspect what we send to Algolia in DevTools console
    console.log('Algolia search params (filters):', JSON.stringify(params));

    // Use the multi-request search form (single request inside array)
    return new Observable(observer => {
      this.algoliaClient.search([
        {
          indexName: this.algoliaIndexName,
          params
        }
      ]).then((result: any) => {
        // Extract the first (and only) result set
        const searchResult = result.results && result.results[0] ? result.results[0] : null;
        if (!searchResult) {
          observer.next({ hits: [], nbHits: 0, page: 0, nbPages: 0 });
          observer.complete();
          return;
        }

        // Map hits into Restaurant interface. Preserve bilingual fields as-is.
        const hits: Restaurant[] = (searchResult.hits || []).map((h: any) => ({
          id: h.objectID,
          Name_EN: h.Name_EN ?? h.name_en ?? null,
          Name_TC: h.Name_TC ?? h.name_tc ?? null,
          Address_EN: h.Address_EN ?? h.address_en ?? null,
          Address_TC: h.Address_TC ?? h.address_tc ?? null,
          District_EN: h.District_EN ?? h.district_en ?? null,
          District_TC: h.District_TC ?? h.district_tc ?? null,
          Latitude: (typeof h.Latitude !== 'undefined') ? h.Latitude : (h.latitude ?? null),
          Longitude: (typeof h.Longitude !== 'undefined') ? h.Longitude : (h.longitude ?? null),
          Keyword_EN: h.Keyword_EN ?? h.keyword_en ?? null,
          Keyword_TC: h.Keyword_TC ?? h.keyword_tc ?? null,

          // Optional extended fields - if you denormalise them into Algolia records
          menu: h.menu ?? h.Menu ?? null,
          openingHours: h.openingHours ?? h.OpeningHours ?? null,
          seats: (typeof h.seats !== 'undefined') ? h.seats : (h.Seats ?? null),
          contacts: h.contacts ?? h.Contacts ?? null
        }));

        observer.next({
          hits,
          nbHits: searchResult.nbHits,
          page: searchResult.page,
          nbPages: searchResult.nbPages
        });
        observer.complete();
      }).catch((err: any) => {
        // Log and forward the error
        console.error('Algolia search error (filters):', err);
        observer.error(err);
      });
    });
  }

  // Get a single restaurant by id from the server API, returns a Restaurant or null on 404
  getRestaurantById(id: string): Observable<Restaurant | null> {
    if (!id) return of(null);
    return this.http.get<Partial<Restaurant>>(`${this.apiUrl}/${encodeURIComponent(id)}`).pipe(
      map(response => {
        // Map Firestore payload to Restaurant shape and ensure id field exists
        const r: Restaurant = {
          id: (response as any).id ?? id,
          Name_EN: (response as any).Name_EN ?? null,
          Name_TC: (response as any).Name_TC ?? null,
          Address_EN: (response as any).Address_EN ?? null,
          Address_TC: (response as any).Address_TC ?? null,
          District_EN: (response as any).District_EN ?? null,
          District_TC: (response as any).District_TC ?? null,
          Latitude: (typeof (response as any).Latitude !== 'undefined') ? (response as any).Latitude : null,
          Longitude: (typeof (response as any).Longitude !== 'undefined') ? (response as any).Longitude : null,
          Keyword_EN: (response as any).Keyword_EN ?? null,
          Keyword_TC: (response as any).Keyword_TC ?? null,
          Menu: (response as any).Menu ?? null,
          Opening_Hours: (response as any).Opening_Hours ?? null,
          Seats: (typeof (response as any).Seats !== 'undefined') ? (response as any).Seats : null,
          Contacts: (response as any).Contacts ?? null,
          ImageUrl: (response as any).ImageUrl ?? null
        };
        return r;
      }),
      catchError(err => {
        console.error('RestaurantsService.getRestaurantById error', err);
        return of(null);
      })
    );
  }

  // Fallback fetch all restaurants from your API (non-search)
  getRestaurants(): Observable<Restaurant[]> {
    const cached = this.restaurantsCache.getValue();
    if (cached && cached.length > 0) {
      return of(cached);
    }
    return this.http.get<{ count: number; data: Restaurant[] }>(this.apiUrl).pipe(
      map(response => response.data || []),
      tap(list => this.restaurantsCache.next(list)),
      catchError(err => {
        console.error('RestaurantsService.getRestaurants error', err);
        this.restaurantsCache.next([]);
        return of([]);
      })
    );
  }

  // Create a new restaurant (server writes to Firestore)
  createRestaurant(payload: Partial<Restaurant>): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(this.apiUrl, payload).pipe(
      tap(() => this.restaurantsCache.next(null)),
      catchError((err: any) => {
        console.error('RestaurantsService.createRestaurant error', err);
        throw err;
      })
    );
  }

  // Update an existing restaurant
  updateRestaurant(id: string, payload: Partial<Restaurant>): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${encodeURIComponent(id)}`, payload).pipe(
      tap(() => this.restaurantsCache.next(null)),
      catchError((err: any) => {
        console.error('RestaurantsService.updateRestaurant error', err);
        throw err;
      })
    );
  }

  // Delete a restaurant
  deleteRestaurant(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${encodeURIComponent(id)}`).pipe(
      tap(() => this.restaurantsCache.next(null)),
      catchError((err: any) => {
        console.error('RestaurantsService.deleteRestaurant error', err);
        throw err;
      })
    );
  }

  // Clear local cache
  clearCache(): void {
    this.restaurantsCache.next(null);
  }
}