// Booking page for customers to view and manage their reservations
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import { BookingService, Booking } from '../../services/booking.service';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';
import { PlatformService } from '../../services/platform.service';

type BookingFilter = 'upcoming' | 'past' | 'declined' | 'cancelled' | 'all';

@Component({
  selector: 'app-booking',
  templateUrl: './booking.page.html',
  styleUrls: ['./booking.page.scss'],
  standalone: false,
})
export class BookingPage implements OnInit, OnDestroy {
  lang$ = this.languageService.lang$;
  isDark$ = this.themeService.isDark$;
  isMobile$ = this.platformService.isMobile$;

  booking: Booking[] = [];
  filteredBooking: Booking[] = [];
  currentFilter: BookingFilter = 'upcoming';

  isLoading = true;
  errorMessage: string | null = null;

  private destroy$ = new Subject<void>();

  translations = {
    pageTitle: { EN: 'My Bookings', TC: '我的預約' },
    upcoming: { EN: 'Upcoming', TC: '即將到來' },
    past: { EN: 'Past', TC: '過去' },
    declined: { EN: 'Declined', TC: '已拒絕' },
    cancelled: { EN: 'Cancelled', TC: '已取消' },
    all: { EN: 'All', TC: '全部' },
    noBooking: { EN: 'No bookings found', TC: '沒有預約記錄' },
    noUpcoming: { EN: 'No upcoming bookings', TC: '沒有即將到來的預約' },
    noPast: { EN: 'No past bookings', TC: '沒有過去的預約' },
    noDeclined: { EN: 'No declined bookings', TC: '沒有已拒絕的預約' },
    noCancelled: { EN: 'No cancelled bookings', TC: '沒有已取消的預約' },
    guests: { EN: 'guests', TC: '位' },
    guest: { EN: 'guest', TC: '位' },
    specialRequests: { EN: 'Special Requests', TC: '特別要求' },
    declineMessage: { EN: 'Reason for Decline', TC: '拒絕原因' },
    cancel: { EN: 'Cancel Booking', TC: '取消預約' },
    cancelConfirm: { EN: 'Are you sure you want to cancel this booking?', TC: '您確定要取消此預約嗎？' },
    bookingCancelled: { EN: 'Booking cancelled successfully', TC: '已成功取消預約' },
    cancelFailed: { EN: 'Failed to cancel booking', TC: '取消預約失敗' },
    editBooking: { EN: 'Edit Booking', TC: '修改預約' },
    editBookingTitle: { EN: 'Edit Booking Details', TC: '修改預約詳情' },
    bookingUpdated: { EN: 'Booking updated successfully', TC: '預約已成功更新' },
    editFailed: { EN: 'Failed to update booking', TC: '更新預約失敗' },
    deleteBooking: { EN: 'Delete Record', TC: '刪除記錄' },
    deleteConfirm: { EN: 'Delete this booking record? This cannot be undone.', TC: '確定刪除此預約記錄？此操作不可逆。' },
    bookingDeleted: { EN: 'Booking record deleted', TC: '預約記錄已刪除' },
    deleteFailed: { EN: 'Failed to delete booking', TC: '刪除預約失敗' },
    status: { EN: 'Status', TC: '狀態' },
    pending: { EN: 'Pending', TC: '待處理' },
    accepted: { EN: 'Accepted', TC: '已接受' },
    completed: { EN: 'Completed', TC: '已完成' },
    loginRequired: { EN: 'Please log in to view your bookings', TC: '請登入以查看您的預約' },
    date: { EN: 'Date', TC: '日期' },
    time: { EN: 'Time', TC: '時間' },
    numberOfGuests: { EN: 'Number of Guests', TC: '人數' },
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
    const event = new CustomEvent('page-title', {
      detail: { Header_EN: 'My Bookings', Header_TC: '我的預約' },
      bubbles: true
    });
    globalThis.dispatchEvent(event);

    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadBooking();
  }

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

  applyFilter(): void {
    const now = new Date();

    switch (this.currentFilter) {
      case 'upcoming':
        this.filteredBooking = this.booking
          .filter(b => new Date(b.dateTime) >= now && (b.status === 'pending' || b.status === 'accepted'))
          .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
        break;

      case 'past':
        this.filteredBooking = this.booking
          .filter(b => b.status === 'completed' || (new Date(b.dateTime) < now && b.status !== 'cancelled' && b.status !== 'declined'))
          .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
        break;

      case 'declined':
        this.filteredBooking = this.booking
          .filter(b => b.status === 'declined')
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

  onFilterChange(filter: BookingFilter): void {
    this.currentFilter = filter;
    this.applyFilter();
  }

  getFilterCount(filter: BookingFilter): number {
    const now = new Date();
    switch (filter) {
      case 'upcoming':
        return this.booking.filter(b => new Date(b.dateTime) >= now && (b.status === 'pending' || b.status === 'accepted')).length;
      case 'past':
        return this.booking.filter(b => b.status === 'completed' || (new Date(b.dateTime) < now && b.status !== 'cancelled' && b.status !== 'declined')).length;
      case 'declined':
        return this.booking.filter(b => b.status === 'declined').length;
      case 'cancelled':
        return this.booking.filter(b => b.status === 'cancelled').length;
      case 'all':
        return this.booking.length;
      default:
        return 0;
    }
  }

  // Diner can only cancel a pending booking
  canCancel(booking: Booking): boolean {
    return booking.status === 'pending';
  }

  // Diner can only edit a pending booking
  canEdit(booking: Booking): boolean {
    return booking.status === 'pending';
  }

  // Booking record can only be deleted if the date is older than 30 days
  canDelete(booking: Booking): boolean {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return new Date(booking.dateTime) < cutoff;
  }

  async cancelBooking(booking: Booking): Promise<void> {
    const lang = await this.languageService.lang$.pipe(take(1)).toPromise();
    const isTC = lang === 'TC';

    const alert = await this.alertController.create({
      header: isTC ? this.translations.cancel.TC : this.translations.cancel.EN,
      message: isTC ? this.translations.cancelConfirm.TC : this.translations.cancelConfirm.EN,
      buttons: [
        { text: isTC ? '否' : 'No', role: 'cancel' },
        {
          text: isTC ? '是' : 'Yes',
          role: 'destructive',
          handler: async () => {
            await this.performStatusUpdate(booking.id!, { status: 'cancelled' }, isTC,
              isTC ? this.translations.bookingCancelled.TC : this.translations.bookingCancelled.EN,
              isTC ? this.translations.cancelFailed.TC : this.translations.cancelFailed.EN
            );
          }
        }
      ]
    });
    await alert.present();
  }

  async editBooking(booking: Booking): Promise<void> {
    const lang = await this.languageService.lang$.pipe(take(1)).toPromise();
    const isTC = lang === 'TC';

    // Pre-fill current values
    const existingDate = booking.dateTime ? booking.dateTime.substring(0, 10) : '';
    const existingTime = booking.dateTime ? booking.dateTime.substring(11, 16) : '';

    const alert = await this.alertController.create({
      header: isTC ? this.translations.editBookingTitle.TC : this.translations.editBookingTitle.EN,
      inputs: [
        {
          name: 'date',
          type: 'date',
          value: existingDate,
          min: new Date().toISOString().substring(0, 10),
        },
        {
          name: 'time',
          type: 'time',
          value: existingTime,
        },
        {
          name: 'numberOfGuests',
          type: 'number',
          value: booking.numberOfGuests,
          min: 1,
          max: 30,
          placeholder: isTC ? this.translations.numberOfGuests.TC : this.translations.numberOfGuests.EN,
        },
        {
          name: 'specialRequests',
          type: 'textarea',
          value: booking.specialRequests || '',
          placeholder: isTC ? this.translations.specialRequests.TC : this.translations.specialRequests.EN,
        },
      ],
      buttons: [
        { text: isTC ? '取消' : 'Cancel', role: 'cancel' },
        {
          text: isTC ? '儲存' : 'Save',
          handler: async (data) => {
            if (!data.date || !data.time) return false;
            const dateTime = new Date(`${data.date}T${data.time}`).toISOString();
            const updates: any = { dateTime };
            if (data.numberOfGuests) updates.numberOfGuests = parseInt(data.numberOfGuests, 10);
            updates.specialRequests = data.specialRequests || null;
            await this.performStatusUpdate(booking.id!, updates, isTC,
              isTC ? this.translations.bookingUpdated.TC : this.translations.bookingUpdated.EN,
              isTC ? this.translations.editFailed.TC : this.translations.editFailed.EN
            );
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  async deleteBooking(booking: Booking): Promise<void> {
    const lang = await this.languageService.lang$.pipe(take(1)).toPromise();
    const isTC = lang === 'TC';

    const alert = await this.alertController.create({
      header: isTC ? this.translations.deleteBooking.TC : this.translations.deleteBooking.EN,
      message: isTC ? this.translations.deleteConfirm.TC : this.translations.deleteConfirm.EN,
      buttons: [
        { text: isTC ? '否' : 'No', role: 'cancel' },
        {
          text: isTC ? '刪除' : 'Delete',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({ spinner: null });
            await loading.present();
            this.bookingService.deleteBooking(booking.id!)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: async () => {
                  await loading.dismiss();
                  await this.showToast(isTC ? this.translations.bookingDeleted.TC : this.translations.bookingDeleted.EN, 'success');
                  this.loadBooking(true);
                },
                error: async (err) => {
                  await loading.dismiss();
                  await this.showToast(err.message || (isTC ? this.translations.deleteFailed.TC : this.translations.deleteFailed.EN), 'danger');
                }
              });
          }
        }
      ]
    });
    await alert.present();
  }

  private async performStatusUpdate(id: string, updates: any, isTC: boolean, successMsg: string, failMsg: string): Promise<void> {
    const loading = await this.loadingController.create({ spinner: null });
    await loading.present();

    this.bookingService.updateBooking(id, updates)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async () => {
          await loading.dismiss();
          await this.showToast(successMsg, 'success');
          this.loadBooking(true);
        },
        error: async (err) => {
          await loading.dismiss();
          await this.showToast(err.message || failMsg, 'danger');
        }
      });
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 2500, color });
    await toast.present();
  }

  viewRestaurant(restaurantId: string): void {
    this.router.navigate(['/restaurant', restaurantId]);
  }

  formatDate(dateString: string, isTC: boolean): string {
    const date = new Date(dateString);
    return date.toLocaleDateString(isTC ? 'zh-HK' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short'
    });
  }

  formatTime(dateString: string, isTC: boolean): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString(isTC ? 'zh-HK' : 'en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusColor(status: Booking['status']): string {
    switch (status) {
      case 'pending': return 'warning';
      case 'accepted': return 'success';
      case 'completed': return 'secondary';
      case 'declined': return 'danger';
      case 'cancelled': return 'medium';
      default: return 'medium';
    }
  }

  getUpcomingCount(): number {
    const now = new Date();
    return this.booking.filter(b => new Date(b.dateTime) >= now && (b.status === 'pending' || b.status === 'accepted')).length;
  }

  getPastCount(): number {
    const now = new Date();
    return this.booking.filter(b => b.status === 'completed' || (new Date(b.dateTime) < now && b.status !== 'cancelled' && b.status !== 'declined')).length;
  }

  getDeclinedCount(): number {
    return this.booking.filter(b => b.status === 'declined').length;
  }

  getCancelledCount(): number {
    return this.booking.filter(b => b.status === 'cancelled').length;
  }

  getTotalCount(): number {
    return this.booking.length;
  }

  async doRefresh(event: any): Promise<void> {
    this.loadBooking(true);
    setTimeout(() => { event.target.complete(); }, 1000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
