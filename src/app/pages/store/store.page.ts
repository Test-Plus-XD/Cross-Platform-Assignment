// Store management page — entry point for Restaurant-type users.
// Provides four tabbed sections:
//   1. Info     — view + edit restaurant details (opens RestaurantInfoModalComponent)
//   2. Menu     — browse menu items, add/edit via MenuItemModalComponent,
//                 bulk-import via BulkMenuImportModalComponent
//   3. Bookings — view and action pending/accepted/declined/cancelled bookings
//   4. Ads      — manage Stripe-paid advertisement placements
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, ViewChild, AfterViewInit, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AlertController, ToastController, LoadingController, ModalController, ViewWillEnter } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdvertisementsService, Advertisement } from '../../services/advertisements.service';
import { AdModalComponent } from './ad-modal/ad-modal.component';
import { AddRestaurantModalComponent } from './add-restaurant-modal/add-restaurant-modal.component';
import { RestaurantInfoModalComponent } from './restaurant-info-modal/restaurant-info-modal.component';
import { MenuItemModalComponent } from './menu-item-modal/menu-item-modal.component';
import { BulkMenuImportModalComponent } from './bulk-menu-import-modal/bulk-menu-import-modal.component';
import MenuQrModalComponent from './menu-qr-modal/menu-qr-modal.component';
import { DataService } from '../../services/data.service';
import { Booking } from '../../services/booking.service';
import { Restaurant, MenuItem } from '../../services/restaurants.service';
import { StoreFeatureService } from '../../services/store-feature.service';
import { ChatButtonComponent } from '../../shared/chat-button/chat-button.component';
import { Districts } from '../../constants/districts.const';
import { Keywords } from '../../constants/keywords.const';
import { PaymentMethods } from '../../constants/payments.const';
import { Weekdays } from '../../constants/weekdays.const';
import { MenuItemFieldLabels } from '../../constants/restaurant-constants';

@Component({
  selector: 'app-store',
  templateUrl: './store.page.html',
  styleUrls: ['./store.page.scss'],
  standalone: false,
  // OnPush reduces change detection overhead by ~60-80% on large list renders.
  // ChangeDetectorRef.markForCheck() is called manually after async state changes.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorePage implements OnInit, OnDestroy, ViewWillEnter {
  private readonly feature = inject(StoreFeatureService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);
  private readonly loadingController = inject(LoadingController);
  private readonly modalController = inject(ModalController);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly advertisementsService = inject(AdvertisementsService);
  private readonly dataService = inject(DataService);

  // Reference to the floating ChatButtonComponent used by navigateToChat()
  @ViewChild('chatButton') chatButton?: ChatButtonComponent;

  // ── Observable streams ────────────────────────────────────────────────────────
  lang$ = this.feature.language.lang$;   // Emits 'EN' | 'TC' on language change
  isDark$ = this.feature.theme.isDark$;  // Emits true when dark mode is active
  isMobile$: Observable<boolean>;        // True when running on a mobile viewport

  // Snapshot of the current language used in methods that cannot use the async pipe
  currentLanguage: 'EN' | 'TC' = 'EN';

  // ── Restaurant data ───────────────────────────────────────────────────────────
  restaurant: Restaurant | null = null;  // The restaurant linked to this user
  menuItems: MenuItem[] = [];            // All menu items for the restaurant
  bookings: Booking[] = [];              // All bookings fetched from the API

  // ── Booking filter ────────────────────────────────────────────────────────────
  // Controls which status tab is active in the bookings section
  bookingStatusFilter: 'all' | 'pending' | 'accepted' | 'declined' | 'cancelled' = 'pending';

  // Derive the visible booking list from the raw array + current filter
  get filteredBookings(): Booking[] {
    if (this.bookingStatusFilter === 'all') return this.bookings;
    return this.bookings.filter(b => b.status === this.bookingStatusFilter);
  }

  // ── Section navigation ────────────────────────────────────────────────────────
  // Controls which of the four tab sections is displayed
  currentSection: 'info' | 'menu' | 'bookings' | 'ads' = 'info';

  // ── Advertisement state ───────────────────────────────────────────────────────
  advertisements: Advertisement[] = [];
  isAdsLoading = false;

  // ── Loading / saving flags ────────────────────────────────────────────────────
  isLoading = true;             // Initial full-page loader
  isRestaurantLoading = true;   // True while user profile + restaurant are fetching
  isMenuLoading = false;        // True while menu items are fetching
  isBookingsLoading = false;    // True while bookings are fetching

  // ── Error display ─────────────────────────────────────────────────────────────
  errorMessage: string | null = null;

  // ── RxJS teardown ─────────────────────────────────────────────────────────────
  // Emitting on this Subject causes all takeUntil subscriptions to complete
  private destroy$ = new Subject<void>();

  // The restaurant ID stored in the user's profile (set after loadRestaurantData)
  private restaurantId: string | null = null;

  // ── Static reference data (from centralized constants) ────────────────────────
  districts = Districts;
  keywords = Keywords;
  paymentMethods = PaymentMethods;
  weekdays = Weekdays;
  menuItemFieldLabels = MenuItemFieldLabels;

  // ── localStorage key for Stripe session persistence ───────────────────────────
  // If the ad creation modal is closed after payment, the session is stored here
  // so the user can reopen the modal on their next visit to the store page.
  // The entry survives app quits and modal cancellations until the 2h grace
  // window expires or the ad is successfully created.
  private readonly PENDING_AD_SESSION_KEY = 'pendingAdSession';
  private readonly AD_SESSION_GRACE_MS = 2 * 60 * 60 * 1000;
  private lastHandledStripeSessionId: string | null = null;

  // Mirror of the localStorage entry so the resume banner reacts to changes.
  // Valid entry ⇒ banner renders; null ⇒ banner hidden.
  pendingAdSession: { sessionId: string; timestamp: number } | null = null;
  private pendingAdSessionTimer: ReturnType<typeof setInterval> | null = null;

  // ── Bilingual UI strings ──────────────────────────────────────────────────────
  translations = {
    pageTitle:               { EN: 'Store Management',             TC: '店舖管理' },
    restaurantInfo:          { EN: 'Restaurant Information',       TC: '餐廳資料' },
    menuManagement:          { EN: 'Menu Management',              TC: '菜單管理' },
    bookingsOverview:        { EN: 'Bookings Overview',            TC: '預約概覽' },
    noRestaurant:            { EN: 'No restaurant linked',         TC: '未連結餐廳' },
    contactSupport:          { EN: 'Please contact support',       TC: '請聯繫客服' },
    editInfo:                { EN: 'Edit Info',                    TC: '編輯資料' },
    saveChanges:             { EN: 'Save Changes',                 TC: '儲存變更' },
    cancel:                  { EN: 'Cancel',                       TC: '取消' },
    saving:                  { EN: 'Saving...',                    TC: '儲存中...' },
    addMenuItem:             { EN: 'Add Menu Item',                TC: '新增菜單項目' },
    confirmDelete:           { EN: 'Confirm Delete',               TC: '確認刪除' },
    confirmDeleteMessage:    { EN: 'Delete this menu item?',       TC: '刪除此菜單項目？' },
    delete:                  { EN: 'Delete',                       TC: '刪除' },
    noMenuItems:             { EN: 'No menu items yet',            TC: '尚無菜單項目' },
    updateSuccess:           { EN: 'Updated successfully',         TC: '更新成功' },
    updateFailed:            { EN: 'Update failed',                TC: '更新失敗' },
    deleteSuccess:           { EN: 'Deleted successfully',         TC: '刪除成功' },
    viewPublicPage:          { EN: 'View Public Page',             TC: '查看公開頁面' },
    todayBookings:           { EN: "Today's Bookings",             TC: '今日預約' },
    totalBookings:           { EN: 'Total Bookings',               TC: '總預約數' },
    pendingBookings:         { EN: 'Pending',                      TC: '待處理' },
    loading:                 { EN: 'Loading...',                   TC: '載入中...' },
    noBookings:              { EN: 'No bookings yet',              TC: '尚無預約' },
    confirmBooking:          { EN: 'Accept',                       TC: '接受' },
    rejectBooking:           { EN: 'Decline',                      TC: '拒絕' },
    markComplete:            { EN: 'Complete',                     TC: '完成' },
    confirmBookingTitle:     { EN: 'Accept Booking',               TC: '接受預約' },
    confirmBookingMessage:   { EN: 'Accept this booking?',         TC: '接受此預約？' },
    rejectBookingTitle:      { EN: 'Decline Booking',              TC: '拒絕預約' },
    rejectBookingMessage:    { EN: 'Decline this booking?',        TC: '拒絕此預約？' },
    declineMessagePlaceholder:{ EN: 'Optional: reason for declining', TC: '可選：拒絕原因' },
    completeBookingTitle:    { EN: 'Complete Booking',             TC: '完成預約' },
    completeBookingMessage:  { EN: 'Mark this booking as completed?', TC: '將此預約標記為完成？' },
    bookingUpdated:          { EN: 'Booking updated successfully', TC: '預約已成功更新' },
    chatWithDiner:           { EN: 'Chat',                         TC: '聊天' },
    noBookingsPending:       { EN: 'No pending bookings',          TC: '沒有待處理的預約' },
    noBookingsAccepted:      { EN: 'No accepted bookings',         TC: '沒有已接受的預約' },
    noBookingsDeclined:      { EN: 'No declined bookings',         TC: '沒有已拒絕的預約' },
    noBookingsCancelled:     { EN: 'No cancelled bookings',        TC: '沒有已取消的預約' },
    dinerInfo:               { EN: 'Diner Info',                   TC: '用餐者資料' },
    declineReason:           { EN: 'Reason for Decline',          TC: '拒絕原因' },
    accepted:                { EN: 'Accepted',                     TC: '已接受' },
    declined:                { EN: 'Declined',                     TC: '已拒絕' },
    pending:                 { EN: 'Pending',                      TC: '待處理' },
    cancelled:               { EN: 'Cancelled',                    TC: '已取消' },
    completed:               { EN: 'Completed',                    TC: '已完成' },
    advertisements:          { EN: 'Advertisements',               TC: '廣告' },
    placeAd:                 { EN: 'Place New Advertisement',      TC: '刊登新廣告' },
    adCost:                  { EN: 'HK$10 per advertisement',      TC: '每則廣告 HK$10' },
    noAds:                   { EN: 'No advertisements yet',        TC: '尚無廣告' },
    noAdsHint:               { EN: 'Place an advertisement to promote your restaurant in Featured Offers.', TC: '刊登廣告以在精選優惠中推廣您的餐廳。' },
    adActive:                { EN: 'Active',                       TC: '啟用中' },
    adInactive:              { EN: 'Inactive',                     TC: '已停用' },
    deleteAd:                { EN: 'Delete',                       TC: '刪除' },
    confirmDeleteAd:         { EN: 'Delete Advertisement',         TC: '刪除廣告' },
    confirmDeleteAdMessage:  { EN: 'Delete this advertisement?',   TC: '刪除此廣告？' },
    adDeleted:               { EN: 'Advertisement deleted',        TC: '廣告已刪除' },
    processingPayment:       { EN: 'Processing payment...',        TC: '處理付款中...' },
    addRestaurant:           { EN: 'Add New Restaurant',           TC: '新增餐廳' },
    addRestaurantHint:       { EN: 'You can also search and claim your restaurant from Search → Restaurant page, or add it manually here.', TC: '你亦可在「搜尋」頁面找到並認領你的餐廳（進入餐廳頁面），或在此手動新增。' },
    restaurantAdded:         { EN: 'Restaurant added! Loading your dashboard...', TC: '餐廳已新增！正在載入您的主頁...' },
    menuQrCode:              { EN: 'Menu QR Code',                               TC: '菜單二維碼' },
    menuQrCodeHint:          { EN: 'Let customers scan to view your menu',        TC: '讓顧客掃描瀏覽您的菜單' },
    pendingAdTitle:          { EN: 'Advertisement Placement Pending',             TC: '廣告設置待完成' },
    pendingAdDesc:           { EN: 'Your payment was received but the advertisement has not been finalised yet.', TC: '已收到您的付款，但廣告尚未發布。' },
    timeRemaining:           { EN: 'Time remaining:',                             TC: '剩餘時間：' },
    resumeAd:                { EN: 'Complete Advertisement',                      TC: '完成廣告設置' }
  };

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {
    this.isMobile$ = this.feature.platform.isMobile$;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Broadcast the page title so the shared header component can display it
    const event = new CustomEvent('page-title', {
      detail: { Header_EN: 'Store Management', Header_TC: '店舖管理' },
      bubbles: true
    });
    globalThis.dispatchEvent(event);

    // Keep the language snapshot current for methods that cannot use the async pipe
    this.lang$.pipe(takeUntil(this.destroy$)).subscribe(lang => {
      this.currentLanguage = lang;
    });

    // Kick off the main data loading chain (user profile → restaurant → sub-resources)
    this.loadRestaurantData();

    // Hydrate the resume-banner state from localStorage before any modal flow.
    this.refreshPendingAdSession();
    this.subscribeToStripeReturnParams();
    this.checkPendingAdSession();
  }

  ngOnDestroy(): void {
    // Complete all takeUntil subscriptions to prevent memory leaks
    this.destroy$.next();
    this.destroy$.complete();
    this.stopPendingAdSessionTimer();
  }

  // Reload restaurant data when returning from the edit-info sub-page
  ionViewWillEnter(): void {
    if (this.restaurantId && !this.isLoading) {
      this.loadRestaurant();
    }

    // Re-check pending Stripe sessions whenever StorePage becomes active.
    // Covers native return flows that reuse the same route component instance.
    this.refreshPendingAdSession();
    this.checkPendingAdSession();
  }

  // ── Data loading ──────────────────────────────────────────────────────────────

  // Entry point for all data loading.
  // First resolves the user's restaurantId from their profile, then fans out
  // to load restaurant details, menu, bookings, and advertisements in parallel.
  private loadRestaurantData(): void {
    this.isRestaurantLoading = true;
    console.log('StorePage: loadRestaurantData start');

    const currentUser = this.feature.auth.currentUser;
    if (!currentUser?.uid) {
      console.warn('StorePage: no authenticated user');
      this.isRestaurantLoading = false;
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }

    // Fetch the user's profile to obtain the restaurantId they own/manage
    this.feature.user.getUserProfile(currentUser.uid)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (userProfile) => {
          if (!userProfile?.restaurantId?.trim()) {
            console.warn('StorePage: user has no restaurantId');
            this.isRestaurantLoading = false;
            this.isLoading = false;
            this.cdr.markForCheck();
            return;
          }

          this.restaurantId = userProfile.restaurantId;
          console.log('StorePage: restaurantId resolved:', this.restaurantId);

          // All four sub-resources are loaded in parallel from here
          this.loadRestaurant();
          this.loadMenu();
          this.loadBookings();
          this.loadAdvertisements();
        },
        error: (err) => {
          console.error('StorePage: error loading user profile:', err);
          this.isRestaurantLoading = false;
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  // Fetch the restaurant document and populate the local restaurant property.
  private loadRestaurant(): void {
    if (!this.restaurantId) return;

    this.feature.restaurants.getRestaurantById(this.restaurantId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (restaurant) => {
          console.log('StorePage: restaurant loaded:', restaurant?.Name_EN);
          this.restaurant = restaurant;
          this.isRestaurantLoading = false;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('StorePage: error loading restaurant:', err);
          this.isRestaurantLoading = false;
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  // Fetch all menu items belonging to this restaurant.
  // forceRefresh bypasses the service TTL cache after create/import/delete flows.
  private loadMenu(forceRefresh = false): void {
    if (!this.restaurantId) return;

    this.isMenuLoading = true;
    this.feature.restaurants.getMenuItems(this.restaurantId, forceRefresh)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          console.log('StorePage: menu loaded:', items.length, 'items');
          this.menuItems = items;
          this.isMenuLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('StorePage: error loading menu:', err);
          this.isMenuLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  // Fetch all bookings for this restaurant (owner-scoped endpoint that includes
  // enriched diner contact info in the response).
  private loadBookings(): void {
    if (!this.restaurantId) return;

    this.isBookingsLoading = true;
    this.feature.bookings.getRestaurantBookings(this.restaurantId, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bookings) => {
          console.log('StorePage: bookings loaded:', bookings.length);
          this.bookings = bookings;
          this.isBookingsLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('StorePage: error loading bookings:', err);
          this.isBookingsLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  // Fetch advertisements for this restaurant from the advertisements service.
  private loadAdvertisements(): void {
    if (!this.restaurantId) return;

    this.isAdsLoading = true;
    this.advertisementsService.getAdvertisements(this.restaurantId).subscribe({
      next: (ads) => {
        this.advertisements = ads;
        this.isAdsLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('StorePage: error loading advertisements:', err);
        this.isAdsLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ── Section navigation ────────────────────────────────────────────────────────

  // Switch the active section tab. Safe to call at any time.
  switchSection(section: 'info' | 'menu' | 'bookings' | 'ads'): void {
    this.currentSection = section;
  }

  // ── Modal openers ─────────────────────────────────────────────────────────────

  // Open the restaurant info editor as a full-screen modal.
  // Reloads the restaurant summary after a successful save.
  async openRestaurantInfoModal(): Promise<void> {
    if (!this.restaurant || !this.restaurantId) return;
    const modal = await this.modalController.create({
      component: RestaurantInfoModalComponent,
      cssClass: 'restaurant-info-fullscreen-modal',
      backdropDismiss: false
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.saved) {
      this.loadRestaurant();
    }
  }

  // Open the add-restaurant modal for owners who cannot find their restaurant in search.
  // On success, reloads restaurant data so the dashboard renders immediately.
  async openAddRestaurantModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: AddRestaurantModalComponent
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.created) {
      await this.showToast(
        this.currentLanguage === 'TC' ? this.translations.restaurantAdded.TC : this.translations.restaurantAdded.EN,
        'success'
      );
      this.loadRestaurantData();
    }
  }

  // Open the QR code generator modal for the current restaurant's menu deep link.
  async openMenuQrModal(): Promise<void> {
    if (!this.restaurantId || !this.restaurant) return;
    const lang = this.currentLanguage;
    const modal = await this.modalController.create({
      component: MenuQrModalComponent,
      componentProps: {
        restaurantId: this.restaurantId,
        restaurantName: lang === 'TC'
          ? (this.restaurant.Name_TC || this.restaurant.Name_EN || '')
          : (this.restaurant.Name_EN || this.restaurant.Name_TC || ''),
        lang,
      },
    });
    await modal.present();
  }

  // Open the menu item editor in add mode (no item argument) or edit mode.
  // Reloads the menu list after a successful save.
  async openMenuItemModal(item?: MenuItem): Promise<void> {
    if (!this.restaurantId) return;

    const modal = await this.modalController.create({
      component: MenuItemModalComponent,
      componentProps: {
        restaurantId: this.restaurantId,
        // Omitting menuItem puts the modal into add mode
        ...(item ? { menuItem: item } : {})
      }
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.saved) {
      this.loadMenu(true);
    }
  }

  // Open the DocuPipe bulk menu import modal.
  // Reloads the menu list if any items were successfully imported.
  async openBulkMenuImportModal(): Promise<void> {
    if (!this.restaurantId) return;

    const modal = await this.modalController.create({
      component: BulkMenuImportModalComponent,
      componentProps: { restaurantId: this.restaurantId }
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.imported) {
      this.loadMenu(true);
    }
  }

  // ── Menu item actions ─────────────────────────────────────────────────────────

  // Prompt the user to confirm before permanently deleting a menu item.
  async deleteMenuItem(item: MenuItem): Promise<void> {
    if (!this.restaurantId || !item.id) return;

    const lang = this.currentLanguage;

    const alert = await this.alertController.create({
      header:  this.translations.confirmDelete[lang],
      message: this.translations.confirmDeleteMessage[lang],
      buttons: [
        { text: this.translations.cancel[lang], role: 'cancel' },
        {
          text: this.translations.delete[lang],
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: this.translations.saving[lang],
              spinner: null,
              cssClass: 'eclipse-loading'
            });
            await loading.present();

            try {
              await this.feature.restaurants.deleteMenuItem(this.restaurantId!, item.id!).toPromise();
              await this.showToast(this.translations.deleteSuccess[lang], 'success');
              this.loadMenu(true);
            } catch (error: any) {
              console.error('StorePage: error deleting menu item:', error);
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

  // ── Public page navigation ────────────────────────────────────────────────────

  // Open the public-facing restaurant detail page in the same app.
  viewPublicPage(): void {
    if (this.restaurantId) {
      this.router.navigate(['/restaurant', this.restaurantId]);
    }
  }

  // ── Statistics ────────────────────────────────────────────────────────────────

  // Count bookings with a dateTime falling within today's calendar day (HK time),
  // excluding any that were cancelled.
  getTodayBookingsCount(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.bookings.filter(b => {
      const d = new Date(b.dateTime);
      return d >= today && d < tomorrow && b.status !== 'cancelled';
    }).length;
  }

  // Count bookings with status 'pending' (awaiting accept or decline).
  getPendingBookingsCount(): number {
    return this.bookings.filter(b => b.status === 'pending').length;
  }

  // ── Pull-to-refresh ───────────────────────────────────────────────────────────

  // Reload all data sources when the user pulls to refresh.
  async doRefresh(event: any): Promise<void> {
    this.loadRestaurant();
    this.loadMenu(true);
    this.loadBookings();
    // Complete the refresher spinner after a short delay
    setTimeout(() => event.target.complete(), 1000);
  }

  // ── Booking actions ───────────────────────────────────────────────────────────

  // Show a confirmation dialog before marking a pending booking as accepted.
  async confirmBookingAction(booking: Booking): Promise<void> {
    const lang = this.currentLanguage;

    const alert = await this.alertController.create({
      header:  this.translations.confirmBookingTitle[lang],
      message: this.translations.confirmBookingMessage[lang],
      buttons: [
        { text: this.translations.cancel[lang], role: 'cancel' },
        {
          text: this.translations.confirmBooking[lang],
          handler: async () => {
            await this.updateBookingStatus(booking, 'accepted', lang === 'TC');
          }
        }
      ]
    });
    await alert.present();
  }

  // Show a decline dialog with an optional reason textarea.
  async rejectBookingAction(booking: Booking): Promise<void> {
    const lang = this.currentLanguage;

    const alert = await this.alertController.create({
      header: this.translations.rejectBookingTitle[lang],
      inputs: [{
        name: 'declineMessage',
        type: 'textarea',
        placeholder: this.translations.declineMessagePlaceholder[lang]
      }],
      buttons: [
        { text: this.translations.cancel[lang], role: 'cancel' },
        {
          text: this.translations.rejectBooking[lang],
          role: 'destructive',
          handler: async (data) => {
            const msg = data.declineMessage?.trim() || null;
            await this.updateBookingStatus(booking, 'declined', lang === 'TC', msg);
          }
        }
      ]
    });
    await alert.present();
  }

  // Show a confirmation dialog before marking an accepted booking as completed.
  async markCompleteAction(booking: Booking): Promise<void> {
    const lang = this.currentLanguage;

    const alert = await this.alertController.create({
      header:  this.translations.completeBookingTitle[lang],
      message: this.translations.completeBookingMessage[lang],
      buttons: [
        { text: this.translations.cancel[lang], role: 'cancel' },
        {
          text: this.translations.markComplete[lang],
          handler: async () => {
            await this.updateBookingStatus(booking, 'completed', lang === 'TC');
          }
        }
      ]
    });
    await alert.present();
  }

  // Send a status update to the booking API.
  // declineMessage is only sent when the new status is 'declined'.
  private async updateBookingStatus(
    booking: Booking,
    newStatus: Booking['status'],
    isTC: boolean,
    declineMessage?: string | null
  ): Promise<void> {
    const savingMsg = isTC ? this.translations.saving.TC : this.translations.saving.EN;
    const loading = await this.loadingController.create({
      message: savingMsg,
      spinner: null,
      cssClass: 'eclipse-loading'
    });
    await loading.present();

    // Build the minimal update payload (server enforces field restrictions per ownership)
    const updates: { status: Booking['status']; declineMessage?: string | null } = { status: newStatus };
    if (declineMessage !== undefined) updates.declineMessage = declineMessage;

    try {
      await this.feature.bookings.updateBooking(booking.id ?? '', updates).toPromise();
      await this.showToast(
        isTC ? this.translations.bookingUpdated.TC : this.translations.bookingUpdated.EN,
        'success'
      );
      // Refresh the bookings list so the card reflects the new status immediately
      this.loadBookings();
    } catch (error: any) {
      console.error('StorePage: error updating booking:', error);
      await this.showToast(
        error.message || (isTC ? this.translations.updateFailed.TC : this.translations.updateFailed.EN),
        'danger'
      );
    } finally {
      await loading.dismiss();
    }
  }

  // ── Booking list helpers ──────────────────────────────────────────────────────

  // Return the total count for a status tab badge.
  getBookingTabCount(status: 'all' | 'pending' | 'accepted' | 'declined' | 'cancelled'): number {
    if (status === 'all') return this.bookings.length;
    return this.bookings.filter(b => b.status === status).length;
  }

  // Map a booking status value to an Ionic colour name for the status badge.
  getBookingStatusColor(status: Booking['status']): string {
    switch (status) {
      case 'pending':   return 'warning';
      case 'accepted':  return 'success';
      case 'completed': return 'secondary';
      case 'declined':  return 'danger';
      case 'cancelled': return 'medium';
      default:          return 'medium';
    }
  }

  // ── Chat ──────────────────────────────────────────────────────────────────────

  // Open the floating chat UI via the ViewChild reference to ChatButtonComponent.
  // This lets the restaurant owner reply to customer messages without leaving the page.
  navigateToChat(): void {
    this.chatButton?.toggleChat();
  }

  // ── Menu item display helpers ─────────────────────────────────────────────────

  // Return the localised field label for a given MenuItem property name.
  getMenuItemFieldLabel(fieldName: string, lang: 'EN' | 'TC'): string {
    const labels = this.menuItemFieldLabels as any;
    return labels?.[fieldName]?.[lang] || fieldName;
  }

  // Safely extract the image URL from a menu item, returning null for placeholder
  // values inserted by the backend em-dash sanitisation (v1.5.2 fix).
  getMenuItemImageUrl(item: MenuItem): string | null {
    const url = (item as any).imageUrl || (item as any).image;
    if (url && url !== '—' && url !== 'null') return url;
    return null;
  }

  // ── Computed getters ──────────────────────────────────────────────────────────

  // True when a valid Firebase session exists.
  get isLoggedIn(): boolean {
    return this.feature.auth.isLoggedIn;
  }

  // True when both the restaurant ID and the restaurant document are available.
  get hasRestaurant(): boolean {
    return this.restaurantId !== null && this.restaurant !== null;
  }

  // ── Advertisement (Stripe) flow ───────────────────────────────────────────────

  // Read the pending-ad-session entry from localStorage and validate it.
  // Expired, malformed, or missing entries are removed; valid entries are
  // mirrored to `pendingAdSession` so the resume banner can render.
  // Returns the valid session (or null if none).
  private refreshPendingAdSession(): { sessionId: string; timestamp: number } | null {
    const raw = localStorage.getItem(this.PENDING_AD_SESSION_KEY);
    if (!raw) {
      this.clearPendingAdSessionState();
      return null;
    }

    try {
      const { sessionId, timestamp } = JSON.parse(raw);
      if (!this.isValidStripeCheckoutSessionId(sessionId) ||
          typeof timestamp !== 'number' ||
          Date.now() - timestamp > this.AD_SESSION_GRACE_MS) {
        localStorage.removeItem(this.PENDING_AD_SESSION_KEY);
        this.clearPendingAdSessionState();
        return null;
      }

      this.pendingAdSession = { sessionId, timestamp };
      this.startPendingAdSessionTimer();
      this.cdr.markForCheck();
      return this.pendingAdSession;
    } catch {
      localStorage.removeItem(this.PENDING_AD_SESSION_KEY);
      this.clearPendingAdSessionState();
      return null;
    }
  }

  private clearPendingAdSessionState(): void {
    this.pendingAdSession = null;
    this.stopPendingAdSessionTimer();
    this.cdr.markForCheck();
  }

  // Refresh the banner countdown every minute. Also picks up natural expiry.
  private startPendingAdSessionTimer(): void {
    if (this.pendingAdSessionTimer) return;
    this.pendingAdSessionTimer = setInterval(() => {
      this.refreshPendingAdSession();
    }, 60 * 1000);
  }

  private stopPendingAdSessionTimer(): void {
    if (this.pendingAdSessionTimer) {
      clearInterval(this.pendingAdSessionTimer);
      this.pendingAdSessionTimer = null;
    }
  }

  // True while a paid-but-unplaced ad session is still within the 2h window.
  get hasPendingAdSession(): boolean {
    return this.pendingAdSession !== null;
  }

  // Human-readable remaining time for the resume banner: "1h 45m" / "12m".
  get pendingAdSessionRemainingText(): string {
    if (!this.pendingAdSession) return '';
    const elapsed = Date.now() - this.pendingAdSession.timestamp;
    const remaining = Math.max(0, this.AD_SESSION_GRACE_MS - elapsed);
    const totalMinutes = Math.max(1, Math.ceil(remaining / (60 * 1000)));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours <= 0) return `${minutes}m`;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  // Banner "Complete Advertisement" button handler.
  async resumePendingAdPlacement(): Promise<void> {
    const session = this.refreshPendingAdSession();
    if (!session) return;
    await this.openAdModal(session.sessionId);
  }

  // Reopen the ad creation modal from a previously stored Stripe session ID.
  // Runs on page load whenever no Stripe query params are present in the URL.
  // Sessions expire after 2 hours to avoid stale data. The localStorage entry
  // is kept until the ad is successfully created or the window expires, so
  // dismissing the modal leaves the banner available for resume.
  private checkPendingAdSession(): void {
    const session = this.refreshPendingAdSession();
    if (!session) return;

    // Already auto-opened (or handled via query-param path) during this
    // component lifetime. Keep the localStorage entry so the resume banner
    // still works, but don't re-pop the modal on sub-route returns.
    if (session.sessionId === this.lastHandledStripeSessionId) return;

    this.lastHandledStripeSessionId = session.sessionId;

    // Poll until restaurant data is ready, then reopen the ad modal.
    const checkReady = setInterval(() => {
      if (!this.isRestaurantLoading && this.restaurantId) {
        clearInterval(checkReady);
        this.openAdModal(session.sessionId);
      }
    }, 300);

    setTimeout(() => clearInterval(checkReady), 10000);
  }

  // Keep listening for Stripe success query params for the full StorePage lifecycle.
  // Do not use take(1): native deep-link callbacks can arrive after initial render.
  private subscribeToStripeReturnParams(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const sessionId = params['session_id'];
        const isSuccessfulStripeReturn =
          params['payment_success'] === 'true' &&
          this.isValidStripeCheckoutSessionId(sessionId);
        if (!isSuccessfulStripeReturn) return;

        // Avoid duplicate modal openings for repeated router emissions.
        if (this.lastHandledStripeSessionId === sessionId) return;
        this.lastHandledStripeSessionId = sessionId;

        localStorage.setItem(this.PENDING_AD_SESSION_KEY, JSON.stringify({
          sessionId,
          timestamp: Date.now()
        }));
        // Surface the resume banner immediately in case the modal is cancelled.
        this.refreshPendingAdSession();

        // Remove callback params after processing.
        void this.router.navigate(['/store'], { replaceUrl: true });

        const checkReady = setInterval(() => {
          if (!this.isRestaurantLoading && this.restaurantId) {
            clearInterval(checkReady);
            this.openAdModal(sessionId);
          }
        }, 300);

        setTimeout(() => clearInterval(checkReady), 10000);
      });
  }

  // Stripe Checkout returns a Checkout Session ID (cs_...), not a PaymentIntent ID (pi_...).
  private isValidStripeCheckoutSessionId(sessionId: unknown): sessionId is string {
    if (typeof sessionId !== 'string') return false;
    return /^cs_[a-zA-Z0-9_]+$/.test(sessionId);
  }

  // Redirect the user to Stripe Checkout to pay for an advertisement placement (HK$10).
  // The success URL includes {CHECKOUT_SESSION_ID} which Stripe replaces with the real
  // session ID so the app can open the ad creation modal on return.
  async initiateAdPayment(): Promise<void> {
    if (!this.restaurantId) return;

    const lang = this.currentLanguage;
    const paymentMsg = lang === 'TC' ? this.translations.processingPayment.TC : this.translations.processingPayment.EN;
    const loading = await this.loadingController.create({
      message: paymentMsg,
      spinner: null,
      cssClass: 'eclipse-loading'
    });
    await loading.present();

    try {
      const isNative = Capacitor.isNativePlatform();
      const successUrl = isNative
        ? 'pourrice://store?payment_success=true&session_id={CHECKOUT_SESSION_ID}'
        : `${window.location.origin}/store?payment_success=true&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = isNative
        ? 'pourrice://store'
        : `${window.location.origin}/store`;
      const token = await this.feature.auth.getIdToken();

      const response = await this.dataService.post<{ sessionId: string; url: string }>(
        '/API/Stripe/create-ad-checkout-session',
        { restaurantId: this.restaurantId, successUrl, cancelUrl },
        token
      ).toPromise();

      await loading.dismiss();

      // Redirect to Stripe-hosted payment page.
      // Native uses Chrome Custom Tabs / SFSafariViewController; web uses same-tab.
      if (response?.url) {
        if (isNative) {
          await Browser.open({
            url: response.url,
            presentationStyle: 'fullscreen'
          });
        } else {
          window.location.href = response.url;
        }
      }

    } catch (err: any) {
      console.error('StorePage: payment initiation failed:', err);
      await loading.dismiss();
      await this.showToast(
        err.message || (lang === 'TC' ? '付款失敗' : 'Payment failed'),
        'danger'
      );
    }
  }

  // Open the AdModalComponent to collect ad content after a successful Stripe payment.
  // The sessionId is used by the modal to associate the ad with the payment.
  async openAdModal(sessionId: string): Promise<void> {
    this.lastHandledStripeSessionId = sessionId;

    const modal = await this.modalController.create({
      component: AdModalComponent,
      componentProps: {
        sessionId,
        restaurantId: this.restaurantId,
        restaurantName: this.restaurant?.Name_EN || this.restaurant?.Name_TC || '',
        restaurantDistrict: this.restaurant?.District_EN || this.restaurant?.District_TC || '',
        restaurantKeywords: this.restaurant?.Keyword_EN || []
      }
    });
    await modal.present();

    const { data } = await modal.onWillDismiss();

    if (data?.created) {
      // Ad is live — consume the pending session so the banner disappears.
      localStorage.removeItem(this.PENDING_AD_SESSION_KEY);
      this.clearPendingAdSessionState();
      this.loadAdvertisements();
      const lang = this.currentLanguage;
      await this.showToast(
        lang === 'TC' ? '廣告已成功刊登！' : 'Advertisement published successfully!',
        'success'
      );
    } else {
      // Modal cancelled — keep the localStorage entry so the owner can resume
      // placement via the banner within the 2h grace window. Refresh state in
      // case the window expired whilst the modal was open.
      this.refreshPendingAdSession();
    }
  }

  // Prompt for confirmation before deleting an advertisement record.
  async deleteAdvertisement(adId: string): Promise<void> {
    const lang = this.currentLanguage;

    const alert = await this.alertController.create({
      header:  lang === 'TC' ? this.translations.confirmDeleteAd.TC  : this.translations.confirmDeleteAd.EN,
      message: lang === 'TC' ? this.translations.confirmDeleteAdMessage.TC : this.translations.confirmDeleteAdMessage.EN,
      buttons: [
        { text: lang === 'TC' ? this.translations.cancel.TC : this.translations.cancel.EN, role: 'cancel' },
        {
          text: lang === 'TC' ? this.translations.deleteAd.TC : this.translations.deleteAd.EN,
          role: 'destructive',
          handler: async () => {
            try {
              await this.advertisementsService.deleteAdvertisement(adId).toPromise();
              await this.showToast(
                lang === 'TC' ? this.translations.adDeleted.TC : this.translations.adDeleted.EN,
                'success'
              );
              this.loadAdvertisements();
            } catch (err: any) {
              console.error('StorePage: error deleting advertisement:', err);
              await this.showToast(err.message || (lang === 'TC' ? '刪除失敗' : 'Delete failed'), 'danger');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  // Display a brief toast notification at the bottom of the screen.
  private async showToast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 3000, position: 'bottom', color });
    await toast.present();
  }
}
