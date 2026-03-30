// Modal for restaurant owners to add a new restaurant listing.
// Creates the restaurant via POST /API/Restaurants (ownerId in body, no auth required),
// then links it to the user profile via PUT /API/Users/:uid (auth required).
// Dismisses with { created: true } after a successful save.
import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { AlertController, ToastController, LoadingController, ModalController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StoreFeatureService } from '../../../services/store-feature.service';
import { Districts } from '../../../constants/districts.const';
import { Keywords } from '../../../constants/keywords.const';
import { PaymentMethods } from '../../../constants/payments.const';
import { Weekdays } from '../../../constants/weekdays.const';

@Component({
  selector: 'app-add-restaurant-modal',
  templateUrl: './add-restaurant-modal.component.html',
  styleUrls: ['./add-restaurant-modal.component.scss'],
  standalone: false
})
export class AddRestaurantModalComponent implements OnInit, AfterViewInit, OnDestroy {

  // ── Language ──────────────────────────────────────────────────────────────────
  lang$ = this.feature.language.lang$;
  currentLanguage: 'EN' | 'TC' = 'EN';

  // ── Static reference data ─────────────────────────────────────────────────────
  districts = Districts;
  keywords = Keywords;
  paymentMethods = PaymentMethods;
  weekdays = Weekdays;

  // ── Saving state ──────────────────────────────────────────────────────────────
  isSaving = false;

  // ── Google Maps ───────────────────────────────────────────────────────────────
  private map: google.maps.Map | null = null;
  private marker: google.maps.Marker | null = null;
  private mapInitialized = false;
  mapMarker: { lat: number; lng: number } | null = null;

  // ── Form model ────────────────────────────────────────────────────────────────
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
    // Opening hours keyed by English weekday name, value is "HH:MM-HH:MM" or "Closed"
    Opening_Hours: {} as { [key: string]: string }
  };

  // ── RxJS teardown ─────────────────────────────────────────────────────────────
  private destroy$ = new Subject<void>();

  // ── Bilingual UI strings ──────────────────────────────────────────────────────
  translations = {
    title:           { EN: 'Add New Restaurant',           TC: '新增餐廳' },
    cancel:          { EN: 'Cancel',                       TC: '取消' },
    submit:          { EN: 'Submit',                       TC: '提交' },
    saving:          { EN: 'Saving...',                    TC: '儲存中...' },
    nameRequired:    { EN: 'Please enter at least one name (EN or TC)', TC: '請輸入至少一個名稱（英文或繁體中文）' },
    selectDistrict:  { EN: 'Select District',              TC: '選擇地區' },
    selectKeywords:  { EN: 'Select Categories',            TC: '選擇類別' },
    selectPayments:  { EN: 'Select Payment Methods',       TC: '選擇付款方式' },
    notSelected:     { EN: 'Not selected',                 TC: '未選擇' },
    clickMapToSet:   { EN: 'Tap map to pin location',      TC: '點擊地圖設定位置' },
    clearLocation:   { EN: 'Clear',                        TC: '清除' },
    success:         { EN: 'Restaurant added successfully!', TC: '餐廳新增成功！' },
    failed:          { EN: 'Failed to add restaurant',     TC: '新增餐廳失敗' },
    // Section headers
    sectionRequired: { EN: 'Restaurant Name',              TC: '餐廳名稱' },
    sectionAddress:  { EN: 'Address',                      TC: '地址' },
    sectionDetails:  { EN: 'Details',                      TC: '詳情' },
    sectionContacts: { EN: 'Contact Info',                 TC: '聯絡資料' },
    sectionLocation: { EN: 'Location on Map',              TC: '地圖位置' },
    sectionHours:    { EN: 'Opening Hours',                TC: '營業時間' },
    sectionKeywords: { EN: 'Categories',                   TC: '類別' },
    sectionPayments: { EN: 'Payment Methods',              TC: '付款方式' },
    // Field placeholders
    nameEnPlaceholder: { EN: 'Name (English)',             TC: '名稱（英文）' },
    nameTcPlaceholder: { EN: 'Name (Traditional Chinese)', TC: '名稱（繁體中文）' },
    addrEnPlaceholder: { EN: 'Address (English)',          TC: '地址（英文）' },
    addrTcPlaceholder: { EN: 'Address (Traditional Chinese)', TC: '地址（繁體中文）' },
    hoursPlaceholder:  { EN: 'e.g. 09:00-22:00 or Closed', TC: '例如：09:00-22:00 或 休息' },
  };

  constructor(
    private readonly feature: StoreFeatureService,
    private readonly modalController: ModalController,
    private readonly alertController: AlertController,
    private readonly toastController: ToastController,
    private readonly loadingController: LoadingController
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.lang$.pipe(takeUntil(this.destroy$)).subscribe(lang => {
      this.currentLanguage = lang;
    });
  }

  ngAfterViewInit(): void {
    // Delay map init to let Ionic modal animation finish before measuring the container
    setTimeout(() => this.initializeMap(), 400);
  }

  ngOnDestroy(): void {
    this.destroyMap();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Dismiss ───────────────────────────────────────────────────────────────────

  dismiss(): void {
    this.destroyMap();
    this.modalController.dismiss();
  }

  // ── Google Maps ───────────────────────────────────────────────────────────────

  private initializeMap(): void {
    if (this.mapInitialized || this.map) return;

    const mapContainer = document.getElementById('add-restaurant-map');
    if (!mapContainer) {
      console.warn('AddRestaurantModal: map container not found');
      return;
    }

    this.map = new google.maps.Map(mapContainer, {
      center: { lat: 22.3193, lng: 114.1694 },
      zoom: 12,
      mapTypeControl: false,
      fullscreenControl: false,
      zoomControl: true,
      streetViewControl: false
    });

    this.map.addListener('click', (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        this.onMapClick(event.latLng.lat(), event.latLng.lng());
      }
    });

    this.mapInitialized = true;
  }

  private onMapClick(lat: number, lng: number): void {
    this.form.Latitude = lat;
    this.form.Longitude = lng;
    this.mapMarker = { lat, lng };

    if (this.marker) { this.marker.setMap(null); this.marker = null; }
    if (this.map) {
      this.marker = new google.maps.Marker({ position: { lat, lng }, map: this.map });
    }
  }

  clearLocation(): void {
    this.form.Latitude = null;
    this.form.Longitude = null;
    this.mapMarker = null;
    if (this.marker) { this.marker.setMap(null); this.marker = null; }
  }

  private destroyMap(): void {
    if (this.marker) { this.marker.setMap(null); this.marker = null; }
    if (this.map)    { this.map = null; this.mapInitialized = false; }
  }

  // ── Selectors ─────────────────────────────────────────────────────────────────

  async showDistrictSelector(): Promise<void> {
    const lang = this.currentLanguage;

    const alert = await this.alertController.create({
      header: this.translations.selectDistrict[lang],
      inputs: this.districts.map(d => ({
        type: 'radio' as const,
        label: lang === 'TC' ? d.tc : d.en,
        value: d.en,
        checked: this.form.District_EN === d.en
      })),
      buttons: [
        { text: this.translations.cancel[lang], role: 'cancel' },
        {
          text: 'OK',
          handler: (value: string) => {
            const d = this.districts.find(d => d.en === value);
            if (d) { this.form.District_EN = d.en; this.form.District_TC = d.tc; }
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
        checked: this.form.Keyword_EN.includes(k.en)
      })),
      buttons: [
        { text: this.translations.cancel[lang], role: 'cancel' },
        {
          text: 'OK',
          handler: (values: string[]) => {
            this.form.Keyword_EN = values;
            this.form.Keyword_TC = values.map(v => {
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
        checked: this.form.Payments.includes(pm.en)
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

  async updateOpeningHours(day: string): Promise<void> {
    const lang = this.currentLanguage;
    const dayLabel = lang === 'TC'
      ? this.weekdays.find(w => w.en === day)?.tc ?? day
      : day;

    const alert = await this.alertController.create({
      header: dayLabel,
      inputs: [{
        name: 'hours',
        type: 'text',
        placeholder: this.translations.hoursPlaceholder[lang],
        value: this.form.Opening_Hours[day] || ''
      }],
      buttons: [
        { text: this.translations.cancel[lang], role: 'cancel' },
        {
          text: 'OK',
          handler: (data) => {
            if (data.hours?.trim()) {
              this.form.Opening_Hours[day] = data.hours.trim();
            } else {
              delete this.form.Opening_Hours[day];
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // ── Display helpers ───────────────────────────────────────────────────────────

  getDistrictDisplay(lang: 'EN' | 'TC'): string {
    if (!this.form.District_EN) return this.translations.notSelected[lang];
    return lang === 'TC' ? (this.form.District_TC || this.form.District_EN) : this.form.District_EN;
  }

  getKeywordDisplay(lang: 'EN' | 'TC'): string {
    if (lang === 'TC' && this.form.Keyword_TC.length) return this.form.Keyword_TC.join(', ');
    if (this.form.Keyword_EN.length) return this.form.Keyword_EN.join(', ');
    return this.translations.notSelected[lang];
  }

  getPaymentDisplay(lang: 'EN' | 'TC'): string {
    if (!this.form.Payments.length) return this.translations.notSelected[lang];
    return this.form.Payments.map(code => {
      const method = this.paymentMethods.find(pm => pm.en === code);
      return method ? (lang === 'TC' ? method.tc : method.en) : code;
    }).join(', ');
  }

  getDayLabel(day: string, lang: 'EN' | 'TC'): string {
    if (lang === 'TC') return this.weekdays.find(w => w.en === day)?.tc ?? day;
    return day;
  }

  getHoursDisplay(day: string): string {
    return this.form.Opening_Hours[day] || (this.currentLanguage === 'TC' ? '未設定' : 'Not set');
  }

  // ── Save ──────────────────────────────────────────────────────────────────────

  async save(): Promise<void> {
    const lang = this.currentLanguage;

    // Require at least one name
    if (!this.form.Name_EN.trim() && !this.form.Name_TC.trim()) {
      await this.showToast(this.translations.nameRequired[lang], 'warning');
      return;
    }

    const currentUser = this.feature.auth.currentUser;
    if (!currentUser?.uid) {
      await this.showToast(lang === 'TC' ? '請先登入' : 'Please log in first', 'warning');
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
      const payload: Record<string, any> = {
        ownerId: currentUser.uid
      };

      // Names
      if (this.form.Name_EN.trim())    payload['Name_EN']    = this.form.Name_EN.trim();
      if (this.form.Name_TC.trim())    payload['Name_TC']    = this.form.Name_TC.trim();
      // Address
      if (this.form.Address_EN.trim()) payload['Address_EN'] = this.form.Address_EN.trim();
      if (this.form.Address_TC.trim()) payload['Address_TC'] = this.form.Address_TC.trim();
      // District
      if (this.form.District_EN)       { payload['District_EN'] = this.form.District_EN; payload['District_TC'] = this.form.District_TC; }
      // Location
      if (this.form.Latitude != null)  payload['Latitude']   = this.form.Latitude;
      if (this.form.Longitude != null) payload['Longitude']  = this.form.Longitude;
      // Keywords (both arrays always written together)
      if (this.form.Keyword_EN.length) { payload['Keyword_EN'] = this.form.Keyword_EN; payload['Keyword_TC'] = this.form.Keyword_TC; }
      // Seats
      if (this.form.Seats != null)     payload['Seats'] = this.form.Seats;
      // Contacts (only include if at least one field is non-empty)
      const contacts: Record<string, string> = {};
      if (this.form.Contacts.Phone.trim())   contacts['Phone']   = this.form.Contacts.Phone.trim();
      if (this.form.Contacts.Email.trim())   contacts['Email']   = this.form.Contacts.Email.trim();
      if (this.form.Contacts.Website.trim()) contacts['Website'] = this.form.Contacts.Website.trim();
      if (Object.keys(contacts).length)      payload['Contacts'] = contacts;
      // Payments
      if (this.form.Payments.length)         payload['Payments'] = this.form.Payments;
      // Opening hours
      if (Object.keys(this.form.Opening_Hours).length) payload['Opening_Hours'] = this.form.Opening_Hours;

      // 1. Create restaurant (POST /API/Restaurants — no auth required)
      const response = await this.feature.restaurants.createRestaurant(payload).toPromise();
      if (!response?.id) throw new Error('No restaurant ID returned from server');

      // 2. Link restaurant to user profile (PUT /API/Users/:uid — auth auto-attached by UserService)
      await this.feature.user.updateUserProfile(currentUser.uid, { restaurantId: response.id }).toPromise();

      await loading.dismiss();
      await this.showToast(this.translations.success[lang], 'success');

      this.destroyMap();
      this.modalController.dismiss({ created: true });
    } catch (error: any) {
      console.error('AddRestaurantModal: save error:', error);
      await loading.dismiss();
      await this.showToast(error.message || this.translations.failed[lang], 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private async showToast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 3000, position: 'bottom', color });
    await toast.present();
  }
}
