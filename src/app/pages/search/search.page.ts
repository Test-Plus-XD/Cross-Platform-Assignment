// Search page with bilingual text search and district + keyword filters (EN primary)
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, combineLatest, of, firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged, startWith, switchMap, takeUntil } from 'rxjs/operators';
import { RestaurantsService, Restaurant } from '../../services/restaurants.service';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';

interface District {
  District_EN: string;
  District_TC: string;
}

interface KeywordOption {
  value_en: string;
  value_tc: string;
  label_en: string;
  label_tc: string;
}

interface SearchResponse {
  hits: Restaurant[];
  nbHits: number;
  page: number;
  nbPages: number;
}

@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
  standalone: false,
})
export class SearchPage implements OnInit, OnDestroy {
  // Form controls for query, district and keyword (EN values stored)
  searchControl = new FormControl('');
  districtControl = new FormControl(''); // Should store District_EN value
  keywordControl = new FormControl(''); // Should store keyword value_en

  // Streams for language and theme
  lang$ = this.language.lang$;
  isDark$ = this.theme.isDark$;

  // Accumulated search results shown in the UI
  results: Restaurant[] = [];

  // Loading and error flags
  isLoading = false;
  errorMessage: string | null = null;

  // Pagination settings
  private readonly hitsPerPage = 8; // Records per page
  private currentPage = 0; // Zero-based page index
  private nbPages = 0; // Total pages returned by Algolia

  // District list for the select
  districts: District[] = [];

  // Keyword options (bilingual); values are EN primary
  keywordOptions: KeywordOption[] = [
    { value_en: 'veggie', value_tc: '素食', label_en: 'Veggie', label_tc: '素食' },
    { value_en: 'vegetarian', value_tc: '齋', label_en: 'Vegetarian', label_tc: '齋' },
    { value_en: 'vegan', value_tc: '純素', label_en: 'Vegan', label_tc: '純素' }
  ];

  // Destroy subject for unsubscribing
  private destroy$ = new Subject<void>();

  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly http: HttpClient,
    private readonly language: LanguageService,
    private readonly theme: ThemeService
  ) { }

  ngOnInit(): void {
    this.loadDistricts();

    // Combine search text, district and language to trigger a fresh search
    const searchText$ = this.searchControl.valueChanges.pipe(
      startWith(this.searchControl.value || ''),
      debounceTime(2500), // Debounce typing to reduce requests
      distinctUntilChanged()
    );

    const district$ = this.districtControl.valueChanges.pipe(
      startWith(this.districtControl.value || ''),
      distinctUntilChanged()
    );

    const keyword$ = this.keywordControl.valueChanges.pipe(
      startWith(this.keywordControl.value || ''),
      distinctUntilChanged()
    );

    // Combine text, district, keyword and language - reset pagination on any change
    combineLatest([searchText$, district$, keyword$, this.lang$]).pipe(
      switchMap(([searchText, districtValueEn, selectedKeywordEn, lang]) => {
        // Reset pagination and results
        this.currentPage = 0;
        this.nbPages = 0;
        this.results = [];
        this.isLoading = true;
        this.errorMessage = null;

        // Ensure districtValueEn is a string (EN primary)
        const districtEn = String(districtValueEn || '').trim();

        // Ensure selectedKeyword is EN primary: keywordControl holds EN tokens
        const selectedKeyword = selectedKeywordEn ? String(selectedKeywordEn).trim() : null;

        // Call service with EN primary filters
        return this.restaurantsService.searchRestaurants(
          String(searchText || ''),
          districtEn,
          selectedKeyword,
          (lang === 'TC' ? 'TC' : 'EN'),
          this.currentPage,
          this.hitsPerPage
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: SearchResponse) => {
        this.results = response.hits || [];
        this.nbPages = response.nbPages || 0;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Search initial query failed', err);
        this.errorMessage = 'Search failed.';
        this.isLoading = false;
      }
    });
  }

  // Load more results for infinite scroll
  async loadMore(event: any): Promise<void> {
    if (this.isLoading) {
      event.target.complete();
      return;
    }
    if (this.currentPage + 1 >= this.nbPages) {
      event.target.complete();
      event.target.disabled = true;
      return;
    }

    this.currentPage += 1;
    this.isLoading = true;

    try {
      // Get current language
      const lang = await firstValueFrom(this.lang$.pipe(takeUntil(this.destroy$))) || 'EN';

      // districtControl stores EN value (EN primary)
      const districtEn = String(this.districtControl.value || '').trim();

      // keywordControl stores EN value; use directly as EN primary
      const selectedKeywordEn = this.keywordControl.value ? String(this.keywordControl.value).trim() : null;

      // Fetch next page
      const response = await firstValueFrom(this.restaurantsService.searchRestaurants(
        String(this.searchControl.value || ''),
        districtEn,
        selectedKeywordEn,
        (lang === 'TC' ? 'TC' : 'EN'),
        this.currentPage,
        this.hitsPerPage
      ));

      if (response) {
        this.results = this.results.concat(response.hits || []);
        this.nbPages = response.nbPages || this.nbPages;
      }

      event.target.complete();

      if (this.currentPage + 1 >= this.nbPages) {
        event.target.disabled = true;
      }
    } catch (err: any) {
      console.error('Load more failed', err);
      this.errorMessage = 'Failed to load more results.';
      event.target.complete();
    } finally {
      this.isLoading = false;
    }
  }

  // Load districts JSON from assets with fallback
  private loadDistricts(): void {
    this.http.get<District[]>('/assets/districts.json').pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (list) => {
        if (Array.isArray(list) && list.length > 0) {
          // Ensure we store EN values in the control options
          this.districts = list;
        }
      },
      error: (err: any) => {
        console.warn('SearchPage.loadDistricts: failed to load assets/districts.json, using fallback', err);
        this.districts = this.getFallbackDistricts();
      }
    });
  }

  private getFallbackDistricts(): District[] {
    return [
      { District_EN: 'Islands', District_TC: '離島' },
      { District_EN: 'Kwai Tsing', District_TC: '葵青' },
      { District_EN: 'North', District_TC: '北區' },
      { District_EN: 'Sai Kung', District_TC: '西貢' },
      { District_EN: 'Sha Tin', District_TC: '沙田' },
      { District_EN: 'Tai Po', District_TC: '大埔' },
      { District_EN: 'Tsuen Wan', District_TC: '荃灣' },
      { District_EN: 'Tuen Mun', District_TC: '屯門' },
      { District_EN: 'Yuen Long', District_TC: '元朗' },
      { District_EN: 'Kowloon City', District_TC: '九龍城' },
      { District_EN: 'Kwun Tong', District_TC: '觀塘' },
      { District_EN: 'Sham Shui Po', District_TC: '深水埗' },
      { District_EN: 'Wong Tai Sin', District_TC: '黃大仙' },
      { District_EN: 'Yau Tsim Mong', District_TC: '油尖旺區' },
      { District_EN: 'Central/Western', District_TC: '中西區' },
      { District_EN: 'Eastern', District_TC: '東區' },
      { District_EN: 'Southern', District_TC: '南區' },
      { District_EN: 'Wan Chai', District_TC: '灣仔' }
    ];
  }

  // Utility to format district label
  districtLabel(d: District, lang: 'EN' | 'TC'): string {
    return lang === 'TC' ? d.District_TC : d.District_EN;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}