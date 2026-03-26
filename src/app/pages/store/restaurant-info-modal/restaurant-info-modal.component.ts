// Sub-page for editing all restaurant information fields.
// Navigated to from StorePage via /store/edit-info route.
// On save it navigates back to /store so the parent reloads restaurant data.
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Restaurant } from '../../../services/restaurants.service';
import { StoreFeatureService } from '../../../services/store-feature.service';
import { Districts } from '../../../constants/districts.const';
import { Keywords } from '../../../constants/keywords.const';
import { PaymentMethods } from '../../../constants/payments.const';
import { Weekdays } from '../../../constants/weekdays.const';

@Component({
  selector: 'app-restaurant-info-modal',
  templateUrl: './restaurant-info-modal.component.html',
  styleUrls: ['./restaurant-info-modal.component.scss'],
  standalone: false
})
export class RestaurantInfoModalComponent implements OnInit, OnDestroy {
  // Loaded from user profile → restaurant service (no longer @Input)
  restaurantId: string | null = null;
  restaurant: Restaurant | null = null;

  // Loading state for initial data fetch
  isPageLoading = true;

  // Static reference data for selector dialogs
  districts = Districts;
  keywords = Keywords;
  paymentMethods = PaymentMethods;
  weekdays = Weekdays;

  // Reactive language stream and synced snapshot for template binding
  lang$ = this.feature.language.lang$;
  currentLanguage: 'EN' | 'TC' = 'EN';

  // Image upload state
  isUploadingImage = false;
  selectedRestaurantImage: File | null = null;
  restaurantImagePreview: string | null = null;

  // Google Maps instance references (cleaned up on destroy)
  private map: google.maps.Map | null = null;
  private marker: google.maps.Marker | null = null;
  private mapInitialized = false;

  // Current pin location shown on the map and in coordinates display
  mapMarker: { lat: number; lng: number } | null = null;

  // Form model — all fields mirror the Restaurant data model
  editedInfo = {
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
    // Opening hours keyed by English weekday name, value is "HH:MM-HH:MM" or "Closed"
    Opening_Hours: {} as { [key: string]: string }
  };

  // RxJS teardown subject
  private destroy$ = new Subject<void>();

  // Bilingual UI strings used throughout this page
  translations = {
    saveChanges:     { EN: 'Save Changes',             TC: '儲存變更' },
    cancel:          { EN: 'Cancel',                   TC: '取消' },
    saving:          { EN: 'Saving...',                TC: '儲存中...' },
    selectDistrict:  { EN: 'Select District',          TC: '選擇地區' },
    selectKeywords:  { EN: 'Select Keywords',          TC: '選擇關鍵字' },
    selectPayments:  { EN: 'Select Payment Methods',   TC: '選擇付款方式' },
    updateSuccess:   { EN: 'Updated successfully',     TC: '更新成功' },
    updateFailed:    { EN: 'Update failed',            TC: '更新失敗' },
    location:        { EN: 'Location',                 TC: '位置' },
    clickMapToSet:   { EN: 'Click map to set location',TC: '點擊地圖設定位置' },
    editRestaurant:  { EN: 'Edit Restaurant Info',     TC: '編輯餐廳資料' },
  };

  constructor(
    private readonly feature: StoreFeatureService,
    private readonly router: Router,
    private readonly alertController: AlertController,
    private readonly toastController: ToastController,
    private readonly loadingController: LoadingController
  ) {}

  ngOnInit(): void {
    // Keep currentLanguage snapshot in sync for methods that cannot use async pipe
    this.lang$.pipe(takeUntil(this.destroy$)).subscribe(lang => {
      this.currentLanguage = lang;
    });

    // Load restaurant data from user profile
    this.loadRestaurantData();
  }

  ngOnDestroy(): void {
    // Release Google Maps resources to prevent memory leaks
    this.destroyMap();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Navigate back to the store page without saving
  dismiss(): void {
    this.destroyMap();
    this.router.navigate(['/store']);
  }

  // Load the restaurant data by resolving the user's restaurantId
  private loadRestaurantData(): void {
    const currentUser = this.feature.auth.currentUser;
    if (!currentUser?.uid) {
      this.isPageLoading = false;
      this.router.navigate(['/store']);
      return;
    }

    this.feature.user.getUserProfile(currentUser.uid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (userProfile) => {
          if (!userProfile?.restaurantId?.trim()) {
            this.isPageLoading = false;
            this.router.navigate(['/store']);
            return;
          }

          this.restaurantId = userProfile.restaurantId;
          this.feature.restaurants.getRestaurantById(this.restaurantId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (restaurant) => {
                if (!restaurant) {
                  this.isPageLoading = false;
                  this.router.navigate(['/store']);
                  return;
                }
                this.restaurant = restaurant;
                this.isPageLoading = false;
                this.initializeEditedInfo(restaurant);
                setTimeout(() => this.initializeMap(), 100);
              },
              error: (err) => {
                console.error('RestaurantInfoEdit: error loading restaurant:', err);
                this.isPageLoading = false;
              }
            });
        },
        error: (err) => {
          console.error('RestaurantInfoEdit: error loading user profile:', err);
          this.isPageLoading = false;
        }
      });
  }

  // Copy restaurant fields into the editable form model.
  private initializeEditedInfo(restaurant: Restaurant): void {
    this.editedInfo = {
      Name_EN:     restaurant.Name_EN     || '',
      Name_TC:     restaurant.Name_TC     || '',
      Address_EN:  restaurant.Address_EN  || '',
      Address_TC:  restaurant.Address_TC  || '',
      District_EN: restaurant.District_EN || '',
      District_TC: restaurant.District_TC || '',
      Latitude:    restaurant.Latitude  ?? null,
      Longitude:   restaurant.Longitude ?? null,
      Keyword_EN:  restaurant.Keyword_EN  || [],
      Keyword_TC:  restaurant.Keyword_TC  || [],
      Seats:       restaurant.Seats      ?? null,
      Contacts: {
        Phone:   restaurant.Contacts?.Phone   || '',
        Email:   restaurant.Contacts?.Email   || '',
        Website: restaurant.Contacts?.Website || ''
      },
      Payments:      restaurant.Payments || [],
      Opening_Hours: this.convertOpeningHoursToStringMap(restaurant.Opening_Hours)
    };

    // Place the existing map pin if coordinates are known
    if (restaurant.Latitude && restaurant.Longitude) {
      this.mapMarker = { lat: restaurant.Latitude, lng: restaurant.Longitude };
    }
  }

  // Normalise opening hours to a plain string map ("HH:MM-HH:MM") regardless of
  // whether the API returned strings or { open, close } objects.
  private convertOpeningHoursToStringMap(openingHours: any): { [key: string]: string } {
    if (!openingHours) return {};
    const result: { [key: string]: string } = {};
    for (const [key, value] of Object.entries(openingHours)) {
      if (typeof value === 'string') {
        result[key] = value;
      } else if (value && typeof value === 'object') {
        const oc = value as { open?: string | null; close?: string | null };
        if (oc.open && oc.close) {
          result[key] = `${oc.open}-${oc.close}`;
        }
      }
    }
    return result;
  }

  // Initialise the Google Map inside the page's map container div.
  private initializeMap(): void {
    if (this.mapInitialized || this.map) return;

    const mapContainer = document.getElementById('info-modal-map');
    if (!mapContainer) {
      console.warn('RestaurantInfoEdit: map container not found');
      return;
    }

    const centerLat = this.editedInfo.Latitude  || 22.3193;
    const centerLng = this.editedInfo.Longitude || 114.1694;

    this.map = new google.maps.Map(mapContainer, {
      center: { lat: centerLat, lng: centerLng },
      zoom: 13,
      mapTypeControl: false,
      fullscreenControl: false,
      zoomControl: true,
      streetViewControl: false
    });

    if (this.mapMarker) {
      this.marker = new google.maps.Marker({
        position: { lat: this.mapMarker.lat, lng: this.mapMarker.lng },
        map: this.map
      });
    }

    this.map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        this.onMapClick(event.latLng.lat(), event.latLng.lng());
      }
    });

    this.mapInitialized = true;
  }

  private onMapClick(lat: number, lng: number): void {
    this.editedInfo.Latitude  = lat;
    this.editedInfo.Longitude = lng;
    this.mapMarker = { lat, lng };

    if (this.marker) {
      this.marker.setMap(null);
      this.marker = null;
    }
    if (this.map) {
      this.marker = new google.maps.Marker({
        position: { lat, lng },
        map: this.map
      });
    }
  }

  private destroyMap(): void {
    if (this.marker) { this.marker.setMap(null); this.marker = null; }
    if (this.map)    { this.map = null; this.mapInitialized = false; }
  }

  async showDistrictSelector(): Promise<void> {
    const lang = this.currentLanguage;

    const alert = await this.alertController.create({
      header: this.translations.selectDistrict[lang],
      inputs: this.districts.map(d => ({
        type: 'radio' as const,
        label: lang === 'TC' ? d.tc : d.en,
        value: d.en,
        checked: this.editedInfo.District_EN === d.en
      })),
      buttons: [
        { text: this.translations.cancel[lang], role: 'cancel' },
        {
          text: 'OK',
          handler: (value: string) => {
            const district = this.districts.find(d => d.en === value);
            if (district) {
              this.editedInfo.District_EN = district.en;
              this.editedInfo.District_TC = district.tc;
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async showKeywordsSelector(): Promise<void> {
    const lang = this.currentLanguage;

    const alert = await this.alertController.create({
      header: this.translations.selectKeywords[lang],
      inputs: this.keywords.map(k => ({
        type: 'checkbox' as const,
        label: lang === 'TC' ? k.tc : k.en,
        value: k.en,
        checked: this.editedInfo.Keyword_EN.includes(k.en)
      })),
      buttons: [
        { text: this.translations.cancel[lang], role: 'cancel' },
        {
          text: 'OK',
          handler: (values: string[]) => {
            this.editedInfo.Keyword_EN = values;
            this.editedInfo.Keyword_TC = values.map(v => {
              const kw = this.keywords.find(k => k.en === v);
              return kw ? kw.tc : v;
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async showPaymentMethodsSelector(): Promise<void> {
    const lang = this.currentLanguage;

    const alert = await this.alertController.create({
      header: this.translations.selectPayments[lang],
      inputs: this.paymentMethods.map(pm => ({
        type: 'checkbox' as const,
        label: lang === 'TC' ? pm.tc : pm.en,
        value: pm.en,
        checked: this.editedInfo.Payments.includes(pm.en)
      })),
      buttons: [
        { text: this.translations.cancel[lang], role: 'cancel' },
        {
          text: 'OK',
          handler: (values: string[]) => {
            this.editedInfo.Payments = values;
          }
        }
      ]
    });
    await alert.present();
  }

  async updateOpeningHours(day: string): Promise<void> {
    const lang = this.currentLanguage;
    const dayLabel = lang === 'TC'
      ? this.weekdays.find(w => w.en === day)?.tc
      : day;

    const alert = await this.alertController.create({
      header: dayLabel,
      inputs: [{
        name: 'hours',
        type: 'text',
        placeholder: lang === 'TC' ? '例如：09:00-22:00 或 休息' : 'e.g. 09:00-22:00 or Closed',
        value: this.editedInfo.Opening_Hours[day] || ''
      }],
      buttons: [
        { text: this.translations.cancel[lang], role: 'cancel' },
        {
          text: 'OK',
          handler: (data) => {
            if (data.hours?.trim()) {
              this.editedInfo.Opening_Hours[day] = data.hours.trim();
            } else {
              delete this.editedInfo.Opening_Hours[day];
            }
          }
        }
      ]
    });
    await alert.present();
  }

  getKeywordDisplay(lang: 'EN' | 'TC'): string {
    if (lang === 'TC' && this.editedInfo.Keyword_TC.length) {
      return this.editedInfo.Keyword_TC.join(', ');
    }
    if (this.editedInfo.Keyword_EN.length) {
      return this.editedInfo.Keyword_EN.join(', ');
    }
    return lang === 'TC' ? '未選擇' : 'Not selected';
  }

  getPaymentDisplay(lang: 'EN' | 'TC'): string {
    if (!this.editedInfo.Payments.length) {
      return lang === 'TC' ? '未選擇' : 'Not selected';
    }
    return this.editedInfo.Payments.map(code => {
      const method = this.paymentMethods.find(pm => pm.en === code);
      return method ? (lang === 'TC' ? method.tc : method.en) : code;
    }).join(', ');
  }

  clickRestaurantImageUploadButton(): void {
    const input = document.getElementById('modal-restaurant-image-input') as HTMLInputElement;
    input?.click();
  }

  onRestaurantImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.showToast('Please select a valid image file', 'warning');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.showToast('Image size must be less than 10MB', 'warning');
      return;
    }

    this.selectedRestaurantImage = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.restaurantImagePreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  async uploadRestaurantImage(): Promise<void> {
    if (!this.selectedRestaurantImage || !this.restaurantId) return;

    const lang = this.currentLanguage;
    this.isUploadingImage = true;

    const uploadMsg = lang === 'TC' ? '上傳圖片中...' : 'Uploading image...';
    const loading = await this.loadingController.create({
      message: uploadMsg,
      spinner: null,
      cssClass: 'eclipse-loading'
    });
    await loading.present();

    try {
      const token = await this.feature.auth.getIdToken();
      if (!token) {
        throw new Error(lang === 'TC' ? '無法獲取身份驗證令牌' : 'Failed to get authentication token');
      }

      const response = await this.feature.restaurants
        .uploadRestaurantImage(this.restaurantId, this.selectedRestaurantImage, token)
        .toPromise();

      if (response?.imageUrl) {
        if (this.restaurant) {
          this.restaurant.ImageUrl = response.imageUrl;
        }
        await this.showToast(lang === 'TC' ? '圖片上傳成功' : 'Image uploaded successfully', 'success');
        this.clearRestaurantImageSelection();
      }
    } catch (error: any) {
      console.error('RestaurantInfoEdit: image upload error:', error);
      await this.showToast(error.message || (lang === 'TC' ? '圖片上傳失敗' : 'Image upload failed'), 'danger');
    } finally {
      this.isUploadingImage = false;
      await loading.dismiss();
    }
  }

  clearRestaurantImageSelection(): void {
    this.selectedRestaurantImage = null;
    this.restaurantImagePreview = null;
    const input = document.getElementById('modal-restaurant-image-input') as HTMLInputElement;
    if (input) input.value = '';
  }

  // Persist all edited fields to the API and navigate back on success.
  async saveRestaurantInfo(): Promise<void> {
    if (!this.restaurantId) return;

    const lang = this.currentLanguage;
    const loading = await this.loadingController.create({
      message: this.translations.saving[lang],
      spinner: null,
      cssClass: 'eclipse-loading'
    });
    await loading.present();

    try {
      const payload: Partial<Restaurant> = {
        Name_EN:    this.editedInfo.Name_EN.trim()    || null,
        Name_TC:    this.editedInfo.Name_TC.trim()    || null,
        Address_EN: this.editedInfo.Address_EN.trim() || null,
        Address_TC: this.editedInfo.Address_TC.trim() || null,
        District_EN: this.editedInfo.District_EN      || null,
        District_TC: this.editedInfo.District_TC      || null,
        Latitude:    this.editedInfo.Latitude,
        Longitude:   this.editedInfo.Longitude,
        Keyword_EN:  this.editedInfo.Keyword_EN.length  ? this.editedInfo.Keyword_EN  : null,
        Keyword_TC:  this.editedInfo.Keyword_TC.length  ? this.editedInfo.Keyword_TC  : null,
        Seats: this.editedInfo.Seats,
        Contacts: {
          Phone:   this.editedInfo.Contacts.Phone.trim()   || null,
          Email:   this.editedInfo.Contacts.Email.trim()   || null,
          Website: this.editedInfo.Contacts.Website.trim() || null
        },
        Payments:      this.editedInfo.Payments.length      ? this.editedInfo.Payments      : null,
        Opening_Hours: Object.keys(this.editedInfo.Opening_Hours).length ? this.editedInfo.Opening_Hours : null
      };

      await this.feature.restaurants.updateRestaurant(this.restaurantId, payload).toPromise();
      await this.showToast(this.translations.updateSuccess[lang], 'success');

      this.destroyMap();
      this.router.navigate(['/store']);

    } catch (error: any) {
      console.error('RestaurantInfoEdit: save error:', error);
      await this.showToast(error.message || this.translations.updateFailed[lang], 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 3000, position: 'bottom', color });
    await toast.present();
  }
}
