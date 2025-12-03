// Service to fetch restaurants from backend API and perform Algolia searches
// This service handles CRUD operations and integrates with the Vercel API
import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { DataService } from './data.service';
import { searchClient, SearchClient } from '@algolia/client-search';

// Interface for menu items stored in sub-collection
// Note: Menu items are stored as a sub-collection in Firestore, not as an array field
export interface MenuItem {
  id?: string;
  Name_EN?: string | null;
  Name_TC?: string | null;
  Price?: number | null;
  Description_EN?: string | null;
  Description_TC?: string | null;
  ImageUrl?: string | null;
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
  ownerID?: string | null;
  reviewsId?: string[] | null;
  createdAt?: any;
  modifiedAt?: any;
}

@Injectable({ providedIn: 'root' })
export class RestaurantsService {
  // Base endpoint for restaurant operations
  private readonly restaurantsEndpoint = '/API/Restaurants';
  // Algolia index name for restaurant searches
  private readonly algoliaIndexName = 'Restaurants';
  // Algolia client initialised with search-only key for client queries
  private readonly algoliaClient: SearchClient;
  // Local cache to reduce network calls
  private readonly restaurantsCache = new BehaviorSubject<Restaurant[] | null>(null);

  constructor(private readonly dataService: DataService) {
    console.log('RestaurantsService: Initialised');
    // Initialise Algolia client with credentials from environment
    this.algoliaClient = searchClient(environment.algoliaAppId, environment.algoliaSearchKey);
  }

  /**
   * Sanitize image URL to handle backend em dash replacement.
   * The backend replaces null/undefined with '—' (em dash), which causes 404 errors.
   * This helper returns null for invalid URLs so components can use their placeholder logic.
   */
  private sanitizeImageUrl(url: any): string | null {
    if (!url || url === '—' || url === '' || url === 'null' || url === 'undefined') {
      return null;
    }
    return url;
  }

  // Search restaurants using Algolia with pagination and filters
  // Uses the array request form for broad compatibility with Algolia client
  searchRestaurants(
    query: string,
    districtEn: string,
    selectedKeywordEn: string | null,
    lang: 'EN' | 'TC',
    page = 0,
    hitsPerPage = 10
  ): Observable<{ hits: Restaurant[]; nbHits: number; page: number; nbPages: number }> {
    // Helper function to escape and quote filter values properly
    const quoteFilterValue = (value: string): string => {
      const safe = String(value || '').replace(/"/g, '').trim();
      return /\s/.test(safe) ? `"${safe}"` : safe;
    };

    // Build filter string using AND to combine multiple conditions
    const filterParts: string[] = [];
    if (districtEn && districtEn.trim() !== '') {
      filterParts.push(`District_EN:${quoteFilterValue(districtEn)}`);
    }
    if (selectedKeywordEn && selectedKeywordEn.trim() !== '') {
      filterParts.push(`Keyword_EN:${quoteFilterValue(selectedKeywordEn)}`);
    }
    const filtersString = filterParts.length ? filterParts.join(' AND ') : undefined;

    // Build params object for Algolia search request
    const params: any = {
      query: query ?? '',
      page,
      hitsPerPage
    };
    if (filtersString) params.filters = filtersString;

    console.log('RestaurantsService: Algolia search params:', JSON.stringify(params));

    // Use the array-request form which reliably returns results[0]
    return new Observable(observer => {
      this.algoliaClient.search([
        {
          indexName: this.algoliaIndexName,
          params
        }
      ])
        .then((result: any) => {
          // Normalise result structure expecting result.results[0]
          const searchResult = result && Array.isArray(result.results) ? result.results[0] : null;
          if (!searchResult) {
            observer.next({ hits: [], nbHits: 0, page: 0, nbPages: 0 });
            observer.complete();
            return;
          }

          // Map Algolia hits to Restaurant interface
          const hits: Restaurant[] = (searchResult.hits || []).map((h: any) => ({
            id: h.objectID,
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
            ImageUrl: this.sanitizeImageUrl(h.ImageUrl),
            ownerID: h.ownerID ?? h.Owner ?? null,
            reviewsId: h.reviewsId ?? null
          }));

          observer.next({
            hits,
            nbHits: searchResult.nbHits ?? 0,
            page: searchResult.page ?? 0,
            nbPages: searchResult.nbPages ?? 0
          });
          observer.complete();
        })
        .catch((err: any) => {
          console.error('RestaurantsService: Algolia search error:', err);
          observer.error(err);
        });
    });
  }

  // Search using Algolia with custom filter string and pagination
  // Supports multi-district and multi-keyword filters with EN-primary tokens
  // Uses backend API endpoint instead of direct Algolia client
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
          ImageUrl: this.sanitizeImageUrl(h.ImageUrl),
          ownerID: h.ownerID ?? h.Owner ?? null,
          Payments: h.Payments ?? null,
          reviewsId: h.reviewsId ?? null
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

  // Get all restaurants from API (fallback for non-search scenarios)
  getRestaurants(): Observable<Restaurant[]> {
    const cached = this.restaurantsCache.getValue();
    if (cached && cached.length > 0) {
      return of(cached);
    }

    return this.dataService.get<{ count: number; data: Restaurant[] }>(this.restaurantsEndpoint).pipe(
      map(response => response.data || []),
      tap(list => {
        console.log('RestaurantsService: Fetched', list.length, 'restaurants');
        this.restaurantsCache.next(list);
      }),
      catchError(err => {
        console.error('RestaurantsService: getRestaurants error', err);
        this.restaurantsCache.next([]);
        return of([]);
      })
    );
  }

  // Get a single restaurant by ID from server API
  getRestaurantById(id: string): Observable<Restaurant | null> {
    if (!id) return of(null);

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
          ImageUrl: this.sanitizeImageUrl(response.ImageUrl),
          ownerID: response.ownerID ?? response.Owner ?? null,
          Payments: response.Payments ?? null,
          reviewsId: response.reviewsId ?? null,
          createdAt: response.createdAt,
          modifiedAt: response.modifiedAt
        };
        console.log('RestaurantsService: Restaurant fetched successfully');
        return restaurant;
      }),
      catchError(err => {
        console.error('RestaurantsService: getRestaurantById error', err);
        return of(null);
      })
    );
  }

  // Get menu items for a specific restaurant from sub-collection
  // Note: Menu items are stored as a sub-collection, not an array field
  getMenuItems(restaurantId: string): Observable<MenuItem[]> {
    if (!restaurantId) return of([]);

    console.log('RestaurantsService: Fetching menu for restaurant:', restaurantId);
    const endpoint = `${this.restaurantsEndpoint}/${encodeURIComponent(restaurantId)}/menu`;

    return this.dataService.get<{ count: number; data: MenuItem[] }>(endpoint).pipe(
      map(response => {
        // Sanitize ImageUrl for each menu item
        return (response.data || []).map(item => ({
          ...item,
          ImageUrl: this.sanitizeImageUrl(item.ImageUrl)
        }));
      }),
      tap(items => {
        console.log('RestaurantsService: Fetched', items.length, 'menu items');
      }),
      catchError(err => {
        console.error('RestaurantsService: getMenuItems error', err);
        return of([]);
      })
    );
  }

  // Get a single menu item by ID from a restaurant's menu sub-collection
  getMenuItem(restaurantId: string, menuItemId: string): Observable<MenuItem | null> {
    if (!restaurantId || !menuItemId) return of(null);

    console.log('RestaurantsService: Fetching menu item:', menuItemId);
    const endpoint = `${this.restaurantsEndpoint}/${encodeURIComponent(restaurantId)}/menu/${encodeURIComponent(menuItemId)}`;

    return this.dataService.get<MenuItem>(endpoint).pipe(
      map(item => {
        if (!item) return null;
        // Sanitize ImageUrl for the menu item
        return {
          ...item,
          ImageUrl: this.sanitizeImageUrl(item.ImageUrl)
        };
      }),
      catchError(err => {
        console.error('RestaurantsService: getMenuItem error', err);
        return of(null);
      })
    );
  }

  // Create a new restaurant (requires authentication if enabled)
  createRestaurant(payload: Partial<Restaurant>): Observable<{ id: string }> {
    console.log('RestaurantsService: Creating restaurant');
    return this.dataService.post<{ id: string }>(this.restaurantsEndpoint, payload).pipe(
      tap(response => {
        console.log('RestaurantsService: Restaurant created:', response.id);
        this.restaurantsCache.next(null); // Invalidate cache
      }),
      catchError((err: any) => {
        console.error('RestaurantsService: createRestaurant error', err);
        throw err;
      })
    );
  }

  // Update an existing restaurant
  updateRestaurant(id: string, payload: Partial<Restaurant>): Observable<void> {
    console.log('RestaurantsService: Updating restaurant:', id);
    return this.dataService.put<void>(`${this.restaurantsEndpoint}/${encodeURIComponent(id)}`, payload).pipe(
      tap(() => {
        console.log('RestaurantsService: Restaurant updated successfully');
        this.restaurantsCache.next(null); // Invalidate cache
      }),
      catchError((err: any) => {
        console.error('RestaurantsService: updateRestaurant error', err);
        throw err;
      })
    );
  }

  // Delete a restaurant
  deleteRestaurant(id: string): Observable<void> {
    console.log('RestaurantsService: Deleting restaurant:', id);
    return this.dataService.delete<void>(`${this.restaurantsEndpoint}/${encodeURIComponent(id)}`).pipe(
      tap(() => {
        console.log('RestaurantsService: Restaurant deleted successfully');
        this.restaurantsCache.next(null); // Invalidate cache
      }),
      catchError((err: any) => {
        console.error('RestaurantsService: deleteRestaurant error', err);
        throw err;
      })
    );
  }

  // Create a menu item in a restaurant's menu sub-collection
  createMenuItem(restaurantId: string, payload: Partial<MenuItem>): Observable<{ id: string }> {
    console.log('RestaurantsService: Creating menu item for restaurant:', restaurantId);
    const endpoint = `${this.restaurantsEndpoint}/${encodeURIComponent(restaurantId)}/menu`;

    return this.dataService.post<{ id: string }>(endpoint, payload).pipe(
      tap(response => {
        console.log('RestaurantsService: Menu item created:', response.id);
      }),
      catchError((err: any) => {
        console.error('RestaurantsService: createMenuItem error', err);
        throw err;
      })
    );
  }

  // Update a menu item in a restaurant's menu sub-collection
  updateMenuItem(restaurantId: string, menuItemId: string, payload: Partial<MenuItem>): Observable<void> {
    console.log('RestaurantsService: Updating menu item:', menuItemId);
    const endpoint = `${this.restaurantsEndpoint}/${encodeURIComponent(restaurantId)}/menu/${encodeURIComponent(menuItemId)}`;

    return this.dataService.put<void>(endpoint, payload).pipe(
      tap(() => {
        console.log('RestaurantsService: Menu item updated successfully');
      }),
      catchError((err: any) => {
        console.error('RestaurantsService: updateMenuItem error', err);
        throw err;
      })
    );
  }

  // Delete a menu item from a restaurant's menu sub-collection
  deleteMenuItem(restaurantId: string, menuItemId: string): Observable<void> {
    console.log('RestaurantsService: Deleting menu item:', menuItemId);
    const endpoint = `${this.restaurantsEndpoint}/${encodeURIComponent(restaurantId)}/menu/${encodeURIComponent(menuItemId)}`;

    return this.dataService.delete<void>(endpoint).pipe(
      tap(() => {
        console.log('RestaurantsService: Menu item deleted successfully');
      }),
      catchError((err: any) => {
        console.error('RestaurantsService: deleteMenuItem error', err);
        throw err;
      })
    );
  }

  // Clear local cache
  clearCache(): void {
    this.restaurantsCache.next(null);
    console.log('RestaurantsService: Cache cleared');
  }
}