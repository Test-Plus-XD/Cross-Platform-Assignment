// Store management page for Restaurant-type users
// Provides functionality to view incoming bookings and manage restaurant details
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { Subject, Observable } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import { BookingService, Booking } from '../../services/booking.service';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';
import { RestaurantsService, Restaurant } from '../../services/restaurants.service';

// Type for booking status filter tabs
type BookingFilter = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'all';

@Component({
  selector: 'app-store',
  templateUrl: './store.page.html',
  styleUrls: ['./store.page.scss'],
  standalone: false,
})
export class StorePage implements OnInit, OnDestroy {
  // Language stream for bilingual content
  lang$ = this.languageService.lang$;
  // Dark mode stream
  isDark$ = this.themeService.isDark$;
  // Restaurant details for this owner
  restaurant: Restaurant | null = null;
  // All incoming bookings for this restaurant
  bookings: Booking[] = [];
  // Filtered bookings based on current tab
  filteredBookings: Booking[] = [];
  // Current filter selection
  currentFilter: BookingFilter = 'pending';
  // Loading states
  isLoading = true;
  isRestaurantLoading = true;
  // Error message
  errorMessage: string | null = null;
  // Subject for cleanup
  private destroy$ = new Subject<void>();
  // Current user's restaurant ID (retrieved from auth or user profile)
  private restaurantId: string | null = null;

  // Translations for the page
  translations = {
    pageTitle: { EN: 'Store Management', TC: '店舖管理' },
    restaurantDetails: { EN: 'Restaurant Details', TC: '餐廳資料' },
    incomingBookings: { EN: 'Incoming Bookings', TC: '預約訂單' },
    pending: { EN: 'Pending', TC: '待處理' },
    confirmed: { EN: 'Confirmed', TC: '已確認' },
    completed: { EN: 'Completed', TC: '已完成' },
    cancelled: { EN: 'Cancelled', TC: '已取消' },
    all: { EN: 'All', TC: '全部' },
    noBookings: { EN: 'No bookings found', TC: '沒有預約' },
    noPending: { EN: 'No pending bookings', TC: '沒有待處理的預約' },
    noConfirmed: { EN: 'No confirmed bookings', TC: '沒有已確認的預約' },
    noCompleted: { EN: 'No completed bookings', TC: '沒有已完成的預約' },
    noCancelled: { EN: 'No cancelled bookings', TC: '沒有已取消的預約' },
    guests: { EN: 'guests', TC: '位' },
    guest: { EN: 'guest', TC: '位' },
    specialRequests: { EN: 'Special Requests', TC: '特別要求' },
    confirmBooking: { EN: 'Confirm', TC: '確認' },
    rejectBooking: { EN: 'Reject', TC: '拒絕' },
    markComplete: { EN: 'Complete', TC: '完成' },
    confirmAction: { EN: 'Confirm Booking?', TC: '確認預約？' },
    confirmMessage: { EN: 'Are you sure you want to confirm this booking?', TC: '您確定要確認此預約嗎？' },
    rejectAction: { EN: 'Reject Booking?', TC: '拒絕預約？' },
    rejectMessage: { EN: 'Are you sure you want to reject this booking?', TC: '您確定要拒絕此預約嗎？' },
    completeAction: { EN: 'Mark as Complete?', TC: '標記為完成？' },
    completeMessage: { EN: 'Mark this booking as completed?', TC: '將此預約標記為已完成？' },
    cancel: { EN: 'Cancel', TC: '取消' },
    confirm: { EN: 'Confirm', TC: '確認' },
    actionSuccess: { EN: 'Booking updated successfully', TC: '預約已成功更新' },
    actionError: { EN: 'Failed to update booking', TC: '更新預約失敗' },
    todayBookings: { EN: "Today's Bookings", TC: '今日預約' },
    upcomingBookings: { EN: 'Upcoming Bookings', TC: '即將到來的預約' },
    editRestaurant: { EN: 'Edit Restaurant', TC: '編輯餐廳' },
    viewPublicPage: { EN: 'View Public Page', TC: '查看公開頁面' },
    statistics: { EN: 'Statistics', TC: '統計' },
    totalBookings: { EN: 'Total Bookings', TC: '總預約數' },
    totalGuests: { EN: 'Total Guests', TC: '總人數' },
    pendingCount: { EN: 'Pending', TC: '待處理' },
    noRestaurant: { EN: 'No restaurant linked to your account', TC: '您的帳戶未連結餐廳' },
    contactSupport: { EN: 'Please contact support to set up your restaurant.', TC: '請聯繫客服以設置您的餐廳。' }
  };

  constructor(
    private readonly bookingService: BookingService,
    private readonly authService: AuthService,
    private readonly languageService: LanguageService,
    private readonly themeService: ThemeService,
    private readonly restaurantsService: RestaurantsService,
    private readonly router: Router,
    private readonly alertController: AlertController,
    private readonly toastController: ToastController,
    private readonly loadingController: LoadingController
  ) { }

  ngOnInit(): void {
    // Emit page title event
    const event = new CustomEvent('page-title', {
      detail: { Header_EN: 'Store Management', Header_TC: '店舖管理' },
      bubbles: true
    });
    globalThis.dispatchEvent(event);

    // Load restaurant and bookings
    this.loadRestaurantData();
  }

  // Lifecycle hook when page enters view
  ionViewWillEnter(): void {
    this.loadBookings(true);
  }

  // Load restaurant data linked to current user
  private loadRestaurantData(): void {
    this.isRestaurantLoading = true;

    // Get the current user's linked restaurant ID
    // This assumes the user profile contains a restaurantId field
    const currentUser = this.authService.currentUser;
    if (currentUser && currentUser.restaurantId) {
      this.restaurantId = currentUser.restaurantId;

      // Load restaurant details
      this.restaurantsService.getRestaurantById(this.restaurantId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (restaurant) => {
            this.restaurant = restaurant;
            this.isRestaurantLoading = false;
            // Load bookings for this restaurant
            this.loadBookings();
          },
          error: (err) => {
            console.error('StorePage: Error loading restaurant', err);
            this.isRestaurantLoading = false;
          }
        });
    } else {
      this.isRestaurantLoading = false;
      this.isLoading = false;
    }
  }

  // Load bookings for this restaurant
  loadBookings(forceRefresh: boolean = false): void {
    if (!this.restaurantId) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    // Fetch bookings for this restaurant (using restaurant-specific endpoint)
    this.bookingService.getRestaurantBookings(this.restaurantId, forceRefresh)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bookings) => {
          this.bookings = bookings;
          this.applyFilter();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('StorePage: Error loading bookings', err);
          this.errorMessage = err.message || 'Failed to load bookings';
          this.isLoading = false;
        }
      });
  }

  // Apply the current filter to bookings
  applyFilter(): void {
    switch (this.currentFilter) {
      case 'pending':
        this.filteredBookings = this.bookings
          .filter(b => b.status === 'pending')
          .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
        break;

      case 'confirmed':
        this.filteredBookings = this.bookings
          .filter(b => b.status === 'confirmed')
          .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
        break;
      case 'completed':
        this.filteredBookings = this.bookings
          .filter(b => b.status === 'completed')
          .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
        break;
      case 'cancelled':
        this.filteredBookings = this.bookings
          .filter(b => b.status === 'cancelled')
          .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
        break;
      case 'all':
      default:
        this.filteredBookings = [...this.bookings]
          .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
        break;
    }
  }

  // Handle filter tab change
  onFilterChange(filter: BookingFilter): void {
    this.currentFilter = filter;
    this.applyFilter();
  }

  // Get count for each filter category
  getFilterCount(filter: BookingFilter): number {
    switch (filter) {
      case 'pending':
        return this.bookings.filter(b => b.status === 'pending').length;
      case 'confirmed':
        return this.bookings.filter(b => b.status === 'confirmed').length;
      case 'completed':
        return this.bookings.filter(b => b.status === 'completed').length;
      case 'cancelled':
        return this.bookings.filter(b => b.status === 'cancelled').length;
      case 'all':
        return this.bookings.length;
      default:
        return 0;
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

  // Get total guests count from confirmed/completed bookings
  getTotalGuestsCount(): number {
    return this.bookings
      .filter(b => b.status === 'confirmed' || b.status === 'completed')
      .reduce((sum, b) => sum + b.numberOfGuests, 0);
  }

  // Format date for display
  formatDate(dateString: string, isTC: boolean): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(isTC ? 'zh-HK' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });
  }

  // Format time for display
  formatTime(dateString: string, isTC: boolean): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString(isTC ? 'zh-HK' : 'en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Get status colour for badge
  getStatusColour(status: Booking['status']): string {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'confirmed':
        return 'success';
      case 'completed':
        return 'primary';
      case 'cancelled':
        return 'danger';
      default:
        return 'medium';
    }
  }

  // Navigate to restaurant public page
  viewPublicPage(): void {
    if (this.restaurantId) {
      this.router.navigate(['/restaurant', this.restaurantId]);
    }
  }

  // Navigate to edit restaurant page
  editRestaurant(): void {
    if (this.restaurantId) {
      this.router.navigate(['/edit-restaurant', this.restaurantId]);
    }
  }

  // Confirm a pending booking
  async confirmBookingAction(booking: Booking): Promise<void> {
    const lang = await this.languageService.lang$.pipe(take(1)).toPromise();
    const isTC = lang === 'TC';

    const alert = await this.alertController.create({
      header: isTC ? this.translations.confirmAction.TC : this.translations.confirmAction.EN,
      message: isTC ? this.translations.confirmMessage.TC : this.translations.confirmMessage.EN,
      buttons: [
        {
          text: isTC ? this.translations.cancel.TC : this.translations.cancel.EN,
          role: 'cancel'
        },
        {
          text: isTC ? this.translations.confirm.TC : this.translations.confirm.EN,
          handler: async () => {
            await this.updateBookingStatus(booking, 'confirmed', isTC);
          }
        }
      ]
    });
    await alert.present();
  }

  // Reject a pending booking
  async rejectBookingAction(booking: Booking): Promise<void> {
    const lang = await this.languageService.lang$.pipe(take(1)).toPromise();
    const isTC = lang === 'TC';

    const alert = await this.alertController.create({
      header: isTC ? this.translations.rejectAction.TC : this.translations.rejectAction.EN,
      message: isTC ? this.translations.rejectMessage.TC : this.translations.rejectMessage.EN,
      buttons: [
        {
          text: isTC ? this.translations.cancel.TC : this.translations.cancel.EN,
          role: 'cancel'
        },
        {
          text: isTC ? this.translations.confirm.TC : this.translations.confirm.EN,
          role: 'destructive',
          handler: async () => {
            await this.updateBookingStatus(booking, 'cancelled', isTC);
          }
        }
      ]
    });

    await alert.present();
  }

  // Mark booking as completed
  async markCompleteAction(booking: Booking): Promise<void> {
    const lang = await this.languageService.lang$.pipe(take(1)).toPromise();
    const isTC = lang === 'TC';

    const alert = await this.alertController.create({
      header: isTC ? this.translations.completeAction.TC : this.translations.completeAction.EN,
      message: isTC ? this.translations.completeMessage.TC : this.translations.completeMessage.EN,
      buttons: [
        {
          text: isTC ? this.translations.cancel.TC : this.translations.cancel.EN,
          role: 'cancel'
        },
        {
          text: isTC ? this.translations.confirm.TC : this.translations.confirm.EN,
          handler: async () => {
            await this.updateBookingStatus(booking, 'completed', isTC);
          }
        }
      ]
    });
    await alert.present();
  }

  // Update booking status via service
  private async updateBookingStatus(booking: Booking, newStatus: Booking['status'], isTC: boolean): Promise<void> {
    const loading = await this.loadingController.create({
      message: isTC ? '更新中...' : 'Updating...',
      spinner: 'crescent'
    });
    await loading.present();

    this.bookingService.updateBooking(booking.id!, { status: newStatus })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          await loading.dismiss();

          const toast = await this.toastController.create({
            message: isTC ? this.translations.actionSuccess.TC : this.translations.actionSuccess.EN,
            duration: 2000,
            color: 'success'
          });
          await toast.present();

          // Refresh bookings
          this.loadBookings(true);
        },
        error: async (err) => {
          await loading.dismiss();

          const toast = await this.toastController.create({
            message: err.message || (isTC ? this.translations.actionError.TC : this.translations.actionError.EN),
            duration: 3000,
            color: 'danger'
          });
          await toast.present();
        }
      });
  }

  // Handle pull-to-refresh
  async doRefresh(event: any): Promise<void> {
    this.loadBookings(true);
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  // Check if user is logged in
  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn;
  }

  // Check if user has a linked restaurant
  get hasRestaurant(): boolean {
    return this.restaurantId !== null && this.restaurant !== null;
  }

  // Clean up on destroy
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}