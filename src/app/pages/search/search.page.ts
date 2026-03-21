// Search page component with multi-district and multi-keyword filtering (EN-primary).
// Supports list/map view toggle and Near Me proximity search.
import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom, debounceTime, Subject, Observable } from 'rxjs';
import { RestaurantsService, Restaurant } from '../../services/restaurants.service';
import { LanguageService } from '../../services/language.service';
import { PlatformService } from '../../services/platform.service';
import { LocationService, Coordinates } from '../../services/location.service';
import { Districts } from '../../constants/districts.const';
import { Keywords } from '../../constants/keywords.const';
import { environment } from '../../../environments/environment';

interface DistrictOption {
  district_en: string;
  district_tc: string;
}

interface KeywordOption {
  value_en: string;
  label_en: string;
  label_tc: string;
}

interface Translations {
  searchTitle: { EN: string; TC: string };
  searchSubtitle: { EN: string; TC: string };
  searchPlaceholder: { EN: string; TC: string };
  allDistricts: { EN: string; TC: string };
  allCategories: { EN: string; TC: string };
  clearFilters: { EN: string; TC: string };
  restaurantsFound: { EN: string; TC: string };
  loading: { EN: string; TC: string };
  noResults: { EN: string; TC: string };
  tryDifferent: { EN: string; TC: string };
  viewDetails: { EN: string; TC: string };
  nearMe: { EN: string; TC: string };
  away: { EN: string; TC: string };
  gettingLocation: { EN: string; TC: string };
  locationDenied: { EN: string; TC: string };
}

@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
  standalone: false,
})
export class SearchPage implements OnInit, OnDestroy {
  // Search and filter state
  public searchQuery: string = ''; // Free-text query (user input)
  public selectedDistrictTokens: string[] = []; // EN tokens for districts (canonical)
  public selectedKeywordTokens: string[] = []; // EN tokens for keywords (canonical)

  // Results
  public restaurants: Restaurant[] = [];
  public isLoading: boolean = false;
  public totalResults: number = 0;
  public currentPage: number = 0;
  public totalPages: number = 0;
  public readonly resultsPerPage: number = 12;
  public readonly placeholderImage: string = environment.placeholderImageUrl || 'assets/icon/Placeholder.png';

  // Map view state
  public viewMode: 'list' | 'map' = 'list';
  public isNearMeActive: boolean = false;
  public isNearMeLoading: boolean = false;
  public nearbyRestaurants: (Restaurant & { distance: number })[] = [];
  public userLocation: Coordinates | null = null;
  private map: google.maps.Map | null = null;
  private markers: google.maps.Marker[] = [];
  private infoWindow: google.maps.InfoWindow | null = null;
  private nearMeCircle: google.maps.Circle | null = null;
  private userMarker: google.maps.Marker | null = null;

  // Available options (store bilingual objects)
  public availableDistricts: DistrictOption[] = [];
  public availableKeywords: KeywordOption[] = [];

  // Language and platform observables
  public lang$ = this.languageService.lang$;
  public isMobile$: Observable<boolean>;
  private currentLang: 'EN' | 'TC' = 'EN';

  // Subscriptions to clean up
  private subscriptions: Subscription[] = [];
  private searchSubject = new Subject<void>();
  private optionsLoaded = false;

  // Translations for all UI text
  public translations: Translations = {
    searchTitle: { EN: 'Search Restaurants', TC: '搜尋餐廳' },
    searchSubtitle: { EN: 'Find your favourite vegetarian spot', TC: '尋找您喜愛的素食餐廳' },
    searchPlaceholder: { EN: 'Search by name or keyword...', TC: '按名稱或分類搜尋...' },
    allDistricts: { EN: 'All Districts', TC: '所有地區' },
    allCategories: { EN: 'All Categories', TC: '所有分類' },
    clearFilters: { EN: 'Clear All', TC: '清除所有' },
    restaurantsFound: { EN: 'restaurants found', TC: '間餐廳符合' },
    loading: { EN: 'Loading...', TC: '正在載入...' },
    noResults: { EN: 'No Restaurants Found', TC: '沒有找到餐廳' },
    tryDifferent: { EN: 'Try adjusting your search or filters', TC: '嘗試調整您的搜尋或篩選條件' },
    viewDetails: { EN: 'View Details', TC: '查看詳情' },
    nearMe: { EN: 'Near Me', TC: '附近' },
    away: { EN: 'away', TC: '距離' },
    gettingLocation: { EN: 'Getting your location...', TC: '正在取得位置...' },
    locationDenied: { EN: 'Please enable location access in your browser settings.', TC: '請在瀏覽器設定中啟用位置存取權限。' },
  };

  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly languageService: LanguageService,
    private readonly alertController: AlertController,
    private readonly platformService: PlatformService,
    private readonly locationService: LocationService,
    private readonly router: Router
  ) {
    this.isMobile$ = this.platformService.isMobile$;
  }

  // Component initialisation
  public ngOnInit(): void {
    // Subscribe to language to update labels
    const langSub = this.lang$.subscribe(lang => {
      this.currentLang = (lang === 'TC') ? 'TC' : 'EN';
      // Reload options whenever language changes so labels are consistent
      this.loadFilterOptions();
    });
    this.subscriptions.push(langSub);

    // Set up debounced search for input changes
    const searchSub = this.searchSubject.pipe(
      debounceTime(300)
    ).subscribe(() => {
      this.currentPage = 0;
      this.performSearch();
    });
    this.subscriptions.push(searchSub);

    // Load filters and initial search
    this.loadFilterOptions();
    this.performSearch();
  }

  // Clean up subscriptions and map resources
  public ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    this.searchSubject.complete();
    this.cleanupMap();
  }

  // Handle search input with debounce
  public onSearchInput(): void {
    this.searchSubject.next();
  }

  // Load available districts and keywords from centralized constants
  private loadFilterOptions(): void {
    // Only load once to avoid unnecessary processing
    if (this.optionsLoaded && this.availableDistricts.length > 0) {
      return;
    }

    // Convert centralized Districts to DistrictOption format
    this.availableDistricts = Districts.map(d => ({
      district_en: d.en,
      district_tc: d.tc
    }));

    // Convert centralized Keywords to KeywordOption format
    this.availableKeywords = Keywords.map(k => ({
      value_en: k.en,
      label_en: k.en,
      label_tc: k.tc
    }));

    // Sort by label in current language
    const labelKey = this.currentLang === 'TC' ? 'district_tc' : 'district_en';
    this.availableDistricts.sort((a, b) => (a[labelKey] || '').localeCompare(b[labelKey] || ''));
    this.availableKeywords.sort((a, b) => (this.currentLang === 'TC' ? a.label_tc : a.label_en)
      .localeCompare(this.currentLang === 'TC' ? b.label_tc : b.label_en));

    this.optionsLoaded = true;
  }

  // Build an Algolia-style filter string from selected districts and keywords.
  // Example output:
  // District_EN:"Kowloon" OR District_EN:"Wan Chai" AND (Keyword_EN:"veggie" OR Keyword_EN:"vegan")
  private buildAlgoliaFilter(selectedDistricts: string[], selectedKeywords: string[]): string | undefined {
    // Normalise tokens and remove empties
    const districts = (selectedDistricts || []).map(d => String(d || '').trim()).filter(Boolean);
    const keywords = (selectedKeywords || []).map(k => String(k || '').trim()).filter(Boolean);

    let districtClause = '';
    let keywordClause = '';

    if (districts.length > 0) {
      // Build OR clause for districts
      districtClause = districts.map(d => `District_EN:"${this.escapeFilterValue(d)}"`).join(' OR ');
    }

    if (keywords.length > 0) {
      // Build OR clause for keywords
      keywordClause = keywords.map(k => `Keyword_EN:"${this.escapeFilterValue(k)}"`).join(' OR ');
      // Wrap keywords in parentheses to combine with other clauses correctly
      if (keywordClause) keywordClause = `(${keywordClause})`;
    }

    if (districtClause && keywordClause) {
      return `${districtClause} AND ${keywordClause}`;
    } else if (districtClause) {
      return districtClause;
    } else if (keywordClause) {
      return keywordClause;
    } else {
      return undefined; // No filters
    }
  }

  // Escape double quotes inside filter values to avoid breaking the filter string.
  private escapeFilterValue(value: string): string {
    return value.replace(/"/g, '\\"');
  }

  // Main search call. This function supports extracting inline filters from the text query
  // using the syntax: district:Kowloon,Wan Chai keyword:veggie,vegan
  public async performSearch(append: boolean = false): Promise<void> {
    // Don't set loading if we're appending (for infinite scroll)
    if (!append) {
      this.isLoading = true;
    }

    try {
      // Parse inline filters from searchQuery if present.
      // Remove extracted filters from the free-text query to avoid Algolia matching on them twice.
      const { cleanedQuery, parsedDistricts, parsedKeywords } = this.parseFiltersFromQuery(this.searchQuery);

      // Consolidate filters: union of UI-selected and inline-parsed filters (EN tokens).
      const combinedDistricts = Array.from(new Set([...(this.selectedDistrictTokens || []), ...(parsedDistricts || [])]));
      const combinedKeywords = Array.from(new Set([...(this.selectedKeywordTokens || []), ...(parsedKeywords || [])]));

      // Build Algolia filters string
      const algoliaFilters = this.buildAlgoliaFilter(combinedDistricts, combinedKeywords);

      // Determine language for display; pass 'EN'|'TC' to service as required
      const currentLang = this.currentLang;

      // Call the restaurantsService with a filter string.
      const response = await firstValueFrom(this.restaurantsService.searchRestaurantsWithFilters(
        cleanedQuery || '',
        algoliaFilters,
        currentLang,
        this.currentPage,
        this.resultsPerPage
      ));

      // Update UI state
      if (append) {
        // Append new results for infinite scroll
        this.restaurants = [...this.restaurants, ...(response.hits || [])];
      } else {
        // Replace results for new search
        this.restaurants = response.hits || [];
      }
      this.totalResults = response.nbHits || 0;
      this.totalPages = response.nbPages || 0;
      this.isLoading = false;

      // Update map markers if in map view
      if (this.viewMode === 'map' && this.map) {
        this.updateMapMarkers();
      }
    } catch (err: any) {
      console.error('SearchPage: performSearch failed', err);
      this.isLoading = false;
      if (!append) {
        this.restaurants = [];
        this.totalResults = 0;
      }
    }
  }

  // Parse inline filter tokens from free-text query.
  // Recognises patterns like:
  // - district:Kowloon, Wan Chai
  // - districts:(Kowloon|Wan Chai)
  // - keyword:veggie,vegan
  // Returns cleaned free-text query and arrays of parsed EN tokens.
  private parseFiltersFromQuery(query: string): { cleanedQuery: string; parsedDistricts: string[]; parsedKeywords: string[] } {
    if (!query) return { cleanedQuery: '', parsedDistricts: [], parsedKeywords: [] };

    let working = query;
    const parsedDistricts: string[] = [];
    const parsedKeywords: string[] = [];

    // Regex helpers
    const districtRegex = /districts?\s*:\s*(\([^)]*\)|"[^"]*"|'[^']*'|[^\s]+)/i;
    const keywordRegex = /keywords?\s*:\s*(\([^)]*\)|"[^"]*"|'[^']*'|[^\s]+)/i;

    const extract = (regex: RegExp, targetArray: string[]) => {
      const match = working.match(regex);
      if (match && match[1]) {
        let raw = match[1].trim();

        // Remove surrounding parentheses or quotes
        if ((raw.startsWith('(') && raw.endsWith(')')) || ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")))) {
          raw = raw.slice(1, -1);
        }

        // Split on comma or pipe or semicolon
        const parts = raw.split(/[,|;]+/).map(p => p.trim()).filter(Boolean);
        parts.forEach(p => {
          // Keep as-is: we treat parsed tokens as EN tokens; user must use EN tokens in inline syntax
          targetArray.push(p);
        });

        // Remove the matched token from the working query
        working = working.replace(match[0], '').trim();
      }
    };

    // Extract districts and keywords
    extract(districtRegex, parsedDistricts);
    extract(keywordRegex, parsedKeywords);

    // Clean extra whitespace
    const cleanedQuery = working.replace(/\s+/g, ' ').trim();

    return { cleanedQuery, parsedDistricts, parsedKeywords };
  }

  // Get display-friendly district label (single selected district)
  public get selectedDistrict(): string {
    if (this.selectedDistrictTokens.length === 0) return '';
    const token = this.selectedDistrictTokens[0];
    const district = this.availableDistricts.find(d => d.district_en === token);
    return this.currentLang === 'TC' ? (district?.district_tc || token) : (district?.district_en || token);
  }

  // Get display-friendly keyword label (single selected keyword)
  public get selectedKeyword(): string {
    if (this.selectedKeywordTokens.length === 0) return '';
    const token = this.selectedKeywordTokens[0];
    const keyword = this.availableKeywords.find(k => k.value_en === token);
    return this.currentLang === 'TC' ? (keyword?.label_tc || token) : (keyword?.label_en || token);
  }

  // Open the district selector using checkboxes (multiple selection supported).
  public async openDistrictFilter(): Promise<void> {
    const currentLang = this.currentLang;
    // Build inputs with label in UI language but value as EN token
    const inputs = [
      {
        type: 'checkbox' as const,
        label: currentLang === 'TC' ? '所有地區' : 'All Districts',
        value: '',
        checked: this.selectedDistrictTokens.length === 0
      },
      ...this.availableDistricts.map(d => ({
        type: 'checkbox' as const,
        label: currentLang === 'TC' ? d.district_tc : d.district_en,
        value: d.district_en,
        checked: this.selectedDistrictTokens.includes(d.district_en)
      }))
    ];

    const alert = await this.alertController.create({
      header: currentLang === 'TC' ? '選擇地區' : 'Select District(s)',
      subHeader: currentLang === 'TC'
        ? '選擇特定地區會自動取消「所有地區」'
        : 'Selecting specific districts will automatically deselect "All Districts"',
      inputs,
      buttons: [
        { text: currentLang === 'TC' ? '取消' : 'Cancel', role: 'cancel' },
        {
          text: 'OK',
          handler: (values: string[]) => {
            // Filter out falsy values first
            const selectedValues = Array.isArray(values) ? values.filter(Boolean) : [];

            // If the All option was checked along with specific districts, prioritise specific districts
            if (values && values.includes('') && selectedValues.length > 0) {
              this.selectedDistrictTokens = selectedValues;
            } else if (values && values.includes('')) {
              // Only All option was checked, clear selection
              this.selectedDistrictTokens = [];
            } else {
              // Only specific districts were checked
              this.selectedDistrictTokens = selectedValues;
            }
            this.currentPage = 0;
            this.performSearch();
          }
        }
      ]
    });
    await alert.present();
  }

  // Open the keyword selector using checkboxes (multiple selection supported).
  public async openKeywordFilter(): Promise<void> {
    const currentLang = this.currentLang;
    // Build inputs with label in UI language but value as EN token
    const inputs = [
      {
        type: 'checkbox' as const,
        label: currentLang === 'TC' ? '所有分類' : 'All Categories',
        value: '',
        checked: this.selectedKeywordTokens.length === 0
      },
      ...this.availableKeywords.map(k => ({
        type: 'checkbox' as const,
        label: currentLang === 'TC' ? k.label_tc : k.label_en,
        value: k.value_en,
        checked: this.selectedKeywordTokens.includes(k.value_en)
      }))
    ];

    const alert = await this.alertController.create({
      header: currentLang === 'TC' ? '選擇分類' : 'Select Category(ies)',
      subHeader: currentLang === 'TC'
        ? '選擇特定分類會自動取消「所有分類」'
        : 'Selecting specific categories will automatically deselect "All Categories"',
      inputs,
      buttons: [
        { text: currentLang === 'TC' ? '取消' : 'Cancel', role: 'cancel' },
        {
          text: 'OK',
          handler: (values: string[]) => {
            // Filter out falsy values first
            const selectedValues = Array.isArray(values) ? values.filter(Boolean) : [];

            // If the All option was checked along with specific keywords, prioritise specific keywords
            if (values && values.includes('') && selectedValues.length > 0) {
              this.selectedKeywordTokens = selectedValues;
            } else if (values && values.includes('')) {
              // Only All option was checked, clear selection
              this.selectedKeywordTokens = [];
            } else {
              // Only specific keywords were checked
              this.selectedKeywordTokens = selectedValues;
            }
            this.currentPage = 0;
            this.performSearch();
          }
        }
      ]
    });
    await alert.present();
  }

  // Clear all districts (from chip close button)
  public clearDistrict(event: Event): void {
    event.stopPropagation();
    this.selectedDistrictTokens = [];
    this.currentPage = 0;
    this.performSearch();
  }

  // Clear all keywords (from chip close button)
  public clearKeyword(event: Event): void {
    event.stopPropagation();
    this.selectedKeywordTokens = [];
    this.currentPage = 0;
    this.performSearch();
  }

  // Remove a specific district tag
  public removeDistrictTag(districtToken: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedDistrictTokens = this.selectedDistrictTokens.filter(d => d !== districtToken);
    this.currentPage = 0;
    this.performSearch();
  }

  // Remove a specific keyword tag
  public removeKeywordTag(keywordToken: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedKeywordTokens = this.selectedKeywordTokens.filter(k => k !== keywordToken);
    this.currentPage = 0;
    this.performSearch();
  }

  // Get display label for a district token
  public getDistrictLabel(token: string): string {
    const district = this.availableDistricts.find(d => d.district_en === token);
    return this.currentLang === 'TC' ? (district?.district_tc || token) : (district?.district_en || token);
  }

  // Get display label for a keyword token
  public getKeywordLabel(token: string): string {
    const keyword = this.availableKeywords.find(k => k.value_en === token);
    return this.currentLang === 'TC' ? (keyword?.label_tc || token) : (keyword?.label_en || token);
  }

  // Clear all selected filters
  public clearAllFilters(): void {
    this.selectedDistrictTokens = [];
    this.selectedKeywordTokens = [];
    this.searchQuery = '';
    this.currentPage = 0;
    this.performSearch();
  }

  // Get keywords to display for a restaurant (limited to 2, with overflow indicator)
  public getDisplayKeywords(restaurant: Restaurant): string[] {
    const keywords = this.currentLang === 'TC' ? restaurant.Keyword_TC : restaurant.Keyword_EN;
    if (!keywords || keywords.length === 0) return [];
    return keywords.slice(0, 2);
  }

  // Get total keyword count for a restaurant
  public getKeywordCount(restaurant: Restaurant): number {
    const keywords = this.currentLang === 'TC' ? restaurant.Keyword_TC : restaurant.Keyword_EN;
    return keywords ? keywords.length : 0;
  }

  // Infinite scroll handler
  public async loadMore(event: any): Promise<void> {
    // Check if there are more pages to load
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      await this.performSearch(true); // Append mode
      event.target.complete();
    } else {
      // No more data to load
      event.target.complete();
      event.target.disabled = true;
    }
  }

  // Get the current display list (nearby results or normal search results)
  public getDisplayRestaurants(): (Restaurant & { distance?: number })[] {
    return this.isNearMeActive ? this.nearbyRestaurants : this.restaurants;
  }

  // Toggle between list and map view
  public toggleViewMode(): void {
    if (this.viewMode === 'map') {
      // Switching to map — initialise after DOM update
      setTimeout(() => this.initializeSearchMap(), 50);
    } else {
      this.cleanupMap();
    }
  }

  // Initialise Google Map for search results
  private initializeSearchMap(): void {
    const container = document.getElementById('search-map');
    if (!container || this.map) return;

    const centre = this.userLocation
      ? { lat: this.userLocation.latitude, lng: this.userLocation.longitude }
      : { lat: 22.3193, lng: 114.1694 }; // Hong Kong centre

    this.map = new google.maps.Map(container, {
      center: centre,
      zoom: 12,
      mapTypeControl: false,
      fullscreenControl: true,
      zoomControl: true,
      streetViewControl: false
    });

    this.infoWindow = new google.maps.InfoWindow();
    this.updateMapMarkers();
  }

  // Update markers on the map to reflect current results
  private updateMapMarkers(): void {
    if (!this.map) return;

    // Clear existing markers
    this.markers.forEach(m => m.setMap(null));
    this.markers = [];

    const displayList = this.getDisplayRestaurants();
    const bounds = new google.maps.LatLngBounds();
    let hasValidMarkers = false;

    for (const restaurant of displayList) {
      if (!restaurant.Latitude || !restaurant.Longitude ||
          isNaN(restaurant.Latitude) || isNaN(restaurant.Longitude)) {
        continue;
      }

      const position = { lat: restaurant.Latitude, lng: restaurant.Longitude };
      const name = this.currentLang === 'TC'
        ? (restaurant.Name_TC || restaurant.Name_EN || '—')
        : (restaurant.Name_EN || restaurant.Name_TC || '—');
      const district = this.currentLang === 'TC'
        ? (restaurant.District_TC || restaurant.District_EN || '')
        : (restaurant.District_EN || restaurant.District_TC || '');

      const marker = new google.maps.Marker({
        position,
        map: this.map,
        title: name
      });

      // Build InfoWindow content
      const distanceText = (restaurant as any).distance != null
        ? `<p style="margin:0.25rem 0;color:#666;font-size:0.8rem;">
            ${(restaurant as any).distance < 1000
              ? ((restaurant as any).distance + 'm')
              : (((restaurant as any).distance / 1000).toFixed(1) + 'km')}
            ${this.currentLang === 'TC' ? '距離' : 'away'}
          </p>`
        : '';

      const imgSrc = restaurant.ImageUrl || this.placeholderImage;
      const imgHtml = `<img src="${imgSrc}" alt="${name}" style="width:100%;height:80px;object-fit:cover;border-radius:6px;margin-bottom:0.25rem;">`;

      const content = `
        <div style="max-width:200px;font-family:system-ui,sans-serif;">
          ${imgHtml}
          <h4 style="margin:0.25rem 0;font-size:0.95rem;font-weight:600;">${name}</h4>
          <p style="margin:0.25rem 0;color:#666;font-size:0.8rem;">${district}</p>
          ${distanceText}
          <a href="/restaurant/${restaurant.id}" style="display:inline-block;margin-top:0.25rem;color:#4A46E8;font-size:0.8rem;text-decoration:none;font-weight:500;">
            ${this.currentLang === 'TC' ? '查看詳情 →' : 'View Details →'}
          </a>
        </div>
      `;

      marker.addListener('click', () => {
        if (this.infoWindow) {
          this.infoWindow.setContent(content);
          this.infoWindow.open(this.map!, marker);
        }
      });

      this.markers.push(marker);
      bounds.extend(position);
      hasValidMarkers = true;
    }

    // Add user location to bounds if available
    if (this.userLocation) {
      bounds.extend({ lat: this.userLocation.latitude, lng: this.userLocation.longitude });
    }

    // Fit map to show all markers
    if (hasValidMarkers) {
      this.map.fitBounds(bounds);
      // Don't zoom in too close for a single marker
      const listener = google.maps.event.addListener(this.map, 'idle', () => {
        if (this.map && this.map.getZoom()! > 16) {
          this.map.setZoom(16);
        }
        google.maps.event.removeListener(listener);
      });
    }
  }

  // Activate Near Me mode — fetch GPS and nearby restaurants
  public async activateNearMe(): Promise<void> {
    this.isNearMeLoading = true;

    try {
      // Get user location
      const coords = await firstValueFrom(this.locationService.getCurrentLocation(true));
      if (!coords) {
        console.warn('SearchPage: Could not get user location');
        this.isNearMeLoading = false;
        return;
      }

      this.userLocation = coords;

      // Fetch nearby restaurants (5km radius)
      const nearby = await firstValueFrom(
        this.restaurantsService.getNearbyRestaurants(coords.latitude, coords.longitude, 5000)
      );

      this.nearbyRestaurants = nearby;
      this.isNearMeActive = true;
      this.totalResults = nearby.length;
      this.isNearMeLoading = false;

      // Update map if in map view
      if (this.viewMode === 'map' && this.map) {
        this.addUserMarker(coords);
        this.addNearMeCircle(coords, 5000);
        this.updateMapMarkers();
      }
    } catch (err) {
      console.error('SearchPage: activateNearMe error', err);
      this.isNearMeLoading = false;
    }
  }

  // Deactivate Near Me mode — revert to normal search
  public deactivateNearMe(): void {
    this.isNearMeActive = false;
    this.nearbyRestaurants = [];
    this.removeNearMeCircle();
    this.removeUserMarker();
    this.currentPage = 0;
    this.performSearch();
  }

  // Add a blue circle overlay showing the nearby radius
  private addNearMeCircle(coords: Coordinates, radiusMetres: number): void {
    this.removeNearMeCircle();
    if (!this.map) return;

    this.nearMeCircle = new google.maps.Circle({
      map: this.map,
      center: { lat: coords.latitude, lng: coords.longitude },
      radius: radiusMetres,
      fillColor: '#4A46E8',
      fillOpacity: 0.08,
      strokeColor: '#4A46E8',
      strokeOpacity: 0.3,
      strokeWeight: 2
    });
  }

  // Remove Near Me circle from map
  private removeNearMeCircle(): void {
    if (this.nearMeCircle) {
      this.nearMeCircle.setMap(null);
      this.nearMeCircle = null;
    }
  }

  // Add a marker for the user's location
  private addUserMarker(coords: Coordinates): void {
    this.removeUserMarker();
    if (!this.map) return;

    this.userMarker = new google.maps.Marker({
      position: { lat: coords.latitude, lng: coords.longitude },
      map: this.map,
      title: this.currentLang === 'TC' ? '你的位置' : 'Your location',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2
      }
    });
  }

  // Remove user location marker
  private removeUserMarker(): void {
    if (this.userMarker) {
      this.userMarker.setMap(null);
      this.userMarker = null;
    }
  }

  // Clean up all map resources
  private cleanupMap(): void {
    this.markers.forEach(m => m.setMap(null));
    this.markers = [];
    this.removeNearMeCircle();
    this.removeUserMarker();

    if (this.infoWindow) {
      this.infoWindow.close();
      this.infoWindow = null;
    }

    if (this.map) {
      this.map = null;
    }
  }

  // Format distance for display (metres to readable string)
  public formatDistance(distanceMetres: number): string {
    if (distanceMetres < 1000) {
      return `${Math.round(distanceMetres)}m`;
    }
    return `${(distanceMetres / 1000).toFixed(1)}km`;
  }
}