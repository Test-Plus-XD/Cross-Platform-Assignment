// Modal component for editing all restaurant information fields.
// Opened by StorePage when the user taps "Edit Info".
// On save it dismisses with { updated: true } so the parent reloads restaurant data.
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { AlertController, ToastController, LoadingController, ModalController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
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
  // Passed in from StorePage via ModalController componentProps
  @Input() restaurantId!: string;
  @Input() restaurant!: Restaurant;

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

  // Bilingual UI strings used throughout this modal
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
    private readonly modalController: ModalController,
    private readonly alertController: AlertController,
    private readonly toastController: ToastController,
    private readonly loadingController: LoadingController
  ) {}

  ngOnInit(): void {
    // Keep currentLanguage snapshot in sync for methods that cannot use async pipe
    this.lang$.pipe(takeUntil(this.destroy$)).subscribe(lang => {
      this.currentLanguage = lang;
    });

    // Pre-populate the form from the parent-supplied restaurant object
    this.initializeEditedInfo(this.restaurant);

    // Delay map init so the modal DOM is fully rendered before Google Maps attaches
    setTimeout(() => this.initializeMap(), 300);
  }

  ngOnDestroy(): void {
    // Release Google Maps resources to prevent memory leaks
    this.destroyMap();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Dismiss the modal without saving any changes
  dismiss(): void {
    this.destroyMap();
    this.modalController.dismiss({ updated: false });
  }

  // Copy restaurant fields into the editable form model.
  // Called once on init and again on cancel to reset to original values.
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
        // Already a string — use as-is
        result[key] = value;
      } else if (value && typeof value === 'object') {
        // Object format from older API responses: { open: "HH:MM", close: "HH:MM" }
        const oc = value as { open?: string | null; close?: string | null };
        if (oc.open && oc.close) {
          result[key] = `${oc.open}-${oc.close}`;
        }
      }
    }
    return result;
  }

  // Initialise the Google Map inside the modal's map container div.
  // Centres on the existing restaurant location (or Hong Kong default).
  private initializeMap(): void {
    // Guard against double-initialisation
    if (this.mapInitialized || this.map) return;

    const mapContainer = document.getElementById('info-modal-map');
    if (!mapContainer) {
      console.warn('RestaurantInfoModal: map container not found');
      return;
    }

    // Default centre: Hong Kong Island
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

    // Drop an existing marker if coordinates are already set
    if (this.mapMarker) {
      this.marker = new google.maps.Marker({
        position: { lat: this.mapMarker.lat, lng: this.mapMarker.lng },
        map: this.map
      });
    }

    // Each click moves the pin and updates the coordinate fields
    this.map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        this.onMapClick(event.latLng.lat(), event.latLng.lng());
      }
    });

    this.mapInitialized = true;
    console.log('RestaurantInfoModal: map initialised');
  }

  // Update coordinate fields and reposition the map marker on every click.
  private onMapClick(lat: number, lng: number): void {
    this.editedInfo.Latitude  = lat;
    this.editedInfo.Longitude = lng;
    this.mapMarker = { lat, lng };

    // Remove the previous pin before adding the new one
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

  // Remove and null out all Google Maps objects to free browser memory.
  private destroyMap(): void {
    if (this.marker) { this.marker.setMap(null); this.marker = null; }
    if (this.map)    { this.map = null; this.mapInitialized = false; }
  }

  // Open an Ionic alert with radio buttons so the user can pick a district.
  // Selecting a value updates both the EN and TC district fields.
  async showDistrictSelector(): Promise<void> {
    const lang = await this.getCurrentLanguage();

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
            // Find the full district object to get both language values
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

  // Open a checkbox alert for selecting one or more keyword tags.
  // Both EN and TC keyword arrays are updated together.
  async showKeywordsSelector(): Promise<void> {
    const lang = await this.getCurrentLanguage();

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
            // Store EN values; derive TC equivalents from the constants list
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

  // Open a checkbox alert for selecting accepted payment methods.
  async showPaymentMethodsSelector(): Promise<void> {
    const lang = await this.getCurrentLanguage();

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

  // Open a text-input alert for a single weekday opening hours value.
  // The user types e.g. "09:00-22:00" or "Closed"; an empty value clears the entry.
  async updateOpeningHours(day: string): Promise<void> {
    const lang = await this.getCurrentLanguage();
    // Show the localised day name in the alert header
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
              // Empty input removes the day entry entirely
              delete this.editedInfo.Opening_Hours[day];
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // Return a comma-separated keyword display string in the requested language.
  getKeywordDisplay(lang: 'EN' | 'TC'): string {
    if (lang === 'TC' && this.editedInfo.Keyword_TC.length) {
      return this.editedInfo.Keyword_TC.join(', ');
    }
    if (this.editedInfo.Keyword_EN.length) {
      return this.editedInfo.Keyword_EN.join(', ');
    }
    return lang === 'TC' ? '未選擇' : 'Not selected';
  }

  // Return a comma-separated payment methods display string in the requested language.
  getPaymentDisplay(lang: 'EN' | 'TC'): string {
    if (!this.editedInfo.Payments.length) {
      return lang === 'TC' ? '未選擇' : 'Not selected';
    }
    return this.editedInfo.Payments.map(code => {
      const method = this.paymentMethods.find(pm => pm.en === code);
      return method ? (lang === 'TC' ? method.tc : method.en) : code;
    }).join(', ');
  }

  // Trigger the hidden file input element for restaurant image selection.
  clickRestaurantImageUploadButton(): void {
    const input = document.getElementById('modal-restaurant-image-input') as HTMLInputElement;
    input?.click();
  }

  // Validate and create a local preview when a restaurant hero image is chosen.
  onRestaurantImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Reject non-image files
    if (!file.type.startsWith('image/')) {
      this.showToast('Please select a valid image file', 'warning');
      return;
    }
    // Reject files over 10 MB
    if (file.size > 10 * 1024 * 1024) {
      this.showToast('Image size must be less than 10MB', 'warning');
      return;
    }

    this.selectedRestaurantImage = file;

    // Generate a data-URL preview so the user sees the image before uploading
    const reader = new FileReader();
    reader.onload = (e) => {
      this.restaurantImagePreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  // Upload the selected restaurant hero image via the REST API.
  // Updates the local restaurant.ImageUrl on success so the modal shows the new image.
  async uploadRestaurantImage(): Promise<void> {
    if (!this.selectedRestaurantImage || !this.restaurantId) return;

    const lang = await this.getCurrentLanguage();
    this.isUploadingImage = true;

    const loading = await this.loadingController.create({
      message: lang === 'TC' ? '上傳圖片中...' : 'Uploading image...',
      spinner: null
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
        // Reflect the new URL immediately so the preview updates
        this.restaurant.ImageUrl = response.imageUrl;
        await this.showToast(lang === 'TC' ? '圖片上傳成功' : 'Image uploaded successfully', 'success');
        this.clearRestaurantImageSelection();
      }
    } catch (error: any) {
      console.error('RestaurantInfoModal: image upload error:', error);
      await this.showToast(error.message || (lang === 'TC' ? '圖片上傳失敗' : 'Image upload failed'), 'danger');
    } finally {
      this.isUploadingImage = false;
      await loading.dismiss();
    }
  }

  // Clear the selected file and preview without uploading.
  clearRestaurantImageSelection(): void {
    this.selectedRestaurantImage = null;
    this.restaurantImagePreview = null;
    const input = document.getElementById('modal-restaurant-image-input') as HTMLInputElement;
    if (input) input.value = '';
  }

  // Persist all edited fields to the API and dismiss the modal on success.
  async saveRestaurantInfo(): Promise<void> {
    if (!this.restaurantId) return;

    const lang = await this.getCurrentLanguage();
    const loading = await this.loadingController.create({
      message: this.translations.saving[lang],
      spinner: null
    });
    await loading.present();

    try {
      // Build the API payload — null-out empty strings so the backend stores nulls
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

      // Signal to the parent that data has changed so it reloads
      this.destroyMap();
      this.modalController.dismiss({ updated: true });

    } catch (error: any) {
      console.error('RestaurantInfoModal: save error:', error);
      await this.showToast(error.message || this.translations.updateFailed[lang], 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // Resolve the current language value synchronously from the observable.
  private async getCurrentLanguage(): Promise<'EN' | 'TC'> {
    return await this.lang$.pipe(take(1)).toPromise() as 'EN' | 'TC';
  }

  // Show a short-lived bottom toast with the given message and colour.
  private async showToast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 3000, position: 'bottom', color });
    await toast.present();
  }
}
