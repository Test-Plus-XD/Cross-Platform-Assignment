// Service to fetch restaurants from backend API and perform Algolia searches
// This service handles CRUD operations and integrates with the Vercel API
import { Injectable, inject } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { DataService } from './data.service';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Interface for menu items stored in sub-collection
// Note: Menu items are stored as a sub-collection in Firestore, not as an array field
export interface MenuItem {
  id?: string;
  Name_EN?: string | null;
  Name_TC?: string | null;
  price?: number | null;
  Description_EN?: string | null;
  Description_TC?: string | null;
  imageUrl?: string | null;
  createdAt?: any;
  modifiedAt?: any;
}

// Interface for opening hours map structure
export interface OpeningHours {
  [Day: string]: string | { open?: string | null; close?: string | null } | null;
}

// Interface for contact information
export interface Contacts {
  Phone?: string | null;
  Email?: string | null;
  Website?: string | null;
}

// Main restaurant interface matching the API response structure
// Note: The API returns menu items separately via sub-collection endpoints
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
  Opening_Hours?: OpeningHours | null;
  Seats?: number | null;
  Contacts?: Contacts | null;
  ImageUrl?: string | null;
  Payments?: string[] | null;
  ownerId?: string | null;
  reviewsId?: string[] | null;
  rating?: number | null;
  createdAt?: any;
  modifiedAt?: any;
}

@Injectable({ providedIn: 'root' })
export class RestaurantsService {
  private readonly dataService = inject(DataService);

  // Base endpoint for restaurant operations
  private readonly restaurantsEndpoint = '/API/Restaurants';
  // Local cache to reduce network calls
  private readonly restaurantsCache = new BehaviorSubject<Restaurant[] | null>(null);
  // TTL cache for single restaurant lookups (10 min)
  private readonly restaurantCache = new Map<string, CacheEntry<Restaurant>>();
  // TTL cache for menu item lookups keyed by restaurantId (10 min)
  private readonly menuCache = new Map<string, CacheEntry<MenuItem[]>>();
  // Timestamp guarding the restaurantsCache BehaviorSubject (0 = never fetched)
  private restaurantsCacheTimestamp = 0;
  // API URL exposed for direct fetch calls (e.g. DocuPipe)
  public readonly apiUrl = environment.apiUrl;
  // Placeholder pool for restaurants with missing ImageUrl
  private readonly restaurantPlaceholders = environment.restaurantPlaceholderImages;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {
    console.log('RestaurantsService: Initialised');
  }

  private randomRestaurantPlaceholder(): string {
    return this.restaurantPlaceholders[Math.floor(Math.random() * this.restaurantPlaceholders.length)];
  }

  /// Sanitise image URL to handle backend em dash replacement.
  /// The backend replaces null/undefined with '—' (em dash), which causes 404 errors.
  /// This helper returns null for invalid URLs so components can use their placeholder logic.
  private sanitizeImageUrl(url: any): string | null {
    if (!url || url === '—' || url === '' || url === 'null' || url === 'undefined') {
      return null;
    }
    return url;
  }

  /// Sanitise Payments field from em dash string representation.
  /// The API may return '—' for empty payment methods instead of null or an empty array.
  /// This helper ensures the Payments field is always either null or a non-empty array.
  private sanitizePayments(payments: any): string[] | null {
    if (!payments || payments === '—' || payments === '' || payments === 'null' || payments === 'undefined') return null;
    if (Array.isArray(payments)) return payments.length > 0 ? payments : null;
    return null;
  }

  /// Returns true when the cached value identified by `timestamp` is still within `ttlMs`.
  private isCacheValid(timestamp: number, ttlMs: number): boolean {
    return Date.now() - timestamp < ttlMs;
  }

  /// Search restaurants using the backend search endpoint with simple district/keyword filters.
  /// Avoid eager client-side Algolia initialisation here because pages that only need
  /// restaurant CRUD should not pay the runtime cost or risk WebView compatibility issues.
  searchRestaurants(
    query: string,
    districtEn: string,
    selectedKeywordEn: string | null,
    lang: 'EN' | 'TC',
    page = 0,
    hitsPerPage = 10
  ): Observable<{ hits: Restaurant[]; nbHits: number; page: number; nbPages: number }> {
    const filterParts: string[] = [];
    if (districtEn && districtEn.trim() !== '') {
      filterParts.push(`District_EN:"${String(districtEn).replace(/"/g, '\\"').trim()}"`);
    }
    if (selectedKeywordEn && selectedKeywordEn.trim() !== '') {
      filterParts.push(`Keyword_EN:"${String(selectedKeywordEn).replace(/"/g, '\\"').trim()}"`);
    }
    const filtersString = filterParts.length ? filterParts.join(' AND ') : undefined;
    return this.searchRestaurantsWithFilters(query, filtersString, lang, page, hitsPerPage);
  }

  /// Search using Algolia with custom filter string and pagination.
  /// Supports multi-district and multi-keyword filters with EN-primary tokens.
  /// Uses backend API endpoint instead of direct Algolia client.
  searchRestaurantsWithFilters(
    query: string,
    filters: string | undefined,
    lang: 'EN' | 'TC',
    page = 0,
    hitsPerPage = 10
  ): Observable<{ hits: Restaurant[]; nbHits: number; page: number; nbPages: number }> {
    // Build query parameters for backend API
    const params = new URLSearchParams();

    if (query && query.trim()) {
      params.append('query', query.trim());
    }

    // Parse districts and keywords from Algolia filter string
    const districts: string[] = [];
    const keywords: string[] = [];

    if (filters) {
      // Extract districts from filter string
      const districtRegex = /District_EN:"([^"]+)"/g;
      let districtMatch;
      while ((districtMatch = districtRegex.exec(filters)) !== null) {
        districts.push(districtMatch[1]);
      }

      // Extract keywords from filter string
      const keywordRegex = /Keyword_EN:"([^"]+)"/g;
      let keywordMatch;
      while ((keywordMatch = keywordRegex.exec(filters)) !== null) {
        keywords.push(keywordMatch[1]);
      }
    }

    if (districts.length > 0) params.append('districts', districts.join(','));
    if (keywords.length > 0) params.append('keywords', keywords.join(','));

    params.append('page', page.toString());
    params.append('hitsPerPage', hitsPerPage.toString());

    const endpoint = `/API/Algolia/Restaurants?${params.toString()}`;
    console.log('RestaurantsService: Backend search endpoint:', endpoint);

    return this.dataService.get<{ hits: Restaurant[]; nbHits: number; page: number; nbPages: number }>(endpoint).pipe(
      map(response => {
        // Map response hits to Restaurant interface
        const hits: Restaurant[] = (response.hits || []).map((h: any) => ({
          id: h.objectID || h.id,
          Name_EN: h.Name_EN ?? null,
          Name_TC: h.Name_TC ?? null,
          Address_EN: h.Address_EN ?? null,
          Address_TC: h.Address_TC ?? null,
          District_EN: h.District_EN ?? null,
          District_TC: h.District_TC ?? null,
          Latitude: h.Latitude ?? null,
          Longitude: h.Longitude ?? null,
          Keyword_EN: h.Keyword_EN ?? null,
          Keyword_TC: h.Keyword_TC ?? null,
          Opening_Hours: h.Opening_Hours ?? null,
          Seats: h.Seats ?? null,
          Contacts: h.Contacts ?? null,
          ImageUrl: this.sanitizeImageUrl(h.ImageUrl) ?? this.randomRestaurantPlaceholder(),
          Payments: this.sanitizePayments(h.Payments),
          ownerId: h.ownerId ?? h.Owner ?? null,
          reviewsId: h.reviewsId ?? null,
          rating: h.rating ?? null
        }));

        return {
          hits,
          nbHits: response.nbHits ?? 0,
          page: response.page ?? 0,
          nbPages: response.nbPages ?? 0
        };
      }),
      catchError((err: any) => {
        console.error('RestaurantsService: Backend search error:', err);
        return of({ hits: [], nbHits: 0, page: 0, nbPages: 0 });
      })
    );
  }

  /// Get all restaurants from API (fallback for non-search scenarios)
  getRestaurants(): Observable<Restaurant[]> {
    const cached = this.restaurantsCache.getValue();
    if (cached && cached.length > 0 && this.isCacheValid(this.restaurantsCacheTimestamp, 600_000)) {
      return of(cached);
    }

    return this.dataService.get<{ count: number; data: Restaurant[] }>(this.restaurantsEndpoint).pipe(
      map(response => response.data || []),
      tap(list => {
        console.log('RestaurantsService: Fetched', list.length, 'restaurants');
        this.restaurantsCache.next(list);
        this.restaurantsCacheTimestamp = Date.now();
      }),
      catchError(err => {
        console.error('RestaurantsService: getRestaurants error', err);
        this.restaurantsCache.next([]);
        return of([]);
      })
    );
  }

  /// Get a single restaurant by ID from server API
  getRestaurantById(id: string): Observable<Restaurant | null> {
    if (!id) return of(null);

    // Return cached entry if still within TTL
    if (this.restaurantCache.has(id) && this.isCacheValid(this.restaurantCache.get(id)!.timestamp, 600_000)) {
      console.log('RestaurantsService: Cache hit for restaurant:', id);
      return of(this.restaurantCache.get(id)!.data);
    }

    console.log('RestaurantsService: Fetching restaurant:', id);
    return this.dataService.get<Restaurant>(`${this.restaurantsEndpoint}/${encodeURIComponent(id)}`).pipe(
      map(response => {
        // Map response to Restaurant interface ensuring all fields are present
        const restaurant: Restaurant = {
          id: response.id ?? id,
          Name_EN: response.Name_EN ?? null,
          Name_TC: response.Name_TC ?? null,
          Address_EN: response.Address_EN ?? null,
          Address_TC: response.Address_TC ?? null,
          District_EN: response.District_EN ?? null,
          District_TC: response.District_TC ?? null,
          Latitude: response.Latitude ?? null,
          Longitude: response.Longitude ?? null,
          Keyword_EN: response.Keyword_EN ?? null,
          Keyword_TC: response.Keyword_TC ?? null,
          Opening_Hours: response.Opening_Hours ?? null,
          Seats: response.Seats ?? null,
          Contacts: response.Contacts ?? null,
          ImageUrl: this.sanitizeImageUrl(response.ImageUrl) ?? this.randomRestaurantPlaceholder(),
          ownerId: response.ownerId ?? null,
          Payments: this.sanitizePayments(response.Payments),
          reviewsId: response.reviewsId ?? null,
          createdAt: response.createdAt,
          modifiedAt: response.modifiedAt
        };
        console.log('RestaurantsService: Restaurant fetched successfully');
        return restaurant;
      }),
      tap(restaurant => {
        if (restaurant) {
          this.restaurantCache.set(id, { data: restaurant, timestamp: Date.now() });
        }
      }),
      catchError(err => {
        console.error('RestaurantsService: getRestaurantById error', err);
        return of(null);
      })
    );
  }

  /// Get menu items for a specific restaurant from sub-collection.
  /// Note: Menu items are stored as a sub-collection, not an array field.
  /// Pass forceRefresh after menu mutations so the management UI bypasses stale TTL cache data.
  getMenuItems(restaurantId: string, forceRefresh = false): Observable<MenuItem[]> {
    if (!restaurantId) return of([]);

    // Return cached entry if still within TTL
    if (!forceRefresh && this.menuCache.has(restaurantId) && this.isCacheValid(this.menuCache.get(restaurantId)!.timestamp, 600_000)) {
      console.log('RestaurantsService: Cache hit for menu items:', restaurantId);
      return of(this.menuCache.get(restaurantId)!.data);
    }

    console.log('RestaurantsService: Fetching menu for restaurant:', restaurantId);
    const endpoint = `${this.restaurantsEndpoint}/${encodeURIComponent(restaurantId)}/menu`;

    return this.dataService.get<{ count: number; data: MenuItem[] }>(endpoint).pipe(
      map(response => {
        // Sanitise ImageUrl for each menu item
        return (response.data || []).map(item => ({
          ...item,
          ImageUrl: this.sanitizeImageUrl(item.imageUrl)
        }));
      }),
      tap(items => {
        console.log('RestaurantsService: Fetched', items.length, 'menu items');
        this.menuCache.set(restaurantId, { data: items, timestamp: Date.now() });
      }),
      catchError(err => {
        console.error('RestaurantsService: getMenuItems error', err);
        return of([]);
      })
    );
  }

  /// Get a single menu item by ID from a restaurant's menu sub-collection
  getMenuItem(restaurantId: string, menuItemId: string): Observable<MenuItem | null> {
    if (!restaurantId || !menuItemId) return of(null);

    console.log('RestaurantsService: Fetching menu item:', menuItemId);
    const endpoint = `${this.restaurantsEndpoint}/${encodeURIComponent(restaurantId)}/menu/${encodeURIComponent(menuItemId)}`;

    return this.dataService.get<MenuItem>(endpoint).pipe(
      map(item => {
        if (!item) return null;
        // Sanitise ImageUrl for the menu item
        return {
          ...item,
          ImageUrl: this.sanitizeImageUrl(item.imageUrl)
        };
      }),
      catchError(err => {
        console.error('RestaurantsService: getMenuItem error', err);
        return of(null);
      })
    );
  }

  /// Create a new restaurant (requires authentication if enabled)
  createRestaurant(payload: Partial<Restaurant>): Observable<{ id: string }> {
    console.log('RestaurantsService: Creating restaurant');
    return this.dataService.post<{ id: string }>(this.restaurantsEndpoint, payload).pipe(
      tap(response => {
        console.log('RestaurantsService: Restaurant created:', response.id);
        this.restaurantsCacheTimestamp = 0;
        this.restaurantsCache.next(null); // Invalidate cache
      }),
      catchError((err: any) => {
        console.error('RestaurantsService: createRestaurant error', err);
        throw err;
      })
    );
  }

  /// Update an existing restaurant
  updateRestaurant(id: string, payload: Partial<Restaurant>): Observable<void> {
    console.log('RestaurantsService: Updating restaurant:', id);
    return this.dataService.put<void>(`${this.restaurantsEndpoint}/${encodeURIComponent(id)}`, payload).pipe(
      tap(() => {
        console.log('RestaurantsService: Restaurant updated successfully');
        this.restaurantCache.delete(id);
        this.menuCache.delete(id);
        this.restaurantsCacheTimestamp = 0;
        this.restaurantsCache.next(null); // Invalidate cache
      }),
      catchError((err: any) => {
        console.error('RestaurantsService: updateRestaurant error', err);
        throw err;
      })
    );
  }

  /// Delete a restaurant
  deleteRestaurant(id: string): Observable<void> {
    console.log('RestaurantsService: Deleting restaurant:', id);
    return this.dataService.delete<void>(`${this.restaurantsEndpoint}/${encodeURIComponent(id)}`).pipe(
      tap(() => {
        console.log('RestaurantsService: Restaurant deleted successfully');
        this.restaurantCache.delete(id);
        this.menuCache.delete(id);
        this.restaurantsCacheTimestamp = 0;
        this.restaurantsCache.next(null); // Invalidate cache
      }),
      catchError((err: any) => {
        console.error('RestaurantsService: deleteRestaurant error', err);
        throw err;
      })
    );
  }

  /// Create a menu item in a restaurant's menu sub-collection
  createMenuItem(restaurantId: string, payload: Partial<MenuItem>): Observable<{ id: string }> {
    console.log('RestaurantsService: Creating menu item for restaurant:', restaurantId);
    const endpoint = `${this.restaurantsEndpoint}/${encodeURIComponent(restaurantId)}/menu`;

    return this.dataService.post<{ id: string }>(endpoint, payload).pipe(
      tap(response => {
        console.log('RestaurantsService: Menu item created:', response.id);
        this.menuCache.delete(restaurantId);
      }),
      catchError((err: any) => {
        console.error('RestaurantsService: createMenuItem error', err);
        throw err;
      })
    );
  }

  /// Update a menu item in a restaurant's menu sub-collection
  updateMenuItem(restaurantId: string, menuItemId: string, payload: Partial<MenuItem>): Observable<void> {
    console.log('RestaurantsService: Updating menu item:', menuItemId);
    const endpoint = `${this.restaurantsEndpoint}/${encodeURIComponent(restaurantId)}/menu/${encodeURIComponent(menuItemId)}`;

    return this.dataService.put<void>(endpoint, payload).pipe(
      tap(() => {
        console.log('RestaurantsService: Menu item updated successfully');
        this.menuCache.delete(restaurantId);
      }),
      catchError((err: any) => {
        console.error('RestaurantsService: updateMenuItem error', err);
        throw err;
      })
    );
  }

  /// Delete a menu item from a restaurant's menu sub-collection
  deleteMenuItem(restaurantId: string, menuItemId: string): Observable<void> {
    console.log('RestaurantsService: Deleting menu item:', menuItemId);
    const endpoint = `${this.restaurantsEndpoint}/${encodeURIComponent(restaurantId)}/menu/${encodeURIComponent(menuItemId)}`;

    return this.dataService.delete<void>(endpoint).pipe(
      tap(() => {
        console.log('RestaurantsService: Menu item deleted successfully');
        this.menuCache.delete(restaurantId);
      }),
      catchError((err: any) => {
        console.error('RestaurantsService: deleteMenuItem error', err);
        throw err;
      })
    );
  }

  /// Upload restaurant hero image.
  /// Uses the API endpoint: POST /API/Restaurants/:id/image
  uploadRestaurantImage(restaurantId: string, file: File, authToken: string): Observable<{ imageUrl: string }> {
    console.log('RestaurantsService: Uploading restaurant image for:', restaurantId);
    const endpoint = `${this.restaurantsEndpoint}/${encodeURIComponent(restaurantId)}/image`;

    return this.dataService.uploadFile<{ imageUrl: string }>(endpoint, file, 'image', authToken).pipe(
      tap(response => {
        console.log('RestaurantsService: Restaurant image uploaded successfully:', response.imageUrl);
        this.restaurantCache.delete(restaurantId);
        this.menuCache.delete(restaurantId);
        this.restaurantsCacheTimestamp = 0;
        this.restaurantsCache.next(null); // Invalidate cache
      }),
      catchError((err: any) => {
        console.error('RestaurantsService: uploadRestaurantImage error', err);
        throw err;
      })
    );
  }

  /// Upload menu item image.
  /// Uploads the image and updates the menu item with the returned URL.
  uploadMenuItemImage(restaurantId: string, menuItemId: string, file: File, authToken: string): Observable<{ imageUrl: string }> {
    console.log('RestaurantsService: Uploading menu item image for:', menuItemId);
    // Use the restaurant image endpoint to upload, then update the menu item
    const uploadEndpoint = `${this.restaurantsEndpoint}/${encodeURIComponent(restaurantId)}/image`;

    return this.dataService.uploadFile<{ imageUrl: string }>(uploadEndpoint, file, 'image', authToken).pipe(
      switchMap(response => {
        console.log('RestaurantsService: Menu item image uploaded successfully:', response.imageUrl);
        // Wait for the menu item update so parent refreshes see the final image URL.
        return this.updateMenuItem(restaurantId, menuItemId, { imageUrl: response.imageUrl }).pipe(
          tap(() => console.log('RestaurantsService: Menu item updated with new image URL')),
          map(() => response)
        );
      }),
      catchError((err: any) => {
        console.error('RestaurantsService: uploadMenuItemImage error', err);
        throw err;
      })
    );
  }

  /// Claim ownership of a restaurant.
  /// Requires authentication and user must be of type 'restaurant'.
  claimRestaurant(restaurantId: string, authToken: string): Observable<{ message: string; restaurantId: string; userId: string }> {
    console.log('RestaurantsService: Claiming restaurant:', restaurantId);
    const endpoint = `${this.restaurantsEndpoint}/${encodeURIComponent(restaurantId)}/claim`;

    return this.dataService.post<{ message: string; restaurantId: string; userId: string }>(endpoint, {}, authToken).pipe(
      tap(response => {
        console.log('RestaurantsService: Restaurant claimed successfully:', response);
        this.restaurantsCacheTimestamp = 0;
        this.restaurantsCache.next(null); // Invalidate cache
      }),
      catchError((err: any) => {
        console.error('RestaurantsService: claimRestaurant error', err);
        throw err;
      })
    );
  }

  /// Fetch nearby restaurants using the backend Haversine endpoint.
  /// Returns restaurants sorted by distance (nearest first) with a `distance` field in metres.
  getNearbyRestaurants(
    lat: number,
    lng: number,
    radiusMetres: number = 5000
  ): Observable<(Restaurant & { distance: number })[]> {
    const endpoint = `${this.restaurantsEndpoint}/nearby?lat=${lat}&lng=${lng}&radius=${radiusMetres}`;
    console.log('RestaurantsService: Fetching nearby restaurants:', endpoint);

    return this.dataService.get<{ count: number; data: any[] }>(endpoint).pipe(
      map(response => {
        return (response.data || []).map((r: any) => ({
          id: r.id ?? '',
          Name_EN: r.Name_EN ?? null,
          Name_TC: r.Name_TC ?? null,
          Address_EN: r.Address_EN ?? null,
          Address_TC: r.Address_TC ?? null,
          District_EN: r.District_EN ?? null,
          District_TC: r.District_TC ?? null,
          Latitude: r.Latitude ?? null,
          Longitude: r.Longitude ?? null,
          Keyword_EN: r.Keyword_EN ?? null,
          Keyword_TC: r.Keyword_TC ?? null,
          Opening_Hours: r.Opening_Hours ?? null,
          Seats: r.Seats ?? null,
          Contacts: r.Contacts ?? null,
          ImageUrl: this.sanitizeImageUrl(r.ImageUrl) ?? this.randomRestaurantPlaceholder(),
          Payments: this.sanitizePayments(r.Payments),
          ownerId: r.ownerId ?? r.Owner ?? null,
          reviewsId: r.reviewsId ?? null,
          distance: r.distance ?? 0
        }));
      }),
      tap(list => {
        console.log('RestaurantsService: Found', list.length, 'nearby restaurants');
      }),
      catchError(err => {
        console.error('RestaurantsService: getNearbyRestaurants error', err);
        return of([]);
      })
    );
  }

  /// Clear local cache
  clearCache(): void {
    this.restaurantsCache.next(null);
    console.log('RestaurantsService: Cache cleared');
  }
}
