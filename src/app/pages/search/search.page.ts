// Search page component with multi-district and multi-keyword filtering (EN-primary).
import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Subscription, firstValueFrom, debounceTime, Subject, Observable } from 'rxjs';
import { RestaurantsService, Restaurant } from '../../services/restaurants.service';
import { LanguageService } from '../../services/language.service';
import { PlatformService } from '../../services/platform.service';

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
    viewDetails: { EN: 'View Details', TC: '查看詳情' }
  };

  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly languageService: LanguageService,
    private readonly alertController: AlertController,
    private readonly platformService: PlatformService
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

  // Clean up subscriptions
  public ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    this.searchSubject.complete();
  }

  // Handle search input with debounce
  public onSearchInput(): void {
    this.searchSubject.next();
  }

  // Load available districts and keywords from restaurants dataset
  // and build canonical EN-keyed lists to use as radio/checkbox values.
  private loadFilterOptions(): void {
    // Only load once to avoid unnecessary network calls
    if (this.optionsLoaded && this.availableDistricts.length > 0) {
      return;
    }

    // Fetch all restaurants (small dataset assumed). If your dataset is large,
    // consider a dedicated endpoint for just distinct districts/keywords.
    const optionsSub = this.restaurantsService.getRestaurants().subscribe({
      next: (restaurants: Restaurant[]) => {
        // Use maps keyed by EN token to deduplicate and preserve EN canonical values.
        const districtsByEn = new Map<string, DistrictOption>();
        const keywordsByEn = new Map<string, KeywordOption>();

        restaurants.forEach(r => {
          // Add district by EN token
          if (r.District_EN) {
            districtsByEn.set(r.District_EN, {
              district_en: r.District_EN,
              district_tc: r.District_TC || r.District_EN
            });
          }

          // Add keywords by EN token
          (r.Keyword_EN || []).forEach((kEn: string, idx: number) => {
            // Try to find matching TC token at same index as best-effort
            const kTc = (r.Keyword_TC && r.Keyword_TC[idx]) ? r.Keyword_TC[idx] : kEn;
            if (!keywordsByEn.has(kEn)) {
              keywordsByEn.set(kEn, { value_en: kEn, label_en: kEn, label_tc: kTc });
            }
          });
        });

        // Convert maps to arrays and sort by label in current language
        const districtArray = Array.from(districtsByEn.values());
        const keywordArray = Array.from(keywordsByEn.values());

        const labelKey = this.currentLang === 'TC' ? 'district_tc' : 'district_en';
        districtArray.sort((a, b) => (a[labelKey] || '').localeCompare(b[labelKey] || ''));
        keywordArray.sort((a, b) => (this.currentLang === 'TC' ? a.label_tc : a.label_en)
          .localeCompare(this.currentLang === 'TC' ? b.label_tc : b.label_en));

        this.availableDistricts = districtArray;
        this.availableKeywords = keywordArray;
        this.optionsLoaded = true;
      },
      error: (err: any) => {
        console.error('SearchPage: loadFilterOptions failed', err);
      }
    });
    this.subscriptions.push(optionsSub);
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
      inputs,
      buttons: [
        { text: currentLang === 'TC' ? '取消' : 'Cancel', role: 'cancel' },
        {
          text: 'OK',
          handler: (values: string[]) => {
            // If the All option was checked (value ''), clear selection
            if (values && values.includes('')) {
              this.selectedDistrictTokens = [];
            } else {
              this.selectedDistrictTokens = Array.isArray(values) ? values.filter(Boolean) : [];
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
      inputs,
      buttons: [
        { text: currentLang === 'TC' ? '取消' : 'Cancel', role: 'cancel' },
        {
          text: 'OK',
          handler: (values: string[]) => {
            // If the All option was checked (value ''), clear selection
            if (values && values.includes('')) {
              this.selectedKeywordTokens = [];
            } else {
              this.selectedKeywordTokens = Array.isArray(values) ? values.filter(Boolean) : [];
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
}