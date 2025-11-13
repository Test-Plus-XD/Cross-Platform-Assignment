// Search page with bilingual text search and district + keyword filters (EN primary)
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { RestaurantsService, Restaurant } from '../../services/restaurants.service';
import { LanguageService } from '../../services/language.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
  standalone: false,
})
export class SearchPage implements OnInit, OnDestroy {
  // Search state
  public searchQuery: string = '';
  public selectedDistrict: string = '';
  public selectedKeyword: string = '';

  // Results state
  public restaurants: Restaurant[] = [];
  public isLoading: boolean = false;
  public totalResults: number = 0;
  public currentPage: number = 0;
  public totalPages: number = 0;
  public readonly resultsPerPage: number = 12;

  // Available filter options
  public availableDistricts: string[] = [];
  public availableKeywords: string[] = [];

  // Language observable
  public lang$ = this.languageService.lang$;

  // Comprehensive translations
  public translations = {
    searchTitle: { EN: 'Discover Restaurants', TC: '探索餐廳' },
    searchSubtitle: { EN: 'Find your perfect dining experience', TC: '尋找完美的用餐體驗' },
    searchPlaceholder: { EN: 'Search restaurants...', TC: '搜尋餐廳...' },
    allDistricts: { EN: 'All Districts', TC: '所有地區' },
    allCategories: { EN: 'All Categories', TC: '所有分類' },
    clearFilters: { EN: 'Clear All', TC: '清除全部' },
    restaurantsFound: { EN: 'restaurants found', TC: '間餐廳' },
    loading: { EN: 'Searching...', TC: '搜尋中...' },
    noResults: { EN: 'No restaurants found', TC: '找不到餐廳' },
    tryDifferent: { EN: 'Try adjusting your search filters', TC: '嘗試調整搜尋條件' },
    viewDetails: { EN: 'View Details', TC: '查看詳情' },
    selectDistrict: { EN: 'Select District', TC: '選擇地區' },
    selectKeyword: { EN: 'Select Category', TC: '選擇分類' },
    cancel: { EN: 'Cancel', TC: '取消' }
  };

  // Subscriptions for cleanup
  private subscriptions: Subscription[] = [];

  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly languageService: LanguageService,
    private readonly router: Router,
    private readonly alertController: AlertController
  ) { }

  ngOnInit(): void {
    // Load initial data and set up language change listener
    this.loadInitialData();

    // Subscribe to language changes to refresh filters
    const langSubscription = this.lang$.subscribe(() => {
      // Reload filter options when language changes
      this.loadFilterOptions();
    });

    this.subscriptions.push(langSubscription);
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  // Load initial data on page load
  private loadInitialData(): void {
    this.loadFilterOptions();
    this.performSearch();
  }

  // Load available filter options (districts and keywords)
  private loadFilterOptions(): void {
    // Fetch all restaurants to extract unique districts and keywords
    this.restaurantsService.getRestaurants().subscribe(
      (restaurants: Restaurant[]) => {
        // Extract unique districts
        const districts = new Set<string>();
        const keywords = new Set<string>();

        restaurants.forEach(restaurant => {
          // Add district based on current language
          const currentLang = this.getCurrentLanguage();
          if (currentLang === 'TC' && restaurant.District_TC) {
            districts.add(restaurant.District_TC);
          } else if (restaurant.District_EN) {
            districts.add(restaurant.District_EN);
          }

          // Add keywords based on current language
          if (currentLang === 'TC' && restaurant.Keyword_TC) {
            restaurant.Keyword_TC.forEach(kw => keywords.add(kw));
          } else if (restaurant.Keyword_EN) {
            restaurant.Keyword_EN.forEach(kw => keywords.add(kw));
          }
        });

        this.availableDistricts = Array.from(districts).sort();
        this.availableKeywords = Array.from(keywords).sort();
      },
      error => {
        console.error('SearchPage: Error loading filter options', error);
      }
    );
  }

  // Perform search with current filters
  public performSearch(): void {
    this.isLoading = true;
    const currentLang = this.getCurrentLanguage();

    // Get English versions of selected filters for API call
    const districtEn = this.selectedDistrict;
    const keywordEn = this.selectedKeyword;

    this.restaurantsService.searchRestaurants(
      this.searchQuery,
      districtEn,
      keywordEn,
      currentLang,
      this.currentPage,
      this.resultsPerPage
    ).subscribe(
      response => {
        this.restaurants = response.hits;
        this.totalResults = response.nbHits;
        this.totalPages = response.nbPages;
        this.isLoading = false;
      },
      error => {
        console.error('SearchPage: Search error', error);
        this.isLoading = false;
        this.restaurants = [];
        this.totalResults = 0;
      }
    );
  }

  // Handle search input with debounce
  public onSearchInput(): void {
    this.currentPage = 0; // Reset to first page on new search
    this.performSearch();
  }

  // Open district filter selector
  public async openDistrictFilter(): Promise<void> {
    const currentLang = this.getCurrentLanguage();
    const alert = await this.alertController.create({
      header: this.translations.selectDistrict[currentLang],
      inputs: [
        {
          type: 'radio',
          label: this.translations.allDistricts[currentLang],
          value: '',
          checked: !this.selectedDistrict
        },
        ...this.availableDistricts.map(district => ({
          type: 'radio' as const,
          label: district,
          value: district,
          checked: this.selectedDistrict === district
        }))
      ],
      buttons: [
        {
          text: this.translations.cancel[currentLang],
          role: 'cancel'
        },
        {
          text: 'OK',
          handler: (value: string) => {
            this.selectedDistrict = value;
            this.currentPage = 0;
            this.performSearch();
          }
        }
      ]
    });
    await alert.present();
  }

  // Open keyword filter selector
  public async openKeywordFilter(): Promise<void> {
    const currentLang = this.getCurrentLanguage();
    const alert = await this.alertController.create({
      header: this.translations.selectKeyword[currentLang],
      inputs: [
        {
          type: 'radio',
          label: this.translations.allCategories[currentLang],
          value: '',
          checked: !this.selectedKeyword
        },
        ...this.availableKeywords.map(keyword => ({
          type: 'radio' as const,
          label: keyword,
          value: keyword,
          checked: this.selectedKeyword === keyword
        }))
      ],
      buttons: [
        {
          text: this.translations.cancel[currentLang],
          role: 'cancel'
        },
        {
          text: 'OK',
          handler: (value: string) => {
            this.selectedKeyword = value;
            this.currentPage = 0;
            this.performSearch();
          }
        }
      ]
    });
    await alert.present();
  }

  // Clear district filter
  public clearDistrict(event: Event): void {
    event.stopPropagation(); // Prevent chip click from triggering
    this.selectedDistrict = '';
    this.currentPage = 0;
    this.performSearch();
  }

  // Clear keyword filter
  public clearKeyword(event: Event): void {
    event.stopPropagation(); // Prevent chip click from triggering
    this.selectedKeyword = '';
    this.currentPage = 0;
    this.performSearch();
  }

  // Clear all filters and search query
  public clearAllFilters(): void {
    this.searchQuery = '';
    this.selectedDistrict = '';
    this.selectedKeyword = '';
    this.currentPage = 0;
    this.performSearch();
  }

  // Navigate to next page
  public nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.performSearch();
      this.scrollToTop();
    }
  }

  // Navigate to previous page
  public previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.performSearch();
      this.scrollToTop();
    }
  }

  // Scroll to top of page (useful after pagination)
  private scrollToTop(): void {
    const content = document.querySelector('ion-content');
    if (content) {
      content.scrollToTop(300); // Smooth scroll with 300ms duration
    }
  }

  // Get display keywords for a restaurant (limited to first 2)
  public getDisplayKeywords(restaurant: Restaurant): string[] {
    const currentLang = this.getCurrentLanguage();
    const keywords = currentLang === 'TC' ? restaurant.Keyword_TC : restaurant.Keyword_EN;
    return keywords || [];
  }

  // Get total keyword count for a restaurant
  public getKeywordCount(restaurant: Restaurant): number {
    const currentLang = this.getCurrentLanguage();
    const keywords = currentLang === 'TC' ? restaurant.Keyword_TC : restaurant.Keyword_EN;
    return keywords?.length || 0;
  }

  // Helper to get current language value
  private getCurrentLanguage(): 'EN' | 'TC' {
    const currentLang = (this.languageService as any)._lang.value;
    return currentLang || 'EN';
  }
}