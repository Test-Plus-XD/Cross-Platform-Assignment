// Page to display and manage user bookings
// Provides functionality to view upcoming, past, and cancelled reservations
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ToastController, LoadingController } from '@ionic/angular';
import { Subject, Observable } from 'rxjs';
import { takeUntil, take, map } from 'rxjs/operators';
import { BookingService, Booking } from '../../services/booking.service';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';

// Type for booking status filter tabs
type BookingFilter = 'upcoming' | 'past' | 'cancelled';

@Component({
  selector: 'app-bookings',
  templateUrl: './bookings.page.html',
  styleUrls: ['./bookings.page.scss'],
  standalone: false
})
export class BookingsPage implements OnInit, OnDestroy {
  // Language stream for bilingual content
  lang$ = this.languageService.lang$;
  // Dark mode stream
  isDark$ = this.themeService.isDark$;
  // All user bookings
  bookings: Booking[] = [];
  // Filtered bookings based on current tab
  filteredBookings: Booking[] = [];
  // Current filter selection
  currentFilter: BookingFilter = 'upcoming';
  // Loading state
  isLoading = true;
  // Error message
  errorMessage: string | null = null;
  // Subject for cleanup
  private destroy$ = new Subject<void>();

  // Translations for the page
  translations = {
    pageTitle: { EN: 'My Bookings', TC: '我的預約' },
    upcoming: { EN: 'Upcoming', TC: '即將到來' },
    past: { EN: 'Past', TC: '過去' },
    cancelled: { EN: 'Cancelled', TC: '已取消' },
    noBookings: { EN: 'No bookings found', TC: '沒有預約' },
    noUpcoming: { EN: 'No upcoming bookings', TC: '沒有即將到來的預約' },
    noPast: { EN: 'No past bookings', TC: '沒有過去的預約' },
    noCancelled: { EN: 'No cancelled bookings', TC: '沒有已取消的預約' },
    guests: { EN: 'guests', TC: '位' },
    guest: { EN: 'guest', TC: '位' },
    status: { EN: 'Status', TC: '狀態' },
    pending: { EN: 'Pending', TC: '待確認' },
    confirmed: { EN: 'Confirmed', TC: '已確認' },
    completed: { EN: 'Completed', TC: '已完成' },
    cancelledStatus: { EN: 'Cancelled', TC: '已取消' },
    specialRequests: { EN: 'Special Requests', TC: '特別要求' },
    cancelBooking: { EN: 'Cancel Booking', TC: '取消預約' },
    cancelConfirmTitle: { EN: 'Cancel Booking?', TC: '取消預約？' },
    cancelConfirmMessage: { EN: 'Are you sure you want to cancel this booking? This action cannot be undone.', TC: '您確定要取消此預約嗎？此操作無法撤銷。' },
    cancel: { EN: 'Cancel', TC: '取消' },
    confirm: { EN: 'Confirm', TC: '確認' },
    cancelSuccess: { EN: 'Booking cancelled successfully', TC: '預約已成功取消' },
    cancelError: { EN: 'Failed to cancel booking', TC: '取消預約失敗' },
    viewRestaurant: { EN: 'View Restaurant', TC: '查看餐廳' },
    loginRequired: { EN: 'Please log in to view your bookings', TC: '請登入以查看您的預約' },
    makeBooking: { EN: 'Make a Booking', TC: '進行預約' },
    searchRestaurants: { EN: 'Search Restaurants', TC: '搜尋餐廳' }
  };

  constructor(
    private readonly bookingService: BookingService,
    private readonly authService: AuthService,
    private readonly languageService: LanguageService,
    private readonly themeService: ThemeService,
    private readonly router: Router,
    private readonly alertController: AlertController,
    private readonly toastController: ToastController,
    private readonly loadingController: LoadingController
  ) { }

  ngOnInit(): void {
    // Emit page title event
    const event = new CustomEvent('page-title', {
      detail: { Header_EN: 'My Bookings', Header_TC: '我的預約' },
      bubbles: true
    });
    window.dispatchEvent(event);

    // Check authentication and load bookings
    this.loadBookings();
  }

  // Lifecycle hook when page enters view
  ionViewWillEnter(): void {
    // Refresh bookings when returning to page
    this.loadBookings(true);
  }

  // Load user bookings from the service
  loadBookings(forceRefresh: boolean = false): void {
    // Check if user is logged in
    if (!this.authService.isLoggedIn) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.bookingService.getUserBookings(forceRefresh)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bookings) => {
          this.bookings = bookings;
          this.applyFilter();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('BookingsPage: Error loading bookings', err);
          this.errorMessage = err.message || 'Failed to load bookings';
          this.isLoading = false;
        }
      });
  }

  // Apply the current filter to bookings
  applyFilter(): void {
    const now = new Date().toISOString();

    switch (this.currentFilter) {
      case 'upcoming':
        // Pending or confirmed bookings with future dates
        this.filteredBookings = this.bookings.filter(b =>
          (b.status === 'pending' || b.status === 'confirmed') &&
          b.dateTime > now
        ).sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
        break;

      case 'past':
        // Completed bookings or past dates (excluding cancelled)
        this.filteredBookings = this.bookings.filter(b =>
          b.status === 'completed' ||
          (b.dateTime < now && b.status !== 'cancelled')
        ).sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
        break;

      case 'cancelled':
        // Cancelled bookings
        this.filteredBookings = this.bookings.filter(b => b.status === 'cancelled')
          .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
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
    const now = new Date().toISOString();

    switch (filter) {
      case 'upcoming':
        return this.bookings.filter(b =>
          (b.status === 'pending' || b.status === 'confirmed') &&
          b.dateTime > now
        ).length;

      case 'past':
        return this.bookings.filter(b =>
          b.status === 'completed' ||
          (b.dateTime < now && b.status !== 'cancelled')
        ).length;

      case 'cancelled':
        return this.bookings.filter(b => b.status === 'cancelled').length;

      default:
        return 0;
    }
  }

  // Format date for display
  formatDate(dateString: string, isTC: boolean): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(isTC ? 'zh-HK' : 'en-GB', {
      year: 'numeric',
      month: 'long',
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

  // Get localised status text
  getStatusText(status: Booking['status'], isTC: boolean): string {
    switch (status) {
      case 'pending':
        return isTC ? this.translations.pending.TC : this.translations.pending.EN;
      case 'confirmed':
        return isTC ? this.translations.confirmed.TC : this.translations.confirmed.EN;
      case 'completed':
        return isTC ? this.translations.completed.TC : this.translations.completed.EN;
      case 'cancelled':
        return isTC ? this.translations.cancelledStatus.TC : this.translations.cancelledStatus.EN;
      default:
        return status;
    }
  }

  // Navigate to restaurant detail page
  viewRestaurant(restaurantId: string): void {
    this.router.navigate(['/restaurant', restaurantId]);
  }

  // Navigate to search page to make new booking
  goToSearch(): void {
    this.router.navigate(['/search']);
  }

  // Navigate to login page
  goToLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: '/bookings' }
    });
  }

  // Cancel a booking with confirmation
  async cancelBooking(booking: Booking): Promise<void> {
    const lang = await this.languageService.lang$.pipe(take(1)).toPromise();
    const isTC = lang === 'TC';

    const alert = await this.alertController.create({
      header: isTC ? this.translations.cancelConfirmTitle.TC : this.translations.cancelConfirmTitle.EN,
      message: isTC ? this.translations.cancelConfirmMessage.TC : this.translations.cancelConfirmMessage.EN,
      buttons: [
        {
          text: isTC ? this.translations.cancel.TC : this.translations.cancel.EN,
          role: 'cancel'
        },
        {
          text: isTC ? this.translations.confirm.TC : this.translations.confirm.EN,
          role: 'destructive',
          handler: async () => {
            await this.performCancellation(booking, isTC);
          }
        }
      ]
    });

    await alert.present();
  }

  // Perform the actual booking cancellation
  private async performCancellation(booking: Booking, isTC: boolean): Promise<void> {
    const loading = await this.loadingController.create({
      message: isTC ? '取消中...' : 'Cancelling...',
      spinner: 'crescent'
    });
    await loading.present();

    this.bookingService.cancelBooking(booking.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          await loading.dismiss();

          // Show success toast
          const toast = await this.toastController.create({
            message: isTC ? this.translations.cancelSuccess.TC : this.translations.cancelSuccess.EN,
            duration: 2000,
            color: 'success'
          });
          await toast.present();

          // Refresh bookings
          this.loadBookings(true);
        },
        error: async (err) => {
          await loading.dismiss();

          // Show error toast
          const toast = await this.toastController.create({
            message: err.message || (isTC ? this.translations.cancelError.TC : this.translations.cancelError.EN),
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
    // Wait for loading to complete
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  // Check if user is logged in
  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn;
  }

  // Clean up on destroy
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}