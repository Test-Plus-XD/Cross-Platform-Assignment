// Store management page for Restaurant-type users
// Provides restaurant info editing, menu management, and bookings overview
import { Component, OnInit, OnDestroy, Injector, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController, ModalController } from '@ionic/angular';
import { Subject, Observable } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import { BookingService, Booking } from '../../services/booking.service';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';
import { PlatformService } from '../../services/platform.service';
import { RestaurantsService, Restaurant, MenuItem } from '../../services/restaurants.service';
import { UserService } from '../../services/user.service';
import { DISTRICTS, KEYWORDS, District, Keyword } from '../../constants/restaurant-constants';
import * as L from 'leaflet';

// Payment methods supported
export const PAYMENT_METHODS = [
  { en: 'Cash', tc: '現金' },
  { en: 'Credit Card', tc: '信用卡' },
  { en: 'Debit Card', tc: '扣賬卡' },
  { en: 'Octopus', tc: '八達通' },
  { en: 'AliPay HK', tc: '支付寶香港' },
  { en: 'WeChat Pay HK', tc: '微信支付香港' },
  { en: 'PayMe', tc: 'PayMe' },
  { en: 'FPS', tc: '轉數快' },
  { en: 'Apple Pay', tc: 'Apple Pay' },
  { en: 'Google Pay', tc: 'Google Pay' }
];

// Days of the week for opening hours
export const WEEKDAYS = [
  { en: 'Monday', tc: '星期一' },
  { en: 'Tuesday', tc: '星期二' },
  { en: 'Wednesday', tc: '星期三' },
  { en: 'Thursday', tc: '星期四' },
  { en: 'Friday', tc: '星期五' },
  { en: 'Saturday', tc: '星期六' },
  { en: 'Sunday', tc: '星期日' }
];

@Component({
  selector: 'app-store',
  templateUrl: './store.page.html',
  styleUrls: ['./store.page.scss'],
  standalone: false,
})
export class StorePage implements OnInit, OnDestroy {
  // Language and platform streams
  lang$ = this.languageService.lang$;
  isDark$ = this.themeService.isDark$;
  isMobile$: Observable<boolean>;

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
  districts = DISTRICTS;
  keywords = KEYWORDS;
  paymentMethods = PAYMENT_METHODS;
  weekdays = WEEKDAYS;

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

  // Edited menu item
  editedMenuItem: Partial<MenuItem> = {
    Name_EN: '',
    Name_TC: '',
    Description_EN: '',
    Description_TC: '',
    Price: null
  };

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
    open24h: { EN: 'Open 24h', tc: '24小時' }
  };

  constructor(
    private readonly bookingService: BookingService,
    private readonly authService: AuthService,
    private readonly languageService: LanguageService,
    private readonly themeService: ThemeService,
    private readonly platformService: PlatformService,
    private readonly restaurantsService: RestaurantsService,
    private readonly router: Router,
    private readonly alertController: AlertController,
    private readonly toastController: ToastController,
    private readonly loadingController: LoadingController,
    private readonly modalController: ModalController,
    private readonly injector: Injector
  ) {
    this.isMobile$ = this.platformService.isMobile$;
  }

  ngOnInit(): void {
    // Emit page title event
    const event = new CustomEvent('page-title', {
      detail: { Header_EN: 'Store Management', Header_TC: '店舖管理' },
      bubbles: true
    });
    globalThis.dispatchEvent(event);

    // Load restaurant data
    this.loadRestaurantData();
  }

  // Load restaurant data linked to current user
  private loadRestaurantData(): void {
    this.isRestaurantLoading = true;
    console.log('StorePage: Starting loadRestaurantData');

    const currentUser = this.authService.currentUser;
    console.log('StorePage: Current user:', currentUser?.uid);

    if (!currentUser || !currentUser.uid) {
      console.warn('StorePage: No authenticated user found');
      this.isRestaurantLoading = false;
      this.isLoading = false;
      return;
    }

    // Fetch user profile to get restaurantId
    const userService = this.injector.get(UserService);
    userService.getUserProfile(currentUser.uid)
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

  // Load restaurant details
  private loadRestaurant(): void {
    if (!this.restaurantId) return;

    this.restaurantsService.getRestaurantById(this.restaurantId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (restaurant) => {
          console.log('StorePage: Restaurant loaded:', restaurant?.Name_EN);
          this.restaurant = restaurant;
          this.isRestaurantLoading = false;
          this.isLoading = false;

          // Initialize edited values
          if (restaurant) {
            this.initializeEditedInfo(restaurant);
          }
        },
        error: (err) => {
          console.error('StorePage: Error loading restaurant:', err);
          this.isRestaurantLoading = false;
          this.isLoading = false;
        }
      });
  }

  // Initialize edited info from restaurant data
  private initializeEditedInfo(restaurant: Restaurant): void {
    this.editedInfo = {
      Name_EN: restaurant.Name_EN || '',
      Name_TC: restaurant.Name_TC || '',
      Address_EN: restaurant.Address_EN || '',
      Address_TC: restaurant.Address_TC || '',
      District_EN: restaurant.District_EN || '',
      District_TC: restaurant.District_TC || '',
      Latitude: restaurant.Latitude,
      Longitude: restaurant.Longitude,
      Keyword_EN: restaurant.Keyword_EN || [],
      Keyword_TC: restaurant.Keyword_TC || [],
      Seats: restaurant.Seats,
      Contacts: {
        Phone: restaurant.Contacts?.Phone || '',
        Email: restaurant.Contacts?.Email || '',
        Website: restaurant.Contacts?.Website || ''
      },
      Payments: restaurant.Payments || [],
      Opening_Hours: restaurant.Opening_Hours || {}
    };

    // Set map marker if location exists
    if (restaurant.Latitude && restaurant.Longitude) {
      this.mapMarker = { lat: restaurant.Latitude, lng: restaurant.Longitude };
    }
  }

  // Load menu items
  private loadMenu(): void {
    if (!this.restaurantId) return;

    this.isMenuLoading = true;
    this.restaurantsService.getMenuItems(this.restaurantId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          console.log('StorePage: Menu loaded:', items.length, 'items');
          this.menuItems = items;
          this.isMenuLoading = false;
        },
        error: (err) => {
          console.error('StorePage: Error loading menu:', err);
          this.isMenuLoading = false;
        }
      });
  }

  // Load bookings
  private loadBookings(): void {
    if (!this.restaurantId) return;

    this.isBookingsLoading = true;
    this.bookingService.getRestaurantBookings(this.restaurantId, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bookings) => {
          console.log('StorePage: Bookings loaded:', bookings.length);
          this.bookings = bookings;
          this.isBookingsLoading = false;
        },
        error: (err) => {
          console.error('StorePage: Error loading bookings:', err);
          this.isBookingsLoading = false;
        }
      });
  }

  // Switch sections
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

  // Start editing restaurant info
  startEditingInfo(): void {
    if (!this.restaurant) return;
    this.initializeEditedInfo(this.restaurant);
    this.isEditingInfo = true;

    // Initialize map after a short delay to ensure DOM is ready
    setTimeout(() => {
      this.initializeMap();
    }, 300);
  }

  // Cancel editing restaurant info
  cancelEditingInfo(): void {
    this.isEditingInfo = false;
    if (this.restaurant) {
      this.initializeEditedInfo(this.restaurant);
    }
    // Cleanup map
    this.destroyMap();
  }

  // Initialize Leaflet map
  private initializeMap(): void {
    if (this.mapInitialized || this.map) {
      return;
    }

    const mapContainer = document.getElementById('store-map');
    if (!mapContainer) {
      console.warn('StorePage: Map container not found');
      return;
    }

    // Default center (Hong Kong)
    const defaultLat = 22.3193;
    const defaultLng = 114.1694;

    const centerLat = this.editedInfo.Latitude || defaultLat;
    const centerLng = this.editedInfo.Longitude || defaultLng;

    // Initialize map
    this.map = L.map('store-map').setView([centerLat, centerLng], 13);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(this.map);

    // Add marker if location exists
    if (this.mapMarker) {
      L.marker([this.mapMarker.lat, this.mapMarker.lng]).addTo(this.map);
    }

    // Handle map click
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      this.onMapClickHandler(e);
    });

    this.mapInitialized = true;
    console.log('StorePage: Map initialized');
  }

  // Handle map click event
  private onMapClickHandler(event: L.LeafletMouseEvent): void {
    const lat = event.latlng.lat;
    const lng = event.latlng.lng;

    this.editedInfo.Latitude = lat;
    this.editedInfo.Longitude = lng;
    this.mapMarker = { lat, lng };

    // Clear existing markers
    if (this.map) {
      this.map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          this.map?.removeLayer(layer);
        }
      });

      // Add new marker
      L.marker([lat, lng]).addTo(this.map);
    }
  }

  // Destroy map instance
  private destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.mapInitialized = false;
      console.log('StorePage: Map destroyed');
    }
  }

  // Save restaurant info
  async saveRestaurantInfo(): Promise<void> {
    if (!this.restaurantId) return;

    const lang = await this.getCurrentLanguage();
    const loading = await this.loadingController.create({
      message: this.translations.saving[lang],
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

      await this.restaurantsService.updateRestaurant(this.restaurantId, payload).toPromise();

      await this.showToast(this.translations.updateSuccess[lang], 'success');
      this.isEditingInfo = false;

      // Reload restaurant data
      this.loadRestaurant();
    } catch (error: any) {
      console.error('StorePage: Error saving restaurant info:', error);
      await this.showToast(error.message || this.translations.updateFailed[lang], 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // Show district selector
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

  // Show keywords selector
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
            this.editedInfo.Keyword_EN = values;
            this.editedInfo.Keyword_TC = values.map(val => {
              const keyword = this.keywords.find(k => k.en === val);
              return keyword ? keyword.tc : val;
            });
          }
        }
      ]
    });
    await alert.present();
  }

  // Show payment methods selector
  async showPaymentMethodsSelector(): Promise<void> {
    const lang = await this.getCurrentLanguage();

    const alert = await this.alertController.create({
      header: this.translations.selectPayments[lang],
      inputs: this.paymentMethods.map(p => ({
        type: 'checkbox' as const,
        label: lang === 'TC' ? p.tc : p.en,
        value: p.en,
        checked: this.editedInfo.Payments.includes(p.en)
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

  // Update opening hours for a day
  async updateOpeningHours(day: string): Promise<void> {
    const lang = await this.getCurrentLanguage();
    const dayLabel = lang === 'TC'
      ? this.weekdays.find(w => w.en === day)?.tc
      : day;

    const alert = await this.alertController.create({
      header: dayLabel,
      inputs: [
        {
          name: 'hours',
          type: 'text',
          placeholder: lang === 'TC' ? '例如：09:00-22:00 或 休息' : 'e.g. 09:00-22:00 or Closed',
          value: this.editedInfo.Opening_Hours[day] || ''
        }
      ],
      buttons: [
        { text: this.translations.cancel[lang], role: 'cancel' },
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

  // Map click handler (placeholder - will be implemented with Leaflet)
  onMapClick(event: any): void {
    // This will be connected to Leaflet map click event
    const lat = event.latlng?.lat;
    const lng = event.latlng?.lng;

    if (lat && lng) {
      this.editedInfo.Latitude = lat;
      this.editedInfo.Longitude = lng;
      this.mapMarker = { lat, lng };
    }
  }

  // Start adding new menu item
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

  // Start editing existing menu item
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

  // Cancel editing menu item
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

  // Save menu item (create or update)
  async saveMenuItem(): Promise<void> {
    if (!this.restaurantId) return;

    const lang = await this.getCurrentLanguage();

    // Validation
    if (!this.editedMenuItem.Name_EN && !this.editedMenuItem.Name_TC) {
      await this.showToast(lang === 'TC' ? '請輸入名稱' : 'Please enter a name', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: this.translations.saving[lang],
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

      if (this.editingMenuItemId) {
        // Update existing item
        await this.restaurantsService.updateMenuItem(this.restaurantId, this.editingMenuItemId, payload).toPromise();
        await this.showToast(this.translations.updateSuccess[lang], 'success');
      } else {
        // Create new item
        await this.restaurantsService.createMenuItem(this.restaurantId, payload).toPromise();
        await this.showToast(this.translations.createSuccess[lang], 'success');
      }

      this.cancelEditingMenu();
      this.loadMenu();
    } catch (error: any) {
      console.error('StorePage: Error saving menu item:', error);
      await this.showToast(error.message || this.translations.updateFailed[lang], 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // Delete menu item
  async deleteMenuItem(item: MenuItem): Promise<void> {
    if (!this.restaurantId || !item.id) return;

    const lang = await this.getCurrentLanguage();

    const alert = await this.alertController.create({
      header: this.translations.confirmDelete[lang],
      message: this.translations.confirmDeleteMessage[lang],
      buttons: [
        { text: this.translations.cancel[lang], role: 'cancel' },
        {
          text: this.translations.delete[lang],
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: this.translations.saving[lang],
              spinner: null
            });
            await loading.present();

            try {
              await this.restaurantsService.deleteMenuItem(this.restaurantId!, item.id!).toPromise();
              await this.showToast(this.translations.deleteSuccess[lang], 'success');
              this.loadMenu();
            } catch (error: any) {
              console.error('StorePage: Error deleting menu item:', error);
              await this.showToast(error.message || this.translations.updateFailed[lang], 'danger');
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // Navigate to public restaurant page
  viewPublicPage(): void {
    if (this.restaurantId) {
      this.router.navigate(['/restaurant', this.restaurantId]);
    }
  }

  // Get today's bookings count
  getTodayBookingsCount(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.bookings.filter(b => {
      const bookingDate = new Date(b.dateTime);
      return bookingDate >= today && bookingDate < tomorrow && b.status !== 'cancelled';
    }).length;
  }

  // Get pending bookings count
  getPendingBookingsCount(): number {
    return this.bookings.filter(b => b.status === 'pending').length;
  }

  // Helper to get current language
  private async getCurrentLanguage(): Promise<'EN' | 'TC'> {
    return await this.lang$.pipe(take(1)).toPromise() as 'EN' | 'TC';
  }

  // Show toast notification
  private async showToast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  // Check if user is logged in
  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn;
  }

  // Check if user has a linked restaurant
  get hasRestaurant(): boolean {
    return this.restaurantId !== null && this.restaurant !== null;
  }

  // Get display keyword list
  getKeywordDisplay(lang: 'EN' | 'TC'): string {
    if (lang === 'TC' && this.editedInfo.Keyword_TC.length) {
      return this.editedInfo.Keyword_TC.join(', ');
    }
    if (this.editedInfo.Keyword_EN.length) {
      return this.editedInfo.Keyword_EN.join(', ');
    }
    return lang === 'TC' ? '未選擇' : 'Not selected';
  }

  // Get display payment methods
  getPaymentDisplay(lang: 'EN' | 'TC'): string {
    if (!this.editedInfo.Payments.length) {
      return lang === 'TC' ? '未選擇' : 'Not selected';
    }

    return this.editedInfo.Payments.map(p => {
      const method = this.paymentMethods.find(m => m.en === p);
      return method ? (lang === 'TC' ? method.tc : method.en) : p;
    }).join(', ');
  }

  // Pull-to-refresh handler
  async doRefresh(event: any): Promise<void> {
    this.loadRestaurant();
    this.loadMenu();
    this.loadBookings();
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  // Cleanup
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyMap();
  }
}
