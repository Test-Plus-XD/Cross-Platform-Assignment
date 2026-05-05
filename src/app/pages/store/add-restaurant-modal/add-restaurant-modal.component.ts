// Shared full-screen modal for creating and editing restaurant listings.
// Create mode posts a new restaurant and links it to the signed-in owner profile.
// Edit mode updates the existing restaurant and keeps the former image upload flow.
import { Component, Input, OnInit, OnDestroy, AfterViewInit, inject } from '@angular/core';
import { AlertController, ToastController, LoadingController, ModalController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Restaurant } from '../../../services/restaurants.service';
import { StoreFeatureService } from '../../../services/store-feature.service';
import { ThemeService } from '../../../services/theme.service';
import { Districts } from '../../../constants/districts.const';
import { Keywords } from '../../../constants/keywords.const';
import { PaymentMethods } from '../../../constants/payments.const';
import { Weekdays } from '../../../constants/weekdays.const';

type RestaurantFormMode = 'create' | 'edit';
type TimeBoundary = 'open' | 'close';

interface ParsedOpeningHours {
  open: string;
  close: string;
  closed: boolean;
  hasValue: boolean;
}

@Component({
  selector: 'app-add-restaurant-modal',
  templateUrl: './add-restaurant-modal.component.html',
  styleUrls: ['./add-restaurant-modal.component.scss'],
  standalone: false
})
export class AddRestaurantModalComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly feature = inject(StoreFeatureService);
  private readonly modalController = inject(ModalController);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);
  private readonly loadingController = inject(LoadingController);
  private readonly defaultOpeningTime = '09:00';
  private readonly defaultClosingTime = '22:00';
  private readonly destroy$ = new Subject<void>();
  private map: google.maps.Map | null = null;
  private marker: google.maps.Marker | null = null;
  private mapInitialized = false;
  @Input() mode: RestaurantFormMode = 'create';
  @Input() restaurantId: string | null = null;
  @Input() restaurant: Restaurant | null = null;
  private readonly themeService = inject(ThemeService);


  // ── Language ──────────────────────────────────────────────────────────────────
  lang$ = this.feature.language.lang$;
  currentLanguage: 'EN' | 'TC' = 'EN';
  districts = Districts;
  keywords = Keywords;
  paymentMethods = PaymentMethods;
  weekdays = Weekdays;
  isSaving = false;
  isPageLoading = false;
  isUploadingImage = false;
  selectedRestaurantImage: File | null = null;
  restaurantImagePreview: string | null = null;
  mapMarker: { lat: number; lng: number } | null = null;
  isTimePickerOpen = false;
  activeTimePickerDay: string | null = null;
  activeTimePickerBoundary: TimeBoundary | null = null;
  activeTimePickerValue = this.defaultOpeningTime;
  form = {
    Name_EN: '',
    Name_TC: '',
    Address_EN: '',
    Address_TC: '',
    District_EN: '',
    District_TC: '',
    Latitude: null as number | null,
    Longitude: null as number | null,
    Keyword_EN: [] as string[],
    Keyword_TC: [] as string[],
    Seats: null as number | null,
    Contacts: { Phone: '', Email: '', Website: '' },
    Payments: [] as string[],
    Opening_Hours: {} as { [key: string]: string }
  };
  translations = {
    titleCreate: { EN: 'Add New Restaurant', TC: '新增餐廳' },
    titleEdit: { EN: 'Edit Restaurant Info', TC: '編輯餐廳資料' },
    cancel: { EN: 'Cancel', TC: '取消' },
    submit: { EN: 'Submit', TC: '提交' },
    saveChanges: { EN: 'Save Changes', TC: '儲存變更' },
    saving: { EN: 'Saving...', TC: '儲存中...' },
    nameRequired: { EN: 'Please enter at least one name (EN or TC)', TC: '請輸入至少一個名稱（英文或繁體中文）' },
    selectDistrict: { EN: 'Select District', TC: '選擇地區' },
    selectKeywords: { EN: 'Select Categories', TC: '選擇類別' },
    selectPayments: { EN: 'Select Payment Methods', TC: '選擇付款方式' },
    notSelected: { EN: 'Not selected', TC: '未選擇' },
    clickMapToSet: { EN: 'Tap map to pin location', TC: '點擊地圖設定位置' },
    clearLocation: { EN: 'Clear', TC: '清除' },
    successCreate: { EN: 'Restaurant added successfully!', TC: '餐廳新增成功！' },
    successEdit: { EN: 'Updated successfully', TC: '更新成功' },
    failedCreate: { EN: 'Failed to add restaurant', TC: '新增餐廳失敗' },
    failedEdit: { EN: 'Update failed', TC: '更新失敗' },
    sectionRequired: { EN: 'Restaurant Name', TC: '餐廳名稱' },
    sectionAddress: { EN: 'Address', TC: '地址' },
    sectionDetails: { EN: 'Details', TC: '詳情' },
    sectionContacts: { EN: 'Contact Info', TC: '聯絡資料' },
    sectionLocation: { EN: 'Location on Map', TC: '地圖位置' },
    sectionHours: { EN: 'Opening Hours', TC: '營業時間' },
    sectionKeywords: { EN: 'Categories', TC: '類別' },
    sectionPayments: { EN: 'Payment Methods', TC: '付款方式' },
    sectionImage: { EN: 'Restaurant Image', TC: '餐廳圖片' },
    nameEnPlaceholder: { EN: 'Name (English)', TC: '名稱（英文）' },
    nameTcPlaceholder: { EN: 'Name (Traditional Chinese)', TC: '名稱（繁體中文）' },
    addrEnPlaceholder: { EN: 'Address (English)', TC: '地址（英文）' },
    addrTcPlaceholder: { EN: 'Address (Traditional Chinese)', TC: '地址（繁體中文）' },
    closed: { EN: 'Closed', TC: '休息' },
    open: { EN: 'Open', TC: '營業' },
    from: { EN: 'From', TC: '開始' },
    to: { EN: 'To', TC: '結束' },
    notSet: { EN: 'Not set', TC: '未設定' },
    setHours: { EN: 'Set hours', TC: '設定時間' },
    clearHours: { EN: 'Clear hours', TC: '清除時間' },
    chooseTime: { EN: 'Choose time', TC: '選擇時間' },
    done: { EN: 'Done', TC: '完成' },
    currentImage: { EN: 'Current Image', TC: '當前圖片' },
    selectImage: { EN: 'Select Image', TC: '選擇圖片' },
    uploadImage: { EN: 'Upload Image', TC: '上傳圖片' },
    uploadImageHint: { EN: 'JPEG, PNG, GIF, WebP, max 10MB', TC: '支援 JPEG、PNG、GIF、WebP，最大 10MB' },
    uploadingImage: { EN: 'Uploading image...', TC: '上傳圖片中...' },
    imageUploadSuccess: { EN: 'Image uploaded successfully', TC: '圖片上傳成功' },
    imageUploadFailed: { EN: 'Image upload failed', TC: '圖片上傳失敗' },
    invalidImage: { EN: 'Please select a valid image file', TC: '請選擇有效的圖片檔案' },
    imageTooLarge: { EN: 'Image size must be less than 10MB', TC: '圖片大小必須少於 10MB' },
    loginRequired: { EN: 'Please log in first', TC: '請先登入' }
  };

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {}

  // Initialises language state and prepares edit data when the modal opens in edit mode.
  ngOnInit(): void {
    this.lang$.pipe(takeUntil(this.destroy$)).subscribe(lang => {
      this.currentLanguage = lang;
    });
    if (this.isEditMode && this.restaurant) this.initializeFormFromRestaurant(this.restaurant);
    if (this.isEditMode && (!this.restaurant || !this.restaurantId)) this.loadRestaurantDataForEdit();
  }

  // Initialises Google Maps after Ionic has finished laying out the modal content.
  ngAfterViewInit(): void {
    setTimeout(() => {
      if (!this.isPageLoading) this.initializeMap();
    }, 400);
  }

  // Cleans up Maps listeners and RxJS subscriptions when the modal is destroyed.
  ngOnDestroy(): void {
    this.destroyMap();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // True when the shared modal is editing an existing restaurant rather than creating one.
  get isEditMode(): boolean {
    return this.mode === 'edit';
  }

  // Returns the current modal title in the requested language.
  getModalTitle(lang: 'EN' | 'TC'): string {
    return this.isEditMode ? this.translations.titleEdit[lang] : this.translations.titleCreate[lang];
  }

  // Returns the footer button label for create or edit mode.
  getSubmitLabel(lang: 'EN' | 'TC'): string {
    return this.isEditMode ? this.translations.saveChanges[lang] : this.translations.submit[lang];
  }

  // Returns the active time picker title using the selected weekday and boundary.
  get activeTimePickerTitle(): string {
    const lang = this.currentLanguage;
    const dayLabel = this.activeTimePickerDay ? this.getDayLabel(this.activeTimePickerDay, lang) : '';
    const boundaryLabel = this.activeTimePickerBoundary === 'close' ? this.translations.to[lang] : this.translations.from[lang];
    return `${dayLabel} ${boundaryLabel}`.trim() || this.translations.chooseTime[lang];
  }

  // Dismisses the modal without forcing a parent refresh.
  dismiss(data?: { created?: boolean; saved?: boolean; restaurantId?: string }): void {
    this.destroyMap();
    this.modalController.dismiss(data);
  }

  // Loads restaurant data directly if StorePage did not pass it as a component prop.
  private loadRestaurantDataForEdit(): void {
    const currentUser = this.feature.auth.currentUser;
    if (!currentUser?.uid) {
      this.dismiss();
      return;
    }
    this.isPageLoading = true;
    this.feature.user.getUserProfile(currentUser.uid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (userProfile) => {
          if (!userProfile?.restaurantId?.trim()) {
            this.isPageLoading = false;
            this.dismiss();
            return;
          }
          this.restaurantId = userProfile.restaurantId;
          this.feature.restaurants.getRestaurantById(this.restaurantId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (restaurant) => {
                if (!restaurant) {
                  this.isPageLoading = false;
                  this.dismiss();
                  return;
                }
                this.restaurant = restaurant;
                this.initializeFormFromRestaurant(restaurant);
                this.isPageLoading = false;
                setTimeout(() => this.initializeMap(), 100);
              },
              error: (error) => {
                console.error('RestaurantFormModal: error loading restaurant:', error);
                this.isPageLoading = false;
              }
            });
        },
        error: (error) => {
          console.error('RestaurantFormModal: error loading user profile:', error);
          this.isPageLoading = false;
        }
      });
  }

  // Copies existing restaurant values into the shared form model.
  private initializeFormFromRestaurant(restaurant: Restaurant): void {
    this.form = {
      Name_EN: restaurant.Name_EN || '',
      Name_TC: restaurant.Name_TC || '',
      Address_EN: restaurant.Address_EN || '',
      Address_TC: restaurant.Address_TC || '',
      District_EN: restaurant.District_EN || '',
      District_TC: restaurant.District_TC || '',
      Latitude: restaurant.Latitude ?? null,
      Longitude: restaurant.Longitude ?? null,
      Keyword_EN: restaurant.Keyword_EN || [],
      Keyword_TC: restaurant.Keyword_TC || [],
      Seats: restaurant.Seats ?? null,
      Contacts: {
        Phone: restaurant.Contacts?.Phone || '',
        Email: restaurant.Contacts?.Email || '',
        Website: restaurant.Contacts?.Website || ''
      },
      Payments: restaurant.Payments || [],
      Opening_Hours: this.convertOpeningHoursToStringMap(restaurant.Opening_Hours)
    };
    if (restaurant.Latitude != null && restaurant.Longitude != null) this.mapMarker = { lat: restaurant.Latitude, lng: restaurant.Longitude };
  }

  // Normalises string and object opening-hour shapes to the stored "HH:MM-HH:MM" string format.
  private convertOpeningHoursToStringMap(openingHours: unknown): { [key: string]: string } {
    if (!openingHours || typeof openingHours !== 'object') return {};
    const result: { [key: string]: string } = {};
    for (const [key, value] of Object.entries(openingHours)) {
      if (typeof value === 'string' && value.trim()) result[key] = value.trim();
      if (value && typeof value === 'object') {
        const range = value as { open?: string | null; close?: string | null };
        if (range.open && range.close) result[key] = `${range.open}-${range.close}`;
      }
    }
    return result;
  }

  // Initialises the Google Map and restores an existing marker when coordinates are available.
  private initializeMap(): void {
    if (this.mapInitialized || this.map) return;
    const mapContainer = document.getElementById('restaurant-form-map');
    if (!mapContainer) {
      console.warn('RestaurantFormModal: map container not found');
      return;
    }
    const centerLat = this.form.Latitude ?? 22.3193;
    const centerLng = this.form.Longitude ?? 114.1694;
    this.map = new google.maps.Map(mapContainer, {
      center: { lat: centerLat, lng: centerLng },
      zoom: this.mapMarker ? 13 : 12,
      mapTypeControl: false,
      fullscreenControl: false,
      zoomControl: true,
      streetViewControl: false,
      styles: this.themeService.getGoogleMapStylesForCurrentTheme()
    });
    if (this.mapMarker) {
      this.marker = new google.maps.Marker({
        position: { lat: this.mapMarker.lat, lng: this.mapMarker.lng },
        map: this.map
      });
    }
    this.map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (event.latLng) this.onMapClick(event.latLng.lat(), event.latLng.lng());
    });
    this.mapInitialized = true;
  }

  // Updates the form coordinates and moves the map marker to the clicked position.
  private onMapClick(lat: number, lng: number): void {
    this.form.Latitude = lat;
    this.form.Longitude = lng;
    this.mapMarker = { lat, lng };
    if (this.marker) {
      this.marker.setMap(null);
      this.marker = null;
    }
    if (this.map) this.marker = new google.maps.Marker({ position: { lat, lng }, map: this.map });
  }

  // Clears the selected map location from both the form and visible marker.
  clearLocation(): void {
    this.form.Latitude = null;
    this.form.Longitude = null;
    this.mapMarker = null;
    if (this.marker) {
      this.marker.setMap(null);
      this.marker = null;
    }
  }

  // Releases Google Maps objects so modal teardown does not leave stale DOM references.
  private destroyMap(): void {
    if (this.marker) {
      this.marker.setMap(null);
      this.marker = null;
    }
    if (this.map) {
      this.map = null;
      this.mapInitialized = false;
    }
  }

  // Presents a radio selector for the district list and stores both English and Chinese values.
  async showDistrictSelector(): Promise<void> {
    const lang = this.currentLanguage;
    const alert = await this.alertController.create({
      header: this.translations.selectDistrict[lang],
      inputs: this.districts.map(district => ({
        type: 'radio' as const,
        label: lang === 'TC' ? district.tc : district.en,
        value: district.en,
        checked: this.form.District_EN === district.en
      })),
      buttons: [
        { text: this.translations.cancel[lang], role: 'cancel' },
        {
          text: 'OK',
          handler: (value: string) => {
            const district = this.districts.find(candidate => candidate.en === value);
            if (district) {
              this.form.District_EN = district.en;
              this.form.District_TC = district.tc;
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // Presents a checkbox selector for restaurant categories and mirrors TC labels from the constant list.
  async showKeywordsSelector(): Promise<void> {
    const lang = this.currentLanguage;
    const alert = await this.alertController.create({
      header: this.translations.selectKeywords[lang],
      inputs: this.keywords.map(keyword => ({
        type: 'checkbox' as const,
        label: lang === 'TC' ? keyword.tc : keyword.en,
        value: keyword.en,
        checked: this.form.Keyword_EN.includes(keyword.en)
      })),
      buttons: [
        { text: this.translations.cancel[lang], role: 'cancel' },
        {
          text: 'OK',
          handler: (values: string[]) => {
            this.form.Keyword_EN = values;
            this.form.Keyword_TC = values.map(value => {
              const keyword = this.keywords.find(candidate => candidate.en === value);
              return keyword ? keyword.tc : value;
            });
          }
        }
      ]
    });
    await alert.present();
  }

  // Presents a checkbox selector for accepted payment methods.
  async showPaymentMethodsSelector(): Promise<void> {
    const lang = this.currentLanguage;
    const alert = await this.alertController.create({
      header: this.translations.selectPayments[lang],
      inputs: this.paymentMethods.map(paymentMethod => ({
        type: 'checkbox' as const,
        label: lang === 'TC' ? paymentMethod.tc : paymentMethod.en,
        value: paymentMethod.en,
        checked: this.form.Payments.includes(paymentMethod.en)
      })),
      buttons: [
        { text: this.translations.cancel[lang], role: 'cancel' },
        {
          text: 'OK',
          handler: (values: string[]) => {
            this.form.Payments = values;
          }
        }
      ]
    });
    await alert.present();
  }

  // Opens the Ionic time picker for a specific weekday boundary.
  openTimePicker(day: string, boundary: TimeBoundary): void {
    const parsedHours = this.parseOpeningHoursValue(this.form.Opening_Hours[day]);
    this.activeTimePickerDay = day;
    this.activeTimePickerBoundary = boundary;
    this.activeTimePickerValue = boundary === 'open' ? parsedHours.open : parsedHours.close;
    this.isTimePickerOpen = true;
  }

  // Closes the time picker overlay and clears its temporary target state.
  closeTimePicker(): void {
    this.isTimePickerOpen = false;
    this.activeTimePickerDay = null;
    this.activeTimePickerBoundary = null;
  }

  // Receives the Ionic datetime value and writes a normalised "HH:MM-HH:MM" range into the form.
  onTimePickerChange(event: Event): void {
    if (!this.activeTimePickerDay || !this.activeTimePickerBoundary) return;
    const value = this.extractTimeValue((event as CustomEvent).detail?.value);
    if (!value) return;
    const parsedHours = this.parseOpeningHoursValue(this.form.Opening_Hours[this.activeTimePickerDay]);
    const openingTime = this.activeTimePickerBoundary === 'open' ? value : parsedHours.open;
    const closingTime = this.activeTimePickerBoundary === 'close' ? value : parsedHours.close;
    this.form.Opening_Hours[this.activeTimePickerDay] = `${openingTime}-${closingTime}`;
  }

  // Marks a weekday as closed or restores a default editable time range.
  onDayClosedChange(event: Event, day: string): void {
    const isClosed = Boolean((event as CustomEvent).detail?.checked);
    if (isClosed) {
      this.form.Opening_Hours[day] = 'Closed';
      return;
    }
    const parsedHours = this.parseOpeningHoursValue(this.form.Opening_Hours[day]);
    this.form.Opening_Hours[day] = `${parsedHours.open}-${parsedHours.close}`;
  }

  // Removes the weekday entry so the store page displays it as not set.
  clearOpeningHours(day: string): void {
    delete this.form.Opening_Hours[day];
  }

  // Returns true when the weekday is explicitly marked as closed.
  isDayClosed(day: string): boolean {
    return this.parseOpeningHoursValue(this.form.Opening_Hours[day]).closed;
  }

  // Returns true when the weekday has either a time range or a closed value.
  hasOpeningHours(day: string): boolean {
    return this.parseOpeningHoursValue(this.form.Opening_Hours[day]).hasValue;
  }

  // Builds the display text shown above the time picker buttons.
  getHoursDisplay(day: string): string {
    const parsedHours = this.parseOpeningHoursValue(this.form.Opening_Hours[day]);
    if (!parsedHours.hasValue) return this.translations.notSet[this.currentLanguage];
    if (parsedHours.closed) return this.translations.closed[this.currentLanguage];
    return `${parsedHours.open}-${parsedHours.close}`;
  }

  // Returns the current opening time button label for a weekday.
  getOpeningTimeLabel(day: string): string {
    return this.parseOpeningHoursValue(this.form.Opening_Hours[day]).open;
  }

  // Returns the current closing time button label for a weekday.
  getClosingTimeLabel(day: string): string {
    return this.parseOpeningHoursValue(this.form.Opening_Hours[day]).close;
  }

  // Parses the stored opening-hours string while tolerating old dash variants and object-derived values.
  private parseOpeningHoursValue(value: string | undefined): ParsedOpeningHours {
    if (!value?.trim()) {
      return { open: this.defaultOpeningTime, close: this.defaultClosingTime, closed: false, hasValue: false };
    }
    const trimmedValue = value.trim();
    if (/^(closed|close|休息|關閉)$/i.test(trimmedValue)) {
      return { open: this.defaultOpeningTime, close: this.defaultClosingTime, closed: true, hasValue: true };
    }
    const timeMatches = trimmedValue.match(/\d{1,2}:\d{2}/g);
    if (timeMatches && timeMatches.length >= 2) {
      return {
        open: this.normaliseTimeFragment(timeMatches[0]),
        close: this.normaliseTimeFragment(timeMatches[1]),
        closed: false,
        hasValue: true
      };
    }
    return { open: this.defaultOpeningTime, close: this.defaultClosingTime, closed: false, hasValue: true };
  }

  // Extracts an "HH:MM" value from Ionic datetime values such as "13:47" or "2026-05-01T13:47".
  private extractTimeValue(value: unknown): string | null {
    const rawValue = Array.isArray(value) ? value[0] : value;
    if (typeof rawValue !== 'string') return null;
    const match = rawValue.match(/(?:T|^)(\d{1,2}):(\d{2})/);
    if (!match) return null;
    return this.normaliseTimeFragment(`${match[1]}:${match[2]}`);
  }

  // Pads hour fragments so stored opening hours stay in the app's usual 24-hour format.
  private normaliseTimeFragment(value: string): string {
    const [hour, minute] = value.split(':');
    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }

  // Returns the district text shown in the selector row.
  getDistrictDisplay(lang: 'EN' | 'TC'): string {
    if (!this.form.District_EN) return this.translations.notSelected[lang];
    return lang === 'TC' ? (this.form.District_TC || this.form.District_EN) : this.form.District_EN;
  }

  // Returns selected categories in the active language.
  getKeywordDisplay(lang: 'EN' | 'TC'): string {
    if (lang === 'TC' && this.form.Keyword_TC.length) return this.form.Keyword_TC.join(', ');
    if (this.form.Keyword_EN.length) return this.form.Keyword_EN.join(', ');
    return this.translations.notSelected[lang];
  }

  // Returns selected payment method labels in the active language.
  getPaymentDisplay(lang: 'EN' | 'TC'): string {
    if (!this.form.Payments.length) return this.translations.notSelected[lang];
    return this.form.Payments.map(code => {
      const paymentMethod = this.paymentMethods.find(method => method.en === code);
      return paymentMethod ? (lang === 'TC' ? paymentMethod.tc : paymentMethod.en) : code;
    }).join(', ');
  }

  // Returns the weekday display label in the active language.
  getDayLabel(day: string, lang: 'EN' | 'TC'): string {
    if (lang === 'TC') return this.weekdays.find(weekday => weekday.en === day)?.tc ?? day;
    return day;
  }

  // Opens the hidden image input used by the edit-mode image upload section.
  clickRestaurantImageUploadButton(): void {
    const inputElement = document.getElementById('restaurant-form-image-input') as HTMLInputElement;
    inputElement?.click();
  }

  // Validates the chosen image file and stores a local preview URL.
  onRestaurantImageSelected(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const file = inputElement.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      void this.showToast(this.translations.invalidImage[this.currentLanguage], 'warning');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      void this.showToast(this.translations.imageTooLarge[this.currentLanguage], 'warning');
      return;
    }
    this.selectedRestaurantImage = file;
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      this.restaurantImagePreview = readerEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  // Uploads the selected image to the existing restaurant image endpoint.
  async uploadRestaurantImage(): Promise<void> {
    if (!this.selectedRestaurantImage || !this.restaurantId) return;
    const lang = this.currentLanguage;
    this.isUploadingImage = true;
    const loading = await this.loadingController.create({
      message: this.translations.uploadingImage[lang],
      spinner: null,
      cssClass: 'eclipse-loading'
    });
    await loading.present();
    try {
      const token = await this.feature.auth.getIdToken();
      if (!token) throw new Error(lang === 'TC' ? '無法獲取身份驗證令牌' : 'Failed to get authentication token');
      const response = await this.feature.restaurants
        .uploadRestaurantImage(this.restaurantId, this.selectedRestaurantImage, token)
        .toPromise();
      if (response?.imageUrl && this.restaurant) this.restaurant.ImageUrl = response.imageUrl;
      await this.showToast(this.translations.imageUploadSuccess[lang], 'success');
      this.clearRestaurantImageSelection();
    } catch (error: any) {
      console.error('RestaurantFormModal: image upload error:', error);
      await this.showToast(error.message || this.translations.imageUploadFailed[lang], 'danger');
    } finally {
      this.isUploadingImage = false;
      await loading.dismiss();
    }
  }

  // Clears the selected image and resets the hidden file input.
  clearRestaurantImageSelection(): void {
    this.selectedRestaurantImage = null;
    this.restaurantImagePreview = null;
    const inputElement = document.getElementById('restaurant-form-image-input') as HTMLInputElement;
    if (inputElement) inputElement.value = '';
  }

  // Validates the shared form and routes the save action to create or edit mode.
  async save(): Promise<void> {
    const lang = this.currentLanguage;
    if (!this.form.Name_EN.trim() && !this.form.Name_TC.trim()) {
      await this.showToast(this.translations.nameRequired[lang], 'warning');
      return;
    }
    const currentUser = this.feature.auth.currentUser;
    if (!currentUser?.uid) {
      await this.showToast(this.translations.loginRequired[lang], 'warning');
      return;
    }
    this.isSaving = true;
    const loading = await this.loadingController.create({
      message: this.translations.saving[lang],
      spinner: null,
      cssClass: 'eclipse-loading'
    });
    await loading.present();
    try {
      if (this.isEditMode) {
        await this.saveExistingRestaurant();
        await this.showToast(this.translations.successEdit[lang], 'success');
        this.dismiss({ saved: true });
      } else {
        const restaurantId = await this.createNewRestaurant(currentUser.uid);
        await this.showToast(this.translations.successCreate[lang], 'success');
        this.dismiss({ created: true, restaurantId });
      }
    } catch (error: any) {
      console.error('RestaurantFormModal: save error:', error);
      const fallbackMessage = this.isEditMode ? this.translations.failedEdit[lang] : this.translations.failedCreate[lang];
      await this.showToast(error.message || fallbackMessage, 'danger');
    } finally {
      this.isSaving = false;
      await loading.dismiss();
    }
  }

  // Creates a new restaurant and links it to the current user's profile.
  private async createNewRestaurant(userId: string): Promise<string> {
    const payload = this.buildCreatePayload(userId);
    const response = await this.feature.restaurants.createRestaurant(payload).toPromise();
    if (!response?.id) throw new Error('No restaurant ID returned from server');
    await this.feature.user.updateUserProfile(userId, { restaurantId: response.id }).toPromise();
    return response.id;
  }

  // Updates the existing restaurant record with nullable fields where edit mode intentionally clears data.
  private async saveExistingRestaurant(): Promise<void> {
    if (!this.restaurantId) throw new Error('Missing restaurant ID');
    await this.feature.restaurants.updateRestaurant(this.restaurantId, this.buildUpdatePayload()).toPromise();
  }

  // Builds the create payload by omitting blank optional fields.
  private buildCreatePayload(userId: string): Partial<Restaurant> & { ownerId: string } {
    const payload: Partial<Restaurant> & { ownerId: string } = { ownerId: userId };
    if (this.form.Name_EN.trim()) payload.Name_EN = this.form.Name_EN.trim();
    if (this.form.Name_TC.trim()) payload.Name_TC = this.form.Name_TC.trim();
    if (this.form.Address_EN.trim()) payload.Address_EN = this.form.Address_EN.trim();
    if (this.form.Address_TC.trim()) payload.Address_TC = this.form.Address_TC.trim();
    if (this.form.District_EN) {
      payload.District_EN = this.form.District_EN;
      payload.District_TC = this.form.District_TC;
    }
    if (this.form.Latitude != null) payload.Latitude = this.form.Latitude;
    if (this.form.Longitude != null) payload.Longitude = this.form.Longitude;
    if (this.form.Keyword_EN.length) {
      payload.Keyword_EN = this.form.Keyword_EN;
      payload.Keyword_TC = this.form.Keyword_TC;
    }
    if (this.form.Seats != null) payload.Seats = this.form.Seats;
    const contacts: Record<string, string> = {};
    if (this.form.Contacts.Phone.trim()) contacts['Phone'] = this.form.Contacts.Phone.trim();
    if (this.form.Contacts.Email.trim()) contacts['Email'] = this.form.Contacts.Email.trim();
    if (this.form.Contacts.Website.trim()) contacts['Website'] = this.form.Contacts.Website.trim();
    if (Object.keys(contacts).length) payload.Contacts = contacts;
    if (this.form.Payments.length) payload.Payments = this.form.Payments;
    if (Object.keys(this.form.Opening_Hours).length) payload.Opening_Hours = this.form.Opening_Hours;
    return payload;
  }

  // Builds the edit payload by sending nulls for cleared values so the API can persist removals.
  private buildUpdatePayload(): Partial<Restaurant> {
    return {
      Name_EN: this.form.Name_EN.trim() || null,
      Name_TC: this.form.Name_TC.trim() || null,
      Address_EN: this.form.Address_EN.trim() || null,
      Address_TC: this.form.Address_TC.trim() || null,
      District_EN: this.form.District_EN || null,
      District_TC: this.form.District_TC || null,
      Latitude: this.form.Latitude,
      Longitude: this.form.Longitude,
      Keyword_EN: this.form.Keyword_EN.length ? this.form.Keyword_EN : null,
      Keyword_TC: this.form.Keyword_TC.length ? this.form.Keyword_TC : null,
      Seats: this.form.Seats,
      Contacts: {
        Phone: this.form.Contacts.Phone.trim() || null,
        Email: this.form.Contacts.Email.trim() || null,
        Website: this.form.Contacts.Website.trim() || null
      },
      Payments: this.form.Payments.length ? this.form.Payments : null,
      Opening_Hours: Object.keys(this.form.Opening_Hours).length ? this.form.Opening_Hours : null
    };
  }

  // Displays a brief toast notification at the bottom of the screen.
  private async showToast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 3000, position: 'bottom', color });
    await toast.present();
  }
}
