// Store management page for Restaurant-type users
// Provides restaurant info editing, menu management, and bookings overview
import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController, ModalController } from '@ionic/angular';
import { Subject, Observable } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import { Booking } from '../../services/booking.service';
import { Restaurant, MenuItem } from '../../services/restaurants.service';
import { StoreFeatureService } from '../../services/store-feature.service';
import { District, Districts } from '../../constants/districts.const';
import { Keyword, Keywords } from '../../constants/keywords.const';
import { PaymentMethod, PaymentMethods } from '../../constants/payments.const';
import { Weekday, Weekdays } from '../../constants/weekdays.const';
import * as L from 'leaflet';

@Component({
  selector: 'app-store',
  templateUrl: './store.page.html',
  styleUrls: ['./store.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorePage implements OnInit, OnDestroy {
  // Language and platform streams
  lang$ = this.feature.language.lang$;
  isDark$ = this.feature.theme.isDark$;
  isMobile$: Observable<boolean>;
  // Current language for template binding (updated from lang$ stream)
  currentLanguage: 'EN' | 'TC' = 'EN';

  // Restaurant and data
  restaurant: Restaurant | null = null;
  menuItems: MenuItem[] = [];
  bookings: Booking[] = [];

  // Current section
  currentSection: 'info' | 'menu' | 'bookings' = 'info';

  // Loading states
  isLoading = true;
  isRestaurantLoading = true;
  isMenuLoading = false;
  isBookingsLoading = false;
  isSaving = false;

  // Editing states
  isEditingInfo = false;
  isEditingMenu = false;
  editingMenuItemId: string | null = null;

  // Error message
  errorMessage: string | null = null;

  // Cleanup subject
  private destroy$ = new Subject<void>();

  // Current user's restaurant ID
  private restaurantId: string | null = null;

  // Centralized data
  districts = Districts;
  keywords = Keywords;
  paymentMethods = PaymentMethods;
  weekdays = Weekdays;

  // Edited restaurant info
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
    Contacts: {
      Phone: '',
      Email: '',
      Website: ''
    },
    Payments: [] as string[],
    Opening_Hours: {} as { [key: string]: string }
  };

  editedMenuItem: Partial<MenuItem> = {
    Name_EN: '',
    Name_TC: '',
    Description_EN: '',
    Description_TC: '',
    Price: null,
    ImageUrl: null
  };

  // Image upload state
  selectedRestaurantImage: File | null = null;
  restaurantImagePreview: string | null = null;
  selectedMenuItemImage: File | null = null;
  menuItemImagePreview: string | null = null;
  isUploadingImage: boolean = false;

  // DocuPipe bulk menu import state
  isImportingMenu: boolean = false;
  selectedMenuDocument: File | null = null;
  docuPipeJobId: string | null = null;
  docuPipeDocumentId: string | null = null;
  extractedMenuItems: Partial<MenuItem>[] = [];
  isPollingDocuPipe: boolean = false;
  showExtractedItemsReview: boolean = false;

  // Map marker
  mapMarker: { lat: number; lng: number } | null = null;

  // Leaflet map instance
  private map: L.Map | null = null;
  private mapInitialized = false;

  // Translations
  translations = {
    pageTitle: { EN: 'Store Management', TC: '店舖管理' },
    restaurantInfo: { EN: 'Restaurant Information', TC: '餐廳資料' },
    menuManagement: { EN: 'Menu Management', TC: '菜單管理' },
    bookingsOverview: { EN: 'Bookings Overview', TC: '預約概覽' },
    noRestaurant: { EN: 'No restaurant linked', TC: '未連結餐廳' },
    contactSupport: { EN: 'Please contact support', TC: '請聯繫客服' },
    editInfo: { EN: 'Edit Info', TC: '編輯資料' },
    saveChanges: { EN: 'Save Changes', TC: '儲存變更' },
    cancel: { EN: 'Cancel', TC: '取消' },
    saving: { EN: 'Saving...', TC: '儲存中...' },
    nameEN: { EN: 'Name (English)', TC: '名稱（英文）' },
    nameTC: { EN: 'Name (Chinese)', TC: '名稱（中文）' },
    addressEN: { EN: 'Address (English)', TC: '地址（英文）' },
    addressTC: { EN: 'Address (Chinese)', TC: '地址（中文）' },
    district: { EN: 'District', TC: '地區' },
    selectDistrict: { EN: 'Select District', TC: '選擇地區' },
    keywords: { EN: 'Keywords', TC: '關鍵字' },
    selectKeywords: { EN: 'Select Keywords', TC: '選擇關鍵字' },
    seats: { EN: 'Seats', TC: '座位數' },
    phone: { EN: 'Phone', TC: '電話' },
    email: { EN: 'Email', TC: '電郵' },
    website: { EN: 'Website', TC: '網站' },
    payments: { EN: 'Payment Methods', TC: '付款方式' },
    selectPayments: { EN: 'Select Payment Methods', TC: '選擇付款方式' },
    openingHours: { EN: 'Opening Hours', TC: '營業時間' },
    location: { EN: 'Location', TC: '位置' },
    clickMapToSet: { EN: 'Click map to set location', TC: '點擊地圖設定位置' },
    addMenuItem: { EN: 'Add Menu Item', TC: '新增菜單項目' },
    editMenuItem: { EN: 'Edit Menu Item', TC: '編輯菜單項目' },
    deleteMenuItem: { EN: 'Delete', TC: '刪除' },
    confirmDelete: { EN: 'Confirm Delete', TC: '確認刪除' },
    confirmDeleteMessage: { EN: 'Delete this menu item?', TC: '刪除此菜單項目？' },
    delete: { EN: 'Delete', TC: '刪除' },
    price: { EN: 'Price', TC: '價格' },
    description: { EN: 'Description', TC: '描述' },
    noMenuItems: { EN: 'No menu items yet', TC: '尚無菜單項目' },
    updateSuccess: { EN: 'Updated successfully', TC: '更新成功' },
    updateFailed: { EN: 'Update failed', TC: '更新失敗' },
    createSuccess: { EN: 'Created successfully', TC: '建立成功' },
    deleteSuccess: { EN: 'Deleted successfully', TC: '刪除成功' },
    viewPublicPage: { EN: 'View Public Page', TC: '查看公開頁面' },
    todayBookings: { EN: "Today's Bookings", TC: '今日預約' },
    totalBookings: { EN: 'Total Bookings', TC: '總預約數' },
    pendingBookings: { EN: 'Pending', TC: '待處理' },
    loading: { EN: 'Loading...', TC: '載入中...' },
    noBookings: { EN: 'No bookings yet', TC: '尚無預約' },
    enterValue: { EN: 'Enter value', TC: '輸入數值' },
    closed: { EN: 'Closed', tc: '休息' },
    open24h: { EN: 'Open 24h', tc: '24小時' },
    confirmBooking: { EN: 'Confirm', TC: '確認' },
    rejectBooking: { EN: 'Reject', TC: '拒絕' },
    markComplete: { EN: 'Complete', TC: '完成' },
    confirmBookingTitle: { EN: 'Confirm Booking', TC: '確認預約' },
    confirmBookingMessage: { EN: 'Confirm this booking?', TC: '確認此預約？' },
    rejectBookingTitle: { EN: 'Reject Booking', TC: '拒絕預約' },
    rejectBookingMessage: { EN: 'Reject this booking?', TC: '拒絕此預約？' },
    completeBookingTitle: { EN: 'Complete Booking', TC: '完成預約' },
    completeBookingMessage: { EN: 'Mark this booking as completed?', TC: '將此預約標記為完成？' },
    bookingUpdated: { EN: 'Booking updated successfully', TC: '預約已成功更新' }
  };

  constructor(
    private readonly feature: StoreFeatureService,
    private readonly router: Router,
    private readonly alertController: AlertController,
    private readonly toastController: ToastController,
    private readonly loadingController: LoadingController,
    private readonly modalController: ModalController,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.isMobile$ = this.feature.platform.isMobile$;
  }

  ngOnInit(): void {
    // Emit page title event
    const event = new CustomEvent('page-title', {
      detail: { Header_EN: 'Store Management', Header_TC: '店舖管理' },
      bubbles: true
    });
    globalThis.dispatchEvent(event);

    // Subscribe to language changes to update currentLanguage property for template binding
    this.lang$.pipe(takeUntil(this.destroy$)).subscribe(lang => {
      this.currentLanguage = lang;
    });

    // Load restaurant data
    this.loadRestaurantData();
  }

  // Load restaurant data linked to current user.
  private loadRestaurantData(): void {
    this.isRestaurantLoading = true;
    console.log('StorePage: Starting loadRestaurantData');

    const currentUser = this.feature.auth.currentUser;
    console.log('StorePage: Current user:', currentUser?.uid);

    if (!currentUser || !currentUser.uid) {
      console.warn('StorePage: No authenticated user found');
      this.isRestaurantLoading = false;
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }

    // Fetch user profile to get restaurantId
    this.feature.user.getUserProfile(currentUser.uid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (userProfile) => {
          console.log('StorePage: User profile fetched:', userProfile?.restaurantId);

          if (!userProfile || !userProfile.restaurantId || userProfile.restaurantId.trim() === '') {
            console.warn('StorePage: User has no restaurantId');
            this.isRestaurantLoading = false;
            this.isLoading = false;
            return;
          }

          this.restaurantId = userProfile.restaurantId;
          console.log('StorePage: Restaurant ID:', this.restaurantId);

          // Load restaurant details
          this.loadRestaurant();
          // Load menu items
          this.loadMenu();
          // Load bookings
          this.loadBookings();
        },
        error: (err) => {
          console.error('StorePage: Error loading user profile:', err);
          this.isRestaurantLoading = false;
          this.isLoading = false;
        }
      });
  }

  // Load restaurant details from service by restaurant identifier.
  private loadRestaurant(): void {
    if (!this.restaurantId) return;

    this.feature.restaurants.getRestaurantById(this.restaurantId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (restaurant) => {
          console.log('StorePage: Restaurant loaded:', restaurant?.Name_EN);
          this.restaurant = restaurant;
          this.isRestaurantLoading = false;
          this.isLoading = false;
          this.cdr.markForCheck();

          // Initialise edited values
          if (restaurant) this.initializeEditedInfo(restaurant);
        },
        error: (err) => {
          console.error('StorePage: Error loading restaurant:', err);
          this.isRestaurantLoading = false;
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  // Initialise edited info from restaurant data to ensure all types are correctly assigned.
  private initializeEditedInfo(restaurant: Restaurant): void {
    this.editedInfo = {
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

    // Set map marker if location exists
    if (restaurant.Latitude && restaurant.Longitude) {
      this.mapMarker = { lat: restaurant.Latitude, lng: restaurant.Longitude };
    }
  }

  // Convert opening hours to string-only map format required by the editedInfo type definition.
  private convertOpeningHoursToStringMap(openingHours: any): { [key: string]: string } {
    if (!openingHours) return {};
    const stringMap: { [key: string]: string } = {};
    for (const [key, value] of Object.entries(openingHours)) {
      if (typeof value === 'string') {
        stringMap[key] = value;
      } else if (value && typeof value === 'object') {
        const openClose = value as { open?: string | null; close?: string | null };
        if (openClose.open && openClose.close) {
          stringMap[key] = `${openClose.open}-${openClose.close}`;
        }
      }
    }
    return stringMap;
  }

  // Load menu items for the current restaurant from the service.
  private loadMenu(): void {
    if (!this.restaurantId) return;

    this.isMenuLoading = true;
    this.feature.restaurants.getMenuItems(this.restaurantId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          console.log('StorePage: Menu loaded:', items.length, 'items');
          this.menuItems = items;
          this.isMenuLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('StorePage: Error loading menu:', err);
          this.isMenuLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  // Load bookings for the current restaurant from the booking service.
  private loadBookings(): void {
    if (!this.restaurantId) return;

    this.isBookingsLoading = true;
    this.feature.bookings.getRestaurantBookings(this.restaurantId, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bookings) => {
          console.log('StorePage: Bookings loaded:', bookings.length);
          this.bookings = bookings;
          this.isBookingsLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('StorePage: Error loading bookings:', err);
          this.isBookingsLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  // Switch between different page sections and cancel any ongoing edits.
  switchSection(section: 'info' | 'menu' | 'bookings'): void {
    this.currentSection = section;

    // Cancel any ongoing edits
    if (this.isEditingInfo) {
      this.cancelEditingInfo();
    }
    if (this.isEditingMenu) {
      this.cancelEditingMenu();
    }
  }

  // Start editing restaurant information and initialise the map component.
  startEditingInfo(): void {
    if (!this.restaurant) return;
    this.initializeEditedInfo(this.restaurant);
    this.isEditingInfo = true;

    // Initialise map after a short delay to ensure DOM is ready
    setTimeout(() => {
      this.initializeMap();
    }, 300);
  }

  // Cancel editing restaurant info and restore original values from restaurant object.
  cancelEditingInfo(): void {
    this.isEditingInfo = false;
    if (this.restaurant) {
      this.initializeEditedInfo(this.restaurant);
    }
    // Cleanup map
    this.destroyMap();
  }

  // Initialise Leaflet map component for location selection on the page.
  private initializeMap(): void {
    if (this.mapInitialized || this.map) return;
    const mapContainer = document.getElementById('store-map');
    if (!mapContainer) {
      console.warn('StorePage: Map container not found');
      return;
    }

    // Default center (Hong Kong)
    const defaultLatitude = 22.3193;
    const defaultLongitude = 114.1694;
    const centerLatitude = this.editedInfo.Latitude || defaultLatitude;
    const centerLongitude = this.editedInfo.Longitude || defaultLongitude;

    // Initialise map
    this.map = L.map('store-map', {
      zoomControl: true,
      attributionControl: false
    }).setView([centerLatitude, centerLongitude], 13);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(this.map);

    // Add existing marker if location exists
    if (this.mapMarker) {
      L.marker([this.mapMarker.lat, this.mapMarker.lng]).addTo(this.map);
    }

    // Handle map click - properly bind the event
    this.map.on('click', (event: L.LeafletMouseEvent) => {
      this.onMapClickHandler(event);
      this.cdr.markForCheck(); // Trigger change detection after map click
    });
    this.mapInitialized = true;

    // Invalidate size to ensure proper rendering
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 100);
    console.log('StorePage: Map initialised successfully');
  }

  // Handle map click event to update location coordinates and display marker.
  private onMapClickHandler(event: L.LeafletMouseEvent): void {
    const latitude = event.latlng.lat;
    const longitude = event.latlng.lng;

    this.editedInfo.Latitude = latitude;
    this.editedInfo.Longitude = longitude;
    this.mapMarker = { lat: latitude, lng: longitude };

    // Clear existing markers
    if (this.map) {
      this.map.eachLayer((layer: L.Layer) => {
        if (layer instanceof L.Marker) {
          this.map?.removeLayer(layer);
        }
      });

      // Add new marker
      L.marker([latitude, longitude]).addTo(this.map);
      console.log('StorePage: Location updated to:', latitude.toFixed(6), longitude.toFixed(6));
    }
  }

  // Destroy map instance and clean up Leaflet resources to prevent memory leaks.
  private destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.mapInitialized = false;
      console.log('StorePage: Map destroyed');
    }
  }

  // Save restaurant information to the backend service with validation and user feedback.
  async saveRestaurantInfo(): Promise<void> {
    if (!this.restaurantId) return;

    const language = await this.getCurrentLanguage();
    const loading = await this.loadingController.create({
      message: this.translations.saving[language],
      spinner: null
    });
    await loading.present();

    try {
      // Prepare payload
      const payload: Partial<Restaurant> = {
        Name_EN: this.editedInfo.Name_EN.trim() || null,
        Name_TC: this.editedInfo.Name_TC.trim() || null,
        Address_EN: this.editedInfo.Address_EN.trim() || null,
        Address_TC: this.editedInfo.Address_TC.trim() || null,
        District_EN: this.editedInfo.District_EN || null,
        District_TC: this.editedInfo.District_TC || null,
        Latitude: this.editedInfo.Latitude,
        Longitude: this.editedInfo.Longitude,
        Keyword_EN: this.editedInfo.Keyword_EN.length ? this.editedInfo.Keyword_EN : null,
        Keyword_TC: this.editedInfo.Keyword_TC.length ? this.editedInfo.Keyword_TC : null,
        Seats: this.editedInfo.Seats,
        Contacts: {
          Phone: this.editedInfo.Contacts.Phone.trim() || null,
          Email: this.editedInfo.Contacts.Email.trim() || null,
          Website: this.editedInfo.Contacts.Website.trim() || null
        },
        Payments: this.editedInfo.Payments.length ? this.editedInfo.Payments : null,
        Opening_Hours: Object.keys(this.editedInfo.Opening_Hours).length ? this.editedInfo.Opening_Hours : null
      };

      await this.feature.restaurants.updateRestaurant(this.restaurantId, payload).toPromise();

      await this.showToast(this.translations.updateSuccess[language], 'success');
      this.isEditingInfo = false;
      this.cdr.markForCheck();

      // Reload restaurant data
      this.loadRestaurant();
    } catch (error: any) {
      console.error('StorePage: Error saving restaurant info:', error);
      await this.showToast(error.message || this.translations.updateFailed[language], 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // Display district selection dialog with radio button inputs for user selection.
  async showDistrictSelector(): Promise<void> {
    const language = await this.getCurrentLanguage();

    const alert = await this.alertController.create({
      header: this.translations.selectDistrict[language],
      inputs: this.districts.map(district => ({
        type: 'radio' as const,
        label: language === 'TC' ? district.tc : district.en,
        value: district.en,
        checked: this.editedInfo.District_EN === district.en
      })),
      buttons: [
        { text: this.translations.cancel[language], role: 'cancel' },
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

  // Display keywords selection dialog with checkbox inputs for multiple selection.
  async showKeywordsSelector(): Promise<void> {
    const language = await this.getCurrentLanguage();

    const alert = await this.alertController.create({
      header: this.translations.selectKeywords[language],
      inputs: this.keywords.map(keyword => ({
        type: 'checkbox' as const,
        label: language === 'TC' ? keyword.tc : keyword.en,
        value: keyword.en,
        checked: this.editedInfo.Keyword_EN.includes(keyword.en)
      })),
      buttons: [
        { text: this.translations.cancel[language], role: 'cancel' },
        {
          text: 'OK',
          handler: (values: string[]) => {
            this.editedInfo.Keyword_EN = values;
            this.editedInfo.Keyword_TC = values.map(value => {
              const keyword = this.keywords.find(k => k.en === value);
              return keyword ? keyword.tc : value;
            });
          }
        }
      ]
    });
    await alert.present();
  }

  // Display payment methods selection dialog with checkbox inputs for multiple selection.
  async showPaymentMethodsSelector(): Promise<void> {
    const language = await this.getCurrentLanguage();

    const alert = await this.alertController.create({
      header: this.translations.selectPayments[language],
      inputs: this.paymentMethods.map(paymentMethod => ({
        type: 'checkbox' as const,
        label: language === 'TC' ? paymentMethod.tc : paymentMethod.en,
        value: paymentMethod.en,
        checked: this.editedInfo.Payments.includes(paymentMethod.en)
      })),
      buttons: [
        { text: this.translations.cancel[language], role: 'cancel' },
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

  // Display opening hours input dialog for a specific weekday with text input.
  async updateOpeningHours(day: string): Promise<void> {
    const language = await this.getCurrentLanguage();
    const dayLabel = language === 'TC'
      ? this.weekdays.find(w => w.en === day)?.tc
      : day;

    const alert = await this.alertController.create({
      header: dayLabel,
      inputs: [
        {
          name: 'hours',
          type: 'text',
          placeholder: language === 'TC' ? '例如：09:00-22:00 或 休息' : 'e.g. 09:00-22:00 or Closed',
          value: this.editedInfo.Opening_Hours[day] || ''
        }
      ],
      buttons: [
        { text: this.translations.cancel[language], role: 'cancel' },
        {
          text: 'OK',
          handler: (data) => {
            if (data.hours && data.hours.trim()) {
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

  // Map click handler placeholder for future implementation with Leaflet.
  onMapClick(event: any): void {
    // This will be connected to Leaflet map click event
    const latitude = event.latlng?.lat;
    const longitude = event.latlng?.lng;

    if (latitude && longitude) {
      this.editedInfo.Latitude = latitude;
      this.editedInfo.Longitude = longitude;
      this.mapMarker = { lat: latitude, lng: longitude };
    }
  }

  // Start adding a new menu item and reset the editing form.
  startAddingMenuItem(): void {
    this.editingMenuItemId = null;
    this.editedMenuItem = {
      Name_EN: '',
      Name_TC: '',
      Description_EN: '',
      Description_TC: '',
      Price: null
    };
    this.isEditingMenu = true;
  }

  // Start editing an existing menu item by populating the form with its current data.
  startEditingMenuItem(item: MenuItem): void {
    this.editingMenuItemId = item.id || null;
    this.editedMenuItem = {
      Name_EN: item.Name_EN || '',
      Name_TC: item.Name_TC || '',
      Description_EN: item.Description_EN || '',
      Description_TC: item.Description_TC || '',
      Price: item.Price
    };
    this.isEditingMenu = true;
  }

  // Cancel editing menu item and restore the form to its initial empty state.
  cancelEditingMenu(): void {
    this.isEditingMenu = false;
    this.editingMenuItemId = null;
    this.editedMenuItem = {
      Name_EN: '',
      Name_TC: '',
      Description_EN: '',
      Description_TC: '',
      Price: null
    };
  }

  // Save menu item to backend service, handling both create and update operations.
  async saveMenuItem(): Promise<void> {
    if (!this.restaurantId) return;

    const language = await this.getCurrentLanguage();

    // Validation
    if (!this.editedMenuItem.Name_EN && !this.editedMenuItem.Name_TC) {
      await this.showToast(language === 'TC' ? '請輸入名稱' : 'Please enter a name', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: this.translations.saving[language],
      spinner: null
    });
    await loading.present();

    try {
      const payload: Partial<MenuItem> = {
        Name_EN: this.editedMenuItem.Name_EN?.trim() || null,
        Name_TC: this.editedMenuItem.Name_TC?.trim() || null,
        Description_EN: this.editedMenuItem.Description_EN?.trim() || null,
        Description_TC: this.editedMenuItem.Description_TC?.trim() || null,
        Price: this.editedMenuItem.Price
      };

      let menuItemId: string;

      if (this.editingMenuItemId) {
        // Update existing item
        await this.feature.restaurants.updateMenuItem(this.restaurantId, this.editingMenuItemId, payload).toPromise();
        menuItemId = this.editingMenuItemId;
      } else {
        // Create new item
        const createResponse = await this.feature.restaurants.createMenuItem(this.restaurantId, payload).toPromise();
        if (!createResponse || !createResponse.id) {
          throw new Error('Failed to create menu item');
        }
        menuItemId = createResponse.id;
      }

      // Upload image if selected
      if (this.selectedMenuItemImage && menuItemId) {
        const token = await this.feature.auth.getIdToken();
        if (token) {
          await this.feature.restaurants.uploadMenuItemImage(
            this.restaurantId,
            menuItemId,
            this.selectedMenuItemImage,
            token
          ).toPromise();
        }
      }

      await this.showToast(this.editingMenuItemId ? this.translations.updateSuccess[language] : this.translations.createSuccess[language], 'success');

      this.cancelEditingMenu();
      this.clearMenuItemImageSelection();
      this.loadMenu();
    } catch (error: any) {
      console.error('StorePage: Error saving menu item:', error);
      await this.showToast(error.message || this.translations.updateFailed[language], 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // Delete a menu item after confirming the action with the user.
  async deleteMenuItem(item: MenuItem): Promise<void> {
    if (!this.restaurantId || !item.id) return;

    const language = await this.getCurrentLanguage();

    const alert = await this.alertController.create({
      header: this.translations.confirmDelete[language],
      message: this.translations.confirmDeleteMessage[language],
      buttons: [
        { text: this.translations.cancel[language], role: 'cancel' },
        {
          text: this.translations.delete[language],
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: this.translations.saving[language],
              spinner: null
            });
            await loading.present();

            try {
              await this.feature.restaurants.deleteMenuItem(this.restaurantId!, item.id!).toPromise();
              await this.showToast(this.translations.deleteSuccess[language], 'success');
              this.loadMenu();
            } catch (error: any) {
              console.error('StorePage: Error deleting menu item:', error);
              await this.showToast(error.message || this.translations.updateFailed[language], 'danger');
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // Click handler for restaurant image upload button
  clickRestaurantImageUploadButton(): void {
    const fileInput = document.getElementById('restaurant-image-input') as HTMLInputElement;
    fileInput?.click();
  }

  // Click handler for menu item image upload button
  clickMenuItemImageUploadButton(): void {
    const fileInput = document.getElementById('menu-item-image-input') as HTMLInputElement;
    fileInput?.click();
  }

  // Navigate to the public restaurant page to view how customers see the restaurant.
  viewPublicPage(): void {
    if (this.restaurantId) {
      this.router.navigate(['/restaurant', this.restaurantId]);
    }
  }

  // Calculate and return the count of bookings scheduled for today.
  getTodayBookingsCount(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.bookings.filter(booking => {
      const bookingDate = new Date(booking.dateTime);
      return bookingDate >= today && bookingDate < tomorrow && booking.status !== 'cancelled';
    }).length;
  }

  // Calculate and return the count of pending bookings requiring confirmation.
  getPendingBookingsCount(): number {
    return this.bookings.filter(booking => booking.status === 'pending').length;
  }

  // Get the current language setting from the language service stream.
  private async getCurrentLanguage(): Promise<'EN' | 'TC'> {
    return await this.lang$.pipe(take(1)).toPromise() as 'EN' | 'TC';
  }

  // Display a toast notification message to the user at the bottom of the screen.
  private async showToast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  // Check if the user is logged in via the authentication service.
  get isLoggedIn(): boolean {
    return this.feature.auth.isLoggedIn;
  }

  // Check if the user has a linked restaurant and the restaurant data has been loaded.
  get hasRestaurant(): boolean {
    return this.restaurantId !== null && this.restaurant !== null;
  }

  // Generate a display string of keywords in the current language with comma separation.
  getKeywordDisplay(language: 'EN' | 'TC'): string {
    if (language === 'TC' && this.editedInfo.Keyword_TC.length) {
      return this.editedInfo.Keyword_TC.join(', ');
    }
    if (this.editedInfo.Keyword_EN.length) {
      return this.editedInfo.Keyword_EN.join(', ');
    }
    return language === 'TC' ? '未選擇' : 'Not selected';
  }

  // Generate a display string of payment methods in the current language with comma separation.
  getPaymentDisplay(language: 'EN' | 'TC'): string {
    if (!this.editedInfo.Payments.length) {
      return language === 'TC' ? '未選擇' : 'Not selected';
    }

    return this.editedInfo.Payments.map(paymentCode => {
      const method = this.paymentMethods.find(methodItem => methodItem.en === paymentCode);
      return method ? (language === 'TC' ? method.tc : method.en) : paymentCode;
    }).join(', ');
  }

  // Handle pull-to-refresh action by reloading all restaurant data.
  async doRefresh(event: any): Promise<void> {
    this.loadRestaurant();
    this.loadMenu();
    this.loadBookings();
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  // Display confirmation dialog to confirm a pending booking action.
  async confirmBookingAction(booking: Booking): Promise<void> {
    const language = await this.getCurrentLanguage();

    const alert = await this.alertController.create({
      header: this.translations.confirmBookingTitle[language],
      message: this.translations.confirmBookingMessage[language],
      buttons: [
        { text: this.translations.cancel[language], role: 'cancel' },
        {
          text: this.translations.confirmBooking[language],
          handler: async () => {
            await this.updateBookingStatus(booking, 'confirmed', language === 'TC');
          }
        }
      ]
    });
    await alert.present();
  }

  // Display confirmation dialog to reject a pending booking action.
  async rejectBookingAction(booking: Booking): Promise<void> {
    const language = await this.getCurrentLanguage();

    const alert = await this.alertController.create({
      header: this.translations.rejectBookingTitle[language],
      message: this.translations.rejectBookingMessage[language],
      buttons: [
        { text: this.translations.cancel[language], role: 'cancel' },
        {
          text: this.translations.rejectBooking[language],
          role: 'destructive',
          handler: async () => {
            await this.updateBookingStatus(booking, 'cancelled', language === 'TC');
          }
        }
      ]
    });
    await alert.present();
  }

  // Display confirmation dialog to mark a booking as completed.
  async markCompleteAction(booking: Booking): Promise<void> {
    const language = await this.getCurrentLanguage();

    const alert = await this.alertController.create({
      header: this.translations.completeBookingTitle[language],
      message: this.translations.completeBookingMessage[language],
      buttons: [
        { text: this.translations.cancel[language], role: 'cancel' },
        {
          text: this.translations.markComplete[language],
          handler: async () => {
            await this.updateBookingStatus(booking, 'completed', language === 'TC');
          }
        }
      ]
    });
    await alert.present();
  }

  // Update the booking status in the backend service with loading state and user feedback.
  private async updateBookingStatus(booking: Booking, newStatus: Booking['status'], isTC: boolean): Promise<void> {
    const loading = await this.loadingController.create({
      message: isTC ? this.translations.saving.TC : this.translations.saving.EN,
      spinner: null
    });
    await loading.present();

    try {
      await this.feature.bookings.updateBooking(booking.id ?? '', { status: newStatus }).toPromise();
      await this.showToast(isTC ? this.translations.bookingUpdated.TC : this.translations.bookingUpdated.EN, 'success');
      this.loadBookings();
    } catch (error: any) {
      console.error('StorePage: Error updating booking status:', error);
      await this.showToast(error.message || (isTC ? this.translations.updateFailed.TC : this.translations.updateFailed.EN), 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // Handle restaurant image file selection
  onRestaurantImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.showToast('Please select an image file', 'warning');
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        this.showToast('Image size must be less than 10MB', 'warning');
        return;
      }

      this.selectedRestaurantImage = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.restaurantImagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  // Handle menu item image file selection
  onMenuItemImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.showToast('Please select an image file', 'warning');
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        this.showToast('Image size must be less than 10MB', 'warning');
        return;
      }

      this.selectedMenuItemImage = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.menuItemImagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  // Upload restaurant hero image
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
      // Get auth token
      const token = await this.feature.auth.getIdToken();
      if (!token) {
        throw new Error(lang === 'TC' ? '無法獲取身份驗證令牌' : 'Failed to get authentication token');
      }

      // Upload image
      const response = await this.feature.restaurants.uploadRestaurantImage(
        this.restaurantId,
        this.selectedRestaurantImage,
        token
      ).toPromise();

      // Update restaurant with new image URL
      if (response && response.imageUrl) {
        if (this.restaurant) {
          this.restaurant.ImageUrl = response.imageUrl;
        }
        await this.showToast(lang === 'TC' ? '圖片上傳成功' : 'Image uploaded successfully', 'success');

        // Clear selection
        this.selectedRestaurantImage = null;
        this.restaurantImagePreview = null;

        // Reload restaurant data
        this.loadRestaurant();
      }
    } catch (error: any) {
      console.error('StorePage: Error uploading restaurant image:', error);
      await this.showToast(error.message || (lang === 'TC' ? '圖片上傳失敗' : 'Image upload failed'), 'danger');
    } finally {
      this.isUploadingImage = false;
      await loading.dismiss();
    }
  }

  // Clear restaurant image selection
  clearRestaurantImageSelection(): void {
    this.selectedRestaurantImage = null;
    this.restaurantImagePreview = null;

    // Reset file input
    const fileInput = document.getElementById('restaurant-image-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Clear menu item image selection
  clearMenuItemImageSelection(): void {
    this.selectedMenuItemImage = null;
    this.menuItemImagePreview = null;

    // Reset file input
    const fileInput = document.getElementById('menu-item-image-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Update cancelEditingMenu to clear image selection
  private originalCancelEditingMenu = this.cancelEditingMenu;

  // Override cancelEditingMenu to also clear menu item image
  cancelEditingMenuOverride(): void {
    this.cancelEditingMenu();
    this.clearMenuItemImageSelection();
  }

  // Click handler for menu document upload button
  clickMenuDocumentUploadButton(): void {
    const fileInput = document.getElementById('menu-document-input') as HTMLInputElement;
    fileInput?.click();
  }

  // Handle menu document file selection for DocuPipe processing
  onMenuDocumentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validate file type (accept PDF, images, and text files)
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'application/json'];
      if (!validTypes.includes(file.type)) {
        this.showToast('Please select a PDF, image, or text file', 'warning');
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        this.showToast('File size must be less than 10MB', 'warning');
        return;
      }

      this.selectedMenuDocument = file;
      console.log('StorePage: Menu document selected:', file.name);
    }
  }

  // Upload menu document to DocuPipe for extraction
  async uploadMenuDocument(): Promise<void> {
    if (!this.selectedMenuDocument || !this.restaurantId) return;

    const lang = await this.getCurrentLanguage();
    this.isImportingMenu = true;
    this.isPollingDocuPipe = false; // Set to false since server handles polling.

    const loading = await this.loadingController.create({
      message: lang === 'TC' ? '上傳文件中...' : 'Uploading document...',
      spinner: null
    });
    await loading.present();

    try {
      const token = await this.feature.auth.getIdToken();
      if (!token) {
        throw new Error(lang === 'TC' ? '無法獲取身份驗證令牌' : 'Failed to get authentication token');
      }

      const formData = new FormData();
      formData.append('file', this.selectedMenuDocument);

      // Upload to unified endpoint which handles everything server-side.
      const uploadResponse = await fetch(`${this.feature.restaurants['apiUrl']}/API/DocuPipe/extract-menu`, {
        method: 'POST',
        headers: {
          'x-api-passcode': 'PourRice',
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      const extractedData = await uploadResponse.json();
      console.log('StorePage: DocuPipe extraction successful. Extracted items:', extractedData);

      // Parse response directly without polling.
      this.extractedMenuItems = this.parseDocuPipeMenuItems(extractedData);

      await loading.dismiss();

      if (this.extractedMenuItems.length === 0) {
        await this.showToast(lang === 'TC' ? '未能提取到菜單項目' : 'No menu items extracted', 'warning');
      } else {
        await this.showToast(
          lang === 'TC'
            ? `成功提取 ${this.extractedMenuItems.length} 個菜單項目`
            : `Successfully extracted ${this.extractedMenuItems.length} menu items`,
          'success'
        );
        this.showExtractedItemsReview = true;
      }

      this.isImportingMenu = false;
      this.cdr.markForCheck();
    } catch (error: any) {
      console.error('StorePage: Error uploading menu document:', error);
      await loading.dismiss();
      await this.showToast(
        error.message || (lang === 'TC' ? '文件上傳失敗' : 'Document upload failed'),
        'danger'
      );
      this.isImportingMenu = false;
    }
  }

  // Poll DocuPipe job status until completion
  private async pollDocuPipeJob(attempt: number = 0): Promise<void> {
    if (!this.docuPipeJobId || attempt >= 30) {
      // Stop after 30 attempts (about 2 minutes with exponential backoff)
      if (attempt >= 30) {
        const lang = await this.getCurrentLanguage();
        await this.showToast(lang === 'TC' ? '處理超時，請重試' : 'Processing timeout, please retry', 'warning');
      }
      this.isPollingDocuPipe = false;
      this.isImportingMenu = false;
      return;
    }

    try {
      const token = await this.feature.auth.getIdToken();
      if (!token) return;

      // Check job status
      const statusResponse = await fetch(`${this.feature.restaurants['apiUrl']}/API/DocuPipe/job/${this.docuPipeJobId}`, {
        method: 'GET',
        headers: {
          'x-api-passcode': 'PourRice',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!statusResponse.ok) {
        throw new Error('Failed to check job status');
      }

      const statusResult = await statusResponse.json();
      console.log('StorePage: DocuPipe job status:', statusResult.status);

      if (statusResult.status === 'completed') {
        // Job completed, retrieve document results
        await this.retrieveExtractedMenuItems();
      } else if (statusResult.status === 'processing') {
        // Continue polling with exponential backoff
        const delay = Math.min(2000 * Math.pow(1.5, attempt), 16000);
        setTimeout(() => this.pollDocuPipeJob(attempt + 1), delay);
      } else {
        // Job failed or unknown status
        const lang = await this.getCurrentLanguage();
        await this.showToast(lang === 'TC' ? '文件處理失敗' : 'Document processing failed', 'danger');
        this.isPollingDocuPipe = false;
        this.isImportingMenu = false;
      }
    } catch (error: any) {
      console.error('StorePage: Error polling DocuPipe job:', error);
      this.isPollingDocuPipe = false;
      this.isImportingMenu = false;
    }
  }

  // Retrieve and parse extracted menu items from DocuPipe
  private async retrieveExtractedMenuItems(): Promise<void> {
    if (!this.docuPipeDocumentId) return;

    const lang = await this.getCurrentLanguage();

    try {
      const token = await this.feature.auth.getIdToken();
      if (!token) return;

      // Retrieve document results
      const documentResponse = await fetch(`${this.feature.restaurants['apiUrl']}/API/DocuPipe/document/${this.docuPipeDocumentId}`, {
        method: 'GET',
        headers: {
          'x-api-passcode': 'PourRice',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!documentResponse.ok) {
        throw new Error('Failed to retrieve document');
      }

      const documentResult = await documentResponse.json();
      console.log('StorePage: DocuPipe document retrieved:', documentResult);

      // Parse menu items from the document result
      // The exact structure depends on the DocuPipe schema, but typically it will be in result.data or result.workflowResponse
      this.extractedMenuItems = this.parseDocuPipeMenuItems(documentResult);

      if (this.extractedMenuItems.length === 0) {
        await this.showToast(lang === 'TC' ? '未能提取到菜單項目' : 'No menu items extracted', 'warning');
      } else {
        await this.showToast(lang === 'TC' ? `成功提取 ${this.extractedMenuItems.length} 個菜單項目` : `Successfully extracted ${this.extractedMenuItems.length} menu items`, 'success');
        this.showExtractedItemsReview = true;
      }

      this.isPollingDocuPipe = false;
      this.isImportingMenu = false;
      this.cdr.markForCheck();
    } catch (error: any) {
      console.error('StorePage: Error retrieving extracted menu items:', error);
      await this.showToast(error.message || (lang === 'TC' ? '提取菜單失敗' : 'Failed to extract menu'), 'danger');
      this.isPollingDocuPipe = false;
      this.isImportingMenu = false;
    }
  }

  // Parse DocuPipe response to extract menu items
  private parseDocuPipeMenuItems(documentResult: any): Partial<MenuItem>[] {
    const items: Partial<MenuItem>[] = [];

    // Handle new API format with menu_items array wrapper
    if (documentResult.menu_items && Array.isArray(documentResult.menu_items)) {
      for (const item of documentResult.menu_items) {
        items.push({
          Name_EN: item.Name_EN || null,
          Name_TC: item.Name_TC || null,
          Description_EN: item.Description_EN || null,
          Description_TC: item.Description_TC || null,
          Price: this.parsePrice(item.price),
          ImageUrl: item.image || null
        });
      }
      return items;
    }

    // Fallback: Check for workflow response which may contain structured data
    const workflowData = documentResult.workflowResponse?.data || documentResult.result?.data;

    if (workflowData && Array.isArray(workflowData)) {
      // If data is already an array of menu items
      for (const item of workflowData) {
        items.push({
          Name_EN: item.name_en || item.name || item.Name_EN || null,
          Name_TC: item.name_tc || item.Name_TC || null,
          Description_EN: item.description_en || item.description || item.Description_EN || null,
          Description_TC: item.description_tc || item.Description_TC || null,
          Price: this.parsePrice(item.price || item.Price),
          ImageUrl: item.image || item.ImageUrl || null
        });
      }
    } else {
      // Fallback: Parse from document text
      const text = documentResult.result?.text || '';
      const lines = text.split('\n').filter((line: string) => line.trim());

      // Simple parser: look for lines with prices
      for (const line of lines) {
        const priceMatch = line.match(/\$?(\d+(?:\.\d{2})?)/);
        if (priceMatch) {
          const price = parseFloat(priceMatch[1]);
          const name = line.replace(priceMatch[0], '').trim();

          if (name.length > 0) {
            items.push({
              Name_EN: name,
              Name_TC: null,
              Description_EN: null,
              Description_TC: null,
              Price: price,
              ImageUrl: null
            });
          }
        }
      }
    }

    return items;
  }

  // Parse price string to number
  private parsePrice(priceStr: any): number | null {
    if (typeof priceStr === 'number') return priceStr;
    if (typeof priceStr !== 'string') return null;

    const cleaned = priceStr.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  // Remove an item from the extracted menu items list
  removeExtractedItem(index: number): void {
    this.extractedMenuItems.splice(index, 1);
    this.cdr.markForCheck();
  }

  // Update an extracted menu item field
  updateExtractedItem(index: number, field: keyof MenuItem, value: any): void {
    if (this.extractedMenuItems[index]) {
      (this.extractedMenuItems[index] as any)[field] = value;
    }
  }

  // Cancel the menu import process
  cancelMenuImport(): void {
    this.showExtractedItemsReview = false;
    this.extractedMenuItems = [];
    this.selectedMenuDocument = null;
    this.isImportingMenu = false;

    // Reset file input.
    const fileInput = document.getElementById('menu-document-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Save all extracted menu items to the database
  async saveExtractedMenuItems(): Promise<void> {
    if (!this.restaurantId || this.extractedMenuItems.length === 0) return;

    const lang = await this.getCurrentLanguage();

    const loading = await this.loadingController.create({
      message: lang === 'TC' ? '儲存菜單項目中...' : 'Saving menu items...',
      spinner: null
    });
    await loading.present();

    try {
      let successCount = 0;
      let failCount = 0;

      // Save each menu item sequentially
      for (const item of this.extractedMenuItems) {
        try {
          await this.feature.restaurants.createMenuItem(this.restaurantId, item).toPromise();
          successCount++;
        } catch (error) {
          console.error('StorePage: Failed to save menu item:', item, error);
          failCount++;
        }
      }

      await loading.dismiss();

      if (successCount > 0) {
        await this.showToast(
          lang === 'TC' ? `成功儲存 ${successCount} 個項目${failCount > 0 ? `，${failCount} 個失敗` : ''}` : `Successfully saved ${successCount} items${failCount > 0 ? `, ${failCount} failed` : ''}`,
          failCount > 0 ? 'warning' : 'success'
        );
      } else {
        await this.showToast(lang === 'TC' ? '儲存失敗' : 'Failed to save items', 'danger');
      }

      // Reload menu and reset import state
      this.loadMenu();
      this.cancelMenuImport();
    } catch (error: any) {
      console.error('StorePage: Error saving extracted menu items:', error);
      await loading.dismiss();
      await this.showToast(error.message || (lang === 'TC' ? '儲存失敗' : 'Save failed'), 'danger');
    }
  }

  // Cleanup
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyMap();
  }
}