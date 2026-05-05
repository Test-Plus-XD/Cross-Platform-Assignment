// Search page component with multi-district and multi-keyword filtering (EN-primary).
// Supports list/map view toggle and Near Me proximity search.
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom, debounceTime, Subject, Observable } from 'rxjs';
import { RestaurantsService, Restaurant } from '../../services/restaurants.service';
import { LanguageService } from '../../services/language.service';
import { PlatformService } from '../../services/platform.service';
import { LocationService, Coordinates } from '../../services/location.service';
import { ReviewsService } from '../../services/reviews.service';
import { ThemeService } from '../../services/theme.service';
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
  private readonly restaurantsService = inject(RestaurantsService);
  private readonly languageService = inject(LanguageService);
  private readonly alertController = inject(AlertController);
  private readonly platformService = inject(PlatformService);
  private readonly locationService = inject(LocationService);
  private readonly reviewsService = inject(ReviewsService);
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly searchHeaderCollapseThreshold: number = 72;
  private readonly searchHeaderExpandThreshold: number = 24;
  private readonly searchHeaderCollapseTravel: number = 18;
  private readonly searchHeaderExpandTravel: number = 10;
  private readonly searchHeaderStateLockMs: number = 240;
  private lastSearchHeaderScrollTop: number = 0;
  private searchHeaderScrollAccumulator: number = 0;
  private searchHeaderStateLockUntil: number = 0;
  private lastSearchHeaderScrollDirection: 'up' | 'down' | 'idle' = 'idle';

  // Search header collapse state shrinks the sticky controls once the user scrolls down.
  public isSearchHeaderCollapsed: boolean = false;

  // Handle content scrolling with hysteresis so layout shifts from the sticky animation do not cause flicker.
  public onContentScroll(event: any): void {
    const scrollTop = Math.max(0, event.detail?.scrollTop ?? 0);
    const scrollDelta = scrollTop - this.lastSearchHeaderScrollTop;
    const currentTime = Date.now();

    if (currentTime < this.searchHeaderStateLockUntil) {
      this.lastSearchHeaderScrollTop = scrollTop;
      return;
    }

    if (Math.abs(scrollDelta) < 1) {
      this.lastSearchHeaderScrollTop = scrollTop;
      return;
    }

    const scrollDirection: 'up' | 'down' = scrollDelta > 0 ? 'down' : 'up';

    if (scrollDirection !== this.lastSearchHeaderScrollDirection) {
      this.searchHeaderScrollAccumulator = 0;
    }

    this.searchHeaderScrollAccumulator += scrollDelta;
    this.lastSearchHeaderScrollDirection = scrollDirection;

    if (!this.isSearchHeaderCollapsed) {
      if (scrollTop <= this.searchHeaderCollapseThreshold) this.searchHeaderScrollAccumulator = 0;

      if (scrollTop > this.searchHeaderCollapseThreshold
        && this.searchHeaderScrollAccumulator >= this.searchHeaderCollapseTravel) {
        this.setSearchHeaderCollapsed(true);
      }
    } else if (scrollTop <= this.searchHeaderExpandThreshold
      || this.searchHeaderScrollAccumulator <= -this.searchHeaderExpandTravel) {
      this.setSearchHeaderCollapsed(false);
    }

    this.lastSearchHeaderScrollTop = scrollTop;
  }

  // Expand the sticky header back to full size when the compact bar is tapped or focused.
  public expandSearchHeader(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.setSearchHeaderCollapsed(false);
  }

  // Update the sticky header state and briefly lock transitions while the height animation settles.
  private setSearchHeaderCollapsed(isCollapsed: boolean): void {
    if (this.isSearchHeaderCollapsed === isCollapsed) {
      return;
    }

    this.isSearchHeaderCollapsed = isCollapsed;
    this.searchHeaderScrollAccumulator = 0;
    this.lastSearchHeaderScrollDirection = 'idle';
    this.searchHeaderStateLockUntil = Date.now() + this.searchHeaderStateLockMs;
  }

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
  public isMapLoadingMore: boolean = false;
  public nearbyRestaurants: (Restaurant & { distance: number })[] = [];
  public userLocation: Coordinates | null = null;
  private map: google.maps.Map | null = null;
  private markers: google.maps.Marker[] = [];
  private infoWindow: google.maps.InfoWindow | null = null;
  private nearMeCircle: google.maps.Circle | null = null;
  private userMarker: google.maps.Marker | null = null;
  // Track the restaurant whose popup is currently open so theme changes can rebuild it live.
  private activeInfoWindowRestaurant: Restaurant | null = null;

  // Rating stats for displayed restaurants (keyed by restaurant ID)
  public ratingMap: Record<string, { totalReviews: number; averageRating: number }> = {};

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

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {
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

    // Rebuild the open InfoWindow immediately whenever the theme changes.
    const themeSub = this.themeService.isDark$.subscribe(() => {
      if (this.infoWindow && this.activeInfoWindowRestaurant) {
        this.infoWindow.setContent(this.buildInfoWindowContent(this.activeInfoWindowRestaurant));
      }
    });
    this.subscriptions.push(themeSub);

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
      // In map view, the *ngIf removes and recreates the #search-map DOM element while
      // isLoading is true, which invalidates the current Google Maps instance. Null it
      // out now so initializeSearchMap() can attach to the new element after loading.
      if (this.viewMode === 'map') {
        this.cleanupMap();
      }
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

      // Update map markers if in map view; if map isn't initialised yet (e.g. search
      // completed while isLoading hid the container), retry initialisation now.
      if (this.viewMode === 'map') {
        if (!this.map) {
          setTimeout(() => this.initializeSearchMap(), 50);
        } else {
          this.updateMapMarkers();
        }
      }

      // Fetch batch review stats for all displayed restaurants
      this.loadBatchRatings(this.restaurants);
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

  // Number of results not yet loaded (used by the map view Load More button label)
  public get mapRemainingCount(): number {
    return Math.max(0, this.totalResults - this.restaurants.length);
  }

  // Load the next Algolia page and append new markers to the map without re-initialising it
  public async loadMoreMapResults(): Promise<void> {
    if (this.isMapLoadingMore || this.currentPage >= this.totalPages - 1) return;
    this.isMapLoadingMore = true;
    this.currentPage++;
    await this.performSearch(true);
    this.isMapLoadingMore = false;
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
      streetViewControl: false,
      styles: this.themeService.getGoogleMapStylesForCurrentTheme()
    });

    this.infoWindow = new google.maps.InfoWindow();

    // Clear active restaurant reference when the popup is dismissed.
    this.infoWindow.addListener('closeclick', () => {
      this.activeInfoWindowRestaurant = null;
    });

    this.updateMapMarkers();

    // If Near Me was active when the map was cleaned up (e.g. search refresh),
    // restore the user location marker and radius circle.
    if (this.isNearMeActive && this.userLocation) {
      this.addUserMarker(this.userLocation);
      this.addNearMeCircle(this.userLocation, 5000);
    }
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

      const marker = new google.maps.Marker({
        position,
        map: this.map,
        title: name,
        icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
      });

      // Build InfoWindow content at click time so ratingMap and openStatus reflect current state.
      // ratingMap is populated asynchronously after loadBatchRatings returns; restaurant.rating
      // is used as an immediate fallback so the rating badge always shows if data is available.
      marker.addListener('click', () => {
        if (this.infoWindow) {
          this.activeInfoWindowRestaurant = restaurant;
          this.infoWindow.setContent(this.buildInfoWindowContent(restaurant));
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

      // Fetch batch review stats for nearby restaurants
      this.loadBatchRatings(nearby);

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
    this.activeInfoWindowRestaurant = null;

    if (this.infoWindow) {
      this.infoWindow.close();
      this.infoWindow = null;
    }

    if (this.map) {
      this.map = null;
    }
  }

  // Build the InfoWindow DOM content for a restaurant popup.
  // Called both on marker click and whenever the theme changes while the popup is open,
  // so the card always reflects the current light/dark palette immediately.
  private buildInfoWindowContent(restaurant: Restaurant): HTMLElement {
    const isDark = this.themeService.isDark;

    // Theme-resolved palette values
    const popupBg = isDark ? 'rgba(36,51,41,0.72)' : 'rgba(250,254,251,0.72)';
    const popupBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(19,38,30,0.10)';
    const textColor = isDark ? '#e8f2ea' : '#1a2e1f';
    const mutedColor = isDark ? '#9eada2' : '#5d6b60';
    const kwBg = isDark ? 'rgb(36,66,41)' : 'rgb(232,255,234)';
    const kwColor = isDark ? '#9fdba9' : '#2f8f43';
    const kwBorder = isDark ? '#5d9466' : '#8ac798';

    // Gradient colours matching --ion-color-primary / --ion-color-secondary per theme.
    // These are used as linearGradient stops inside inline SVG so the icons render
    // with the same purple→blue gradient as the filter chip icons.
    const gradStart = isDark ? '#9f5ce8' : '#a746f0'; // primary
    const gradEnd = isDark ? '#5ba3e0' : '#4ca5ff'; // secondary

    // Unique gradient ID per call to avoid collisions when multiple popups exist in DOM.
    const gradId = `iw-grad-${Date.now()}`;

    // Helper: build an inline SVG icon with the gradient fill/stroke.
    const makeGradientSvg = (pathData: string, size: string, useStroke: boolean): SVGSVGElement => {
      const ns = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(ns, 'svg') as SVGSVGElement;
      svg.setAttribute('viewBox', '0 0 512 512');
      svg.setAttribute('width', size);
      svg.setAttribute('height', size);
      svg.style.cssText = 'flex-shrink:0;overflow:visible;';

      const defs = document.createElementNS(ns, 'defs');
      const grad = document.createElementNS(ns, 'linearGradient');
      grad.setAttribute('id', gradId);
      grad.setAttribute('x1', '0%');
      grad.setAttribute('y1', '0%');
      grad.setAttribute('x2', '100%');
      grad.setAttribute('y2', '100%');
      const stop1 = document.createElementNS(ns, 'stop');
      stop1.setAttribute('offset', '0%');
      stop1.setAttribute('stop-color', gradStart);
      const stop2 = document.createElementNS(ns, 'stop');
      stop2.setAttribute('offset', '100%');
      stop2.setAttribute('stop-color', gradEnd);
      grad.appendChild(stop1);
      grad.appendChild(stop2);
      defs.appendChild(grad);
      svg.appendChild(defs);

      // Parse the multi-path data string (paths separated by '|') and append each.
      pathData.split('|').forEach(d => {
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', d);
        if (useStroke) {
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke', `url(#${gradId})`);
          path.setAttribute('stroke-linecap', 'round');
          path.setAttribute('stroke-linejoin', 'round');
          path.setAttribute('stroke-width', '32');
        } else {
          path.setAttribute('fill', `url(#${gradId})`);
        }
        svg.appendChild(path);
      });

      return svg;
    };

    // golf-outline paths (two paths, both stroke-based)
    const golfPaths = 'M256 400V32l176 80-176 80|M256 336c-87 0-175.3 43.2-191.64 124.74C62.39 470.57 68.57 480 80 480h352c11.44 0 17.62-9.43 15.65-19.26C431.3 379.2 343 336 256 336Z';
    // storefront-outline paths (two paths, both stroke-based)
    const storefrontPaths = 'M448 448V240M64 240v208M382.47 48H129.53c-21.79 0-41.47 12-49.93 30.46L36.3 173c-14.58 31.81 9.63 67.85 47.19 69h2c31.4 0 56.85-25.18 56.85-52.23 0 27 25.46 52.23 56.86 52.23s56.8-23.38 56.8-52.23c0 27 25.45 52.23 56.85 52.23s56.86-23.38 56.86-52.23c0 28.85 25.45 52.23 56.85 52.23h1.95c37.56-1.17 61.77-37.21 47.19-69l-43.3-94.54C423.94 60 404.26 48 382.47 48M32 464h448M136 288h80a24 24 0 0 1 24 24v88h0-128 0v-88a24 24 0 0 1 24-24M288 464V312a24 24 0 0 1 24-24h64a24 24 0 0 1 24 24v152';

    const name = this.currentLang === 'TC'
      ? (restaurant.Name_TC || restaurant.Name_EN || '—')
      : (restaurant.Name_EN || restaurant.Name_TC || '—');
    const district = this.currentLang === 'TC'
      ? (restaurant.District_TC || restaurant.District_EN || '')
      : (restaurant.District_EN || restaurant.District_TC || '');
    const addressVal = this.currentLang === 'TC'
      ? (restaurant.Address_TC || restaurant.Address_EN || '')
      : (restaurant.Address_EN || restaurant.Address_TC || '');
    const imgSrc = restaurant.ImageUrl || this.placeholderImage;

    // Distance badge HTML
    const distBadge = this.getDistanceBadge(restaurant);
    let distanceBadgeHtml = '';
    if (distBadge) {
      const distBg = distBadge.color === 'success' ? 'rgba(16,185,129,0.92)'
        : distBadge.color === 'warning' ? 'rgba(245,158,11,0.92)'
          : 'rgba(107,114,128,0.85)';
      distanceBadgeHtml = `<span style="position:absolute;top:0.4rem;right:0.4rem;font-size:0.63rem;font-weight:700;padding:2px 7px;border-radius:10px;background:${distBg};color:#fff;backdrop-filter:blur(4px);">${distBadge.text}</span>`;
    }

    // Open/close badge HTML
    const openStatus = this.getOpeningStatus(restaurant);
    const openBadgeHtml = openStatus === 'open'
      ? `<span style="position:absolute;bottom:0.4rem;left:0.4rem;font-size:0.63rem;font-weight:700;padding:2px 7px;border-radius:10px;background:rgba(76,175,80,0.92);color:#fff;">${this.currentLang === 'TC' ? '營業中' : 'Open'}</span>`
      : openStatus === 'closed'
        ? `<span style="position:absolute;bottom:0.4rem;left:0.4rem;font-size:0.63rem;font-weight:700;padding:2px 7px;border-radius:10px;background:rgba(229,57,53,0.92);color:#fff;">${this.currentLang === 'TC' ? '已關閉' : 'Closed'}</span>`
        : '';

    // Rating badge HTML
    const stats = this.ratingMap[restaurant.id];
    const avgRating = stats?.averageRating ?? restaurant.rating ?? 0;
    const ratingBadgeHtml = stats && stats.totalReviews > 0
      ? `<span style="position:absolute;bottom:0.4rem;right:0.4rem;font-size:0.63rem;font-weight:700;padding:2px 7px;border-radius:10px;background:rgba(0,0,0,.55);color:#f5c518;backdrop-filter:blur(4px);white-space:nowrap;">${this.formatRatingStars(stats.averageRating)} (${stats.totalReviews})</span>`
      : avgRating > 0
        ? `<span style="position:absolute;bottom:0.4rem;right:0.4rem;font-size:0.63rem;font-weight:700;padding:2px 7px;border-radius:10px;background:rgba(0,0,0,.55);color:#f5c518;backdrop-filter:blur(4px);white-space:nowrap;">${this.formatRatingStars(avgRating)}</span>`
        : `<span style="position:absolute;bottom:0.4rem;right:0.4rem;font-size:0.63rem;font-weight:700;padding:2px 7px;border-radius:10px;background:rgba(0,0,0,.55);color:#f5c518;backdrop-filter:blur(4px);">${this.currentLang === 'TC' ? '全新' : 'New'}</span>`;

    // Keyword tags
    const rawKw = this.currentLang === 'TC' ? restaurant.Keyword_TC : restaurant.Keyword_EN;
    const keywords: string[] = Array.isArray(rawKw) ? rawKw : [];
    const kwDisplay = keywords.slice(0, 2);
    const kwExtra = keywords.length - 2;

    // --- Build DOM ---
    const anchor = document.createElement('a');
    anchor.href = `/restaurant/${restaurant.id}`;
    anchor.style.cssText = [
      'display:block;width:260px;font-family:system-ui,sans-serif;',
      'text-decoration:none;color:inherit;cursor:pointer;',
      'border-radius:16px;overflow:hidden;',
      `background:${popupBg};`,
      `border:1px solid ${popupBorder};`,
      'backdrop-filter:blur(18px) saturate(1.6);',
      '-webkit-backdrop-filter:blur(18px) saturate(1.6);',
      'box-shadow:0 8px 32px rgba(0,0,0,0.22),0 1.5px 6px rgba(0,0,0,0.10);',
    ].join('');

    // Image section — fills the entire upper portion of the popup
    const imgSection = document.createElement('div');
    imgSection.style.cssText = 'position:relative;width:100%;height:140px;overflow:hidden;flex-shrink:0;';

    const imgEl = document.createElement('img');
    imgEl.src = imgSrc;
    imgEl.alt = name;
    imgEl.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    imgSection.appendChild(imgEl);

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:absolute;inset:0;background:linear-gradient(to bottom,transparent 35%,rgba(0,0,0,.38));';
    imgSection.appendChild(overlay);

    if (distanceBadgeHtml) { imgSection.insertAdjacentHTML('beforeend', distanceBadgeHtml); }
    imgSection.insertAdjacentHTML('beforeend', ratingBadgeHtml);
    if (openBadgeHtml) { imgSection.insertAdjacentHTML('beforeend', openBadgeHtml); }

    anchor.appendChild(imgSection);

    // Content section
    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = 'padding:0.625rem 0.75rem;background:transparent;';

    const h4 = document.createElement('h4');
    h4.style.cssText = [
      'margin:0 0 0.3rem;font-size:0.875rem;font-weight:700;',
      `color:${textColor};`,
      'line-height:1.3;display:-webkit-box;',
      '-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;',
    ].join('');
    h4.textContent = name;
    contentDiv.appendChild(h4);

    if (kwDisplay.length > 0) {
      const kwRow = document.createElement('div');
      kwRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px;margin:0 0 5px;';
      kwDisplay.forEach((k: string) => {
        const pill = document.createElement('span');
        pill.style.cssText = `font-size:0.6rem;font-weight:600;padding:1px 6px;border-radius:8px;background:${kwBg};color:${kwColor};border:1px solid ${kwBorder};white-space:nowrap;`;
        pill.textContent = k;
        kwRow.appendChild(pill);
      });
      if (kwExtra > 0) {
        const morePill = document.createElement('span');
        morePill.style.cssText = `font-size:0.6rem;font-weight:600;padding:1px 6px;border-radius:8px;background:${kwBg};color:${kwColor};border:1px solid ${kwBorder};white-space:nowrap;`;
        morePill.textContent = `+${kwExtra}`;
        kwRow.appendChild(morePill);
      }
      contentDiv.appendChild(kwRow);
    }

    // District row — golf-outline SVG with purple→blue gradient
    const districtRow = document.createElement('div');
    districtRow.style.cssText = `display:flex;align-items:center;gap:5px;font-size:0.75rem;color:${mutedColor};margin-bottom:3px;`;
    districtRow.appendChild(makeGradientSvg(golfPaths, '15px', true));
    const districtText = document.createElement('span');
    districtText.textContent = district;
    districtRow.appendChild(districtText);
    contentDiv.appendChild(districtRow);

    // Address row — storefront-outline SVG with purple→blue gradient
    if (addressVal) {
      const addressRow = document.createElement('div');
      addressRow.style.cssText = `display:flex;align-items:flex-start;gap:5px;font-size:0.7rem;color:${mutedColor};`;
      addressRow.appendChild(makeGradientSvg(storefrontPaths, '14px', true));
      const addressText = document.createElement('span');
      addressText.style.cssText = 'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;';
      addressText.textContent = addressVal;
      addressRow.appendChild(addressText);
      contentDiv.appendChild(addressRow);
    }

    anchor.appendChild(contentDiv);
    return anchor;
  }

  // Format distance for display (metres to readable string)
  public formatDistance(distanceMetres: number): string {
    if (distanceMetres < 1000) {
      return `${Math.round(distanceMetres)}m`;
    }
    return `${(distanceMetres / 1000).toFixed(1)}km`;
  }

  // Get distance badge with color-coded indicator (< 500m = green, 500m-2km = orange, > 2km = grey)
  public getDistanceBadge(restaurant: any): { text: string; color: string } | null {
    // Prefer pre-calculated distance (Near Me mode), otherwise calculate from coordinates
    if (restaurant.distance != null) {
      const meters = restaurant.distance;
      let color = 'medium';
      if (meters < 500) color = 'success';
      else if (meters < 2000) color = 'warning';
      return { text: this.formatDistance(meters), color };
    }

    if (!restaurant.Latitude || !restaurant.Longitude) return null;
    const result = this.locationService.calculateDistanceFromCurrentLocation(
      restaurant.Latitude,
      restaurant.Longitude
    );
    if (!result) return null;

    let color = 'medium';
    if (result.distanceMeters < 500) color = 'success';
    else if (result.distanceKm < 2) color = 'warning';
    return { text: result.displayText, color };
  }

  // Check if a restaurant is currently open based on Opening_Hours and HK time.
  // Returns 'unknown' only when no Opening_Hours data exists at all.
  // Missing day → 'closed'. Supports multi-period hours ("11:30-15:00, 17:30-21:30").
  public getOpeningStatus(restaurant: Restaurant): 'open' | 'closed' | 'unknown' {
    const hours = restaurant.Opening_Hours;
    if (!hours || Object.keys(hours).length === 0) return 'unknown';

    const now = new Date();
    const hkDay = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Hong_Kong', weekday: 'long' }).format(now);
    const hkTimeParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Hong_Kong', hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(now);
    const hkH = parseInt(hkTimeParts.find(p => p.type === 'hour')?.value || '0', 10);
    const hkM = parseInt(hkTimeParts.find(p => p.type === 'minute')?.value || '0', 10);
    const currentMins = hkH * 60 + hkM;

    const todayKey = Object.keys(hours).find(k => k.toLowerCase() === hkDay.toLowerCase());
    if (!todayKey) return 'closed'; // Day not listed → closed today

    const entry = hours[todayKey];
    if (!entry) return 'closed';

    if (typeof entry === 'string') {
      // Match all time ranges — supports multi-period e.g. "11:30-15:00, 17:30-21:30"
      const regex = /(\d{1,2}:\d{2})\s*[-–~]\s*(\d{1,2}:\d{2})/g;
      let match;
      while ((match = regex.exec(entry)) !== null) {
        const [oH, oM] = match[1].split(':').map(Number);
        const [cH, cM] = match[2].split(':').map(Number);
        if (currentMins >= oH * 60 + oM && currentMins < cH * 60 + cM) return 'open';
      }
      return 'closed';
    } else if (typeof entry === 'object' && entry !== null && entry.open && entry.close) {
      const [openH, openM] = (entry.open as string).split(':').map(Number);
      const [closeH, closeM] = (entry.close as string).split(':').map(Number);
      return currentMins >= openH * 60 + openM && currentMins < closeH * 60 + closeM ? 'open' : 'closed';
    }

    return 'closed';
  }

  // Fetch review stats for a batch of restaurants and populate ratingMap
  private loadBatchRatings(restaurants: Restaurant[]): void {
    const ids = restaurants.map(r => r.id).filter(Boolean);
    if (ids.length === 0) return;

    this.reviewsService.getBatchStats(ids).subscribe({
      next: (statsMap) => {
        this.ratingMap = { ...this.ratingMap, ...statsMap };
      },
      error: (err) => {
        console.warn('SearchPage: Failed to load batch ratings', err);
      }
    });
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
}
