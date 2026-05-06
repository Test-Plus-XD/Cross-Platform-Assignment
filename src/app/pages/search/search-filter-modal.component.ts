import { Component, Input, OnInit, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';

export interface SearchFilterDistrictOption {
  district_en: string;
  district_tc: string;
}

export interface SearchFilterKeywordOption {
  value_en: string;
  label_en: string;
  label_tc: string;
}

export interface SearchFilterPaymentOption {
  en: string;
  tc: string;
}

export type SearchSortMode = 'relevance' | 'rating' | 'distance' | 'open';

export interface SearchFilterState {
  selectedDistrictTokens: string[];
  selectedKeywordTokens: string[];
  openNowOnly: boolean;
  minimumRating: number;
  selectedPaymentTokens: string[];
  maximumDistanceKilometres: number | null;
  sortMode: SearchSortMode;
}

type FilterTab = 'districts' | 'categories' | 'refine';

@Component({
  selector: 'app-search-filter-modal',
  templateUrl: './search-filter-modal.component.html',
  styleUrls: ['./search-filter-modal.component.scss'],
  standalone: false
})
export class SearchFilterModalComponent implements OnInit {
  private readonly modalController = inject(ModalController);

  @Input() lang: 'EN' | 'TC' = 'EN';
  @Input() availableDistricts: SearchFilterDistrictOption[] = [];
  @Input() availableKeywords: SearchFilterKeywordOption[] = [];
  @Input() paymentMethods: SearchFilterPaymentOption[] = [];
  @Input() initialState!: SearchFilterState;
  @Input() startTab: FilterTab = 'districts';
  @Input() hasLocationContext = false;

  public selectedTab: FilterTab = 'districts';
  public districtSearchQuery = '';
  public keywordSearchQuery = '';
  public selectedDistrictTokens: string[] = [];
  public selectedKeywordTokens: string[] = [];
  public selectedPaymentTokens: string[] = [];
  public openNowOnly = false;
  public minimumRating = 0;
  public maximumDistanceKilometres: number | null = null;
  public sortMode: SearchSortMode = 'relevance';
  public readonly ratingOptions = [0, 3, 3.5, 4, 4.5];
  public readonly distanceOptions = [1, 2, 5, 10];

  // Copies the caller's state so the modal can be cancelled without mutating the page.
  public ngOnInit(): void {
    this.selectedTab = this.startTab;
    this.selectedDistrictTokens = [...(this.initialState?.selectedDistrictTokens || [])];
    this.selectedKeywordTokens = [...(this.initialState?.selectedKeywordTokens || [])];
    this.selectedPaymentTokens = [...(this.initialState?.selectedPaymentTokens || [])];
    this.openNowOnly = !!this.initialState?.openNowOnly;
    this.minimumRating = this.initialState?.minimumRating || 0;
    this.maximumDistanceKilometres = this.initialState?.maximumDistanceKilometres ?? null;
    this.sortMode = this.initialState?.sortMode || 'relevance';
  }

  // Returns district options matching the local search box.
  public get filteredDistricts(): SearchFilterDistrictOption[] {
    const query = this.districtSearchQuery.trim().toLowerCase();
    if (!query) return this.availableDistricts;
    return this.availableDistricts.filter(district =>
      district.district_en.toLowerCase().includes(query) || district.district_tc.toLowerCase().includes(query)
    );
  }

  // Returns keyword options matching the local search box.
  public get filteredKeywords(): SearchFilterKeywordOption[] {
    const query = this.keywordSearchQuery.trim().toLowerCase();
    if (!query) return this.availableKeywords;
    return this.availableKeywords.filter(keyword =>
      keyword.label_en.toLowerCase().includes(query) || keyword.label_tc.toLowerCase().includes(query)
    );
  }

  // Builds a concise count shown in the modal header.
  public get selectedCount(): number {
    return this.selectedDistrictTokens.length
      + this.selectedKeywordTokens.length
      + this.selectedPaymentTokens.length
      + (this.openNowOnly ? 1 : 0)
      + (this.minimumRating > 0 ? 1 : 0)
      + (this.maximumDistanceKilometres ? 1 : 0)
      + (this.sortMode !== 'relevance' ? 1 : 0);
  }

  // Returns true when a district is currently selected.
  public isDistrictSelected(token: string): boolean {
    return this.selectedDistrictTokens.includes(token);
  }

  // Returns true when a keyword is currently selected.
  public isKeywordSelected(token: string): boolean {
    return this.selectedKeywordTokens.includes(token);
  }

  // Returns true when a payment method is currently selected.
  public isPaymentSelected(token: string): boolean {
    return this.selectedPaymentTokens.includes(token);
  }

  // Toggles a district token in the draft state.
  public toggleDistrict(token: string): void {
    this.selectedDistrictTokens = this.toggleToken(this.selectedDistrictTokens, token);
  }

  // Toggles a keyword token in the draft state.
  public toggleKeyword(token: string): void {
    this.selectedKeywordTokens = this.toggleToken(this.selectedKeywordTokens, token);
  }

  // Toggles a payment token in the draft state.
  public togglePayment(token: string): void {
    this.selectedPaymentTokens = this.toggleToken(this.selectedPaymentTokens, token);
  }

  // Reuses immutable token toggling so Angular updates every chip state cleanly.
  private toggleToken(tokens: string[], token: string): string[] {
    return tokens.includes(token)
      ? tokens.filter(currentToken => currentToken !== token)
      : [...tokens, token];
  }

  // Chooses the minimum rating refinement.
  public setMinimumRating(rating: number): void {
    this.minimumRating = rating;
  }

  // Chooses or clears the distance refinement.
  public setMaximumDistance(kilometres: number | null): void {
    this.maximumDistanceKilometres = kilometres;
  }

  // Clears every draft filter while leaving the modal open.
  public clearAll(): void {
    this.selectedDistrictTokens = [];
    this.selectedKeywordTokens = [];
    this.selectedPaymentTokens = [];
    this.openNowOnly = false;
    this.minimumRating = 0;
    this.maximumDistanceKilometres = null;
    this.sortMode = 'relevance';
  }

  // Closes the modal without applying the draft state.
  public dismiss(): void {
    this.modalController.dismiss(null, 'cancel');
  }

  // Applies the draft state back to SearchPage.
  public apply(): void {
    const state: SearchFilterState = {
      selectedDistrictTokens: this.selectedDistrictTokens,
      selectedKeywordTokens: this.selectedKeywordTokens,
      openNowOnly: this.openNowOnly,
      minimumRating: this.minimumRating,
      selectedPaymentTokens: this.selectedPaymentTokens,
      maximumDistanceKilometres: this.maximumDistanceKilometres,
      sortMode: this.sortMode
    };
    this.modalController.dismiss(state, 'apply');
  }
}
