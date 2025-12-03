// Booking page for customers to view and manage their reservations
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Subject, Observable } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import { BookingService, Booking } from '../../services/booking.service';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';
import { PlatformService } from '../../services/platform.service';

type BookingFilter = 'upcoming' | 'past' | 'cancelled' | 'all';

@Component({
  selector: 'app-booking',
  templateUrl: './booking.page.html',
  styleUrls: ['./booking.page.scss'],
  standalone: false,
})
export class BookingPage implements OnInit, OnDestroy {
  // Observables for template
  lang$ = this.languageService.lang$;
  isDark$ = this.themeService.isDark$;
  isMobile$ = this.platformService.isMobile$;

  // Booking data
  booking: Booking[] = [];
  filteredBooking: Booking[] = [];
  currentFilter: BookingFilter = 'upcoming';

  // Loading states
  isLoading = true;
  errorMessage: string | null = null;

  // Cleanup subject
  private destroy$ = new Subject<void>();

  // Translations
  translations = {
    pageTitle: { EN: 'My Booking', TC: '我的預約' },
    upcoming: { EN: 'Upcoming', TC: '即將到來' },
    past: { EN: 'Past', TC: '過去' },
    cancelled: { EN: 'Cancelled', TC: '已取消' },
    all: { EN: 'All', TC: '全部' },
    noBooking: { EN: 'No booking found', TC: '沒有預約記錄' },
    noUpcoming: { EN: 'No upcoming booking', TC: '沒有即將到來的預約' },
    noPast: { EN: 'No past booking', TC: '沒有過去的預約' },
    noCancelled: { EN: 'No cancelled booking', TC: '沒有已取消的預約' },
    guests: { EN: 'guests', TC: '位' },
    guest: { EN: 'guest', TC: '位' },
    specialRequests: { EN: 'Special Requests', TC: '特別要求' },
    cancel: { EN: 'Cancel', TC: '取消' },
    cancelBooking: { EN: 'Cancel Booking', TC: '取消預約' },
    cancelConfirm: { EN: 'Are you sure you want to cancel this booking?', TC: '您確定要取消此預約嗎？' },
    bookingCancelled: { EN: 'Booking cancelled successfully', TC: '已成功取消預約' },
    cancelFailed: { EN: 'Failed to cancel booking', TC: '取消預約失敗' },
    status: { EN: 'Status', TC: '狀態' },
    pending: { EN: 'Pending', TC: '待處理' },
    confirmed: { EN: 'Confirmed', TC: '已確認' },
    completed: { EN: 'Completed', TC: '已完成' },
    viewDetails: { EN: 'View Details', TC: '查看詳情' },
    loginRequired: { EN: 'Please log in to view your booking', TC: '請登入以查看您的預約' }
  };

  constructor(
    private readonly bookingService: BookingService,
    private readonly authService: AuthService,
    private readonly languageService: LanguageService,
    private readonly themeService: ThemeService,
    private readonly platformService: PlatformService,
    private readonly router: Router,
    private readonly alertController: AlertController,
    private readonly loadingController: LoadingController,
    private readonly toastController: ToastController
  ) {}

  ngOnInit(): void {
    // Emit page title event
    const event = new CustomEvent('page-title', {
      detail: { Header_EN: 'My Booking', Header_TC: '我的預約' },
      bubbles: true
    });
    globalThis.dispatchEvent(event);

    // Check if user is logged in
    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }
    // Load booking
    this.loadBooking();
  }

  // Load user's bookings
  loadBooking(forceRefresh: boolean = false): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.bookingService.getUserBookings(forceRefresh)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bookings: Booking[]) => {
          this.booking = bookings;
          this.applyFilter();
          this.isLoading = false;
        },
        error: (err: Error) => {
          console.error('BookingPage: Error loading bookings', err);
          this.errorMessage = err.message || 'Failed to load bookings';
          this.isLoading = false;
        }
      });
  }

  // Apply current filter to booking
  applyFilter(): void {
    const now = new Date();

    switch (this.currentFilter) {
      case 'upcoming':
        this.filteredBooking = this.booking
          .filter(b => new Date(b.dateTime) >= now && b.status !== 'cancelled')
          .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
        break;

      case 'past':
        this.filteredBooking = this.booking
          .filter(b => new Date(b.dateTime) < now && b.status !== 'cancelled')
          .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
        break;

      case 'cancelled':
        this.filteredBooking = this.booking
          .filter(b => b.status === 'cancelled')
          .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
        break;

      case 'all':
      default:
        this.filteredBooking = [...this.booking]
          .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
        break;
    }
  }

  // Handle filter change
  onFilterChange(filter: BookingFilter): void {
    this.currentFilter = filter;
    this.applyFilter();
  }

  // Get count for each filter category
  getFilterCount(filter: BookingFilter): number {
    const now = new Date();

    switch (filter) {
      case 'upcoming':
        return this.booking.filter(b => new Date(b.dateTime) >= now && b.status !== 'cancelled').length;
      case 'past':
        return this.booking.filter(b => new Date(b.dateTime) < now && b.status !== 'cancelled').length;
      case 'cancelled':
        return this.booking.filter(b => b.status === 'cancelled').length;
      case 'all':
        return this.booking.length;
      default:
        return 0;
    }
  }

  // Cancel a booking
  async cancelBooking(booking: Booking): Promise<void> {
    const lang = await this.languageService.lang$.pipe(take(1)).toPromise();
    const isTC = lang === 'TC';

    const alert = await this.alertController.create({
      header: isTC ? this.translations.cancelBooking.TC : this.translations.cancelBooking.EN,
      message: isTC ? this.translations.cancelConfirm.TC : this.translations.cancelConfirm.EN,
      buttons: [
        {
          text: isTC ? '否' : 'No',
          role: 'cancel'
        },
        {
          text: isTC ? '是' : 'Yes',
          role: 'destructive',
          handler: async () => {
            await this.performCancellation(booking, isTC);
          }
        }
      ]
    });

    await alert.present();
  }

  // Perform booking cancellation
  private async performCancellation(booking: Booking, isTC: boolean): Promise<void> {
    const loading = await this.loadingController.create({
      message: isTC ? '取消中...' : 'Cancelling...',
      spinner: 'crescent'
    });
    await loading.present();

    this.bookingService.updateBooking(booking.id!, { status: 'cancelled' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          await loading.dismiss();

          const toast = await this.toastController.create({
            message: isTC ? this.translations.bookingCancelled.TC : this.translations.bookingCancelled.EN,
            duration: 2000,
            color: 'success'
          });
          await toast.present();

          // Refresh booking
          this.loadBooking(true);
        },
        error: async (err) => {
          await loading.dismiss();

          const toast = await this.toastController.create({
            message: err.message || (isTC ? this.translations.cancelFailed.TC : this.translations.cancelFailed.EN),
            duration: 3000,
            color: 'danger'
          });
          await toast.present();
        }
      });
  }

  // Navigate to restaurant page
  viewRestaurant(restaurantId: string): void {
    this.router.navigate(['/restaurant', restaurantId]);
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

  // Get status color
  getStatusColor(status: Booking['status']): string {
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

  // Check if booking can be cancelled
  canCancel(booking: Booking): boolean {
    // Can cancel if booking is upcoming and not already cancelled
    const now = new Date();
    return new Date(booking.dateTime) >= now && booking.status !== 'cancelled' && booking.status !== 'completed';
  }

  // Handle pull-to-refresh
  async doRefresh(event: any): Promise<void> {
    this.loadBooking(true);
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}