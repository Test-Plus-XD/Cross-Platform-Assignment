import { Component, Input, ChangeDetectorRef } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { Restaurant, OpeningHours } from '../../services/restaurants.service';

interface ParsedHours {
  open: string | null;
  close: string | null;
}

@Component({
  selector: 'app-booking-modal',
  templateUrl: './booking-modal.component.html',
  styleUrls: ['./booking-modal.component.scss'],
  standalone: false
})
export class BookingModalComponent {
  @Input() restaurant!: Restaurant;
  @Input() lang: string = 'EN';

  bookingDateTime: string | null = null;
  numberOfGuests: number = 2;
  specialRequests: string = '';

  /// Set minimum to current moment in HK time using a fixed +08:00 offset
  readonly minBookingDate: string = (() => {
    const now = new Date();
    const hkOffset = 8 * 60; // UTC+8 in minutes
    const localOffset = now.getTimezoneOffset(); // Local offset in minutes (negative for east)
    const hkTime = new Date(now.getTime() + (hkOffset + localOffset) * 60000);
    // Return as local ISO without Z so ion-datetime treats it as nominal HK time
    return hkTime.toISOString().slice(0, 16);
  })();

  hoursStatus: 'open' | 'outside' | 'unknown' = 'unknown';
  hoursInfo: ParsedHours | null = null;
  hoursMessage: string = '';

  constructor(
    private readonly modalController: ModalController,
    private readonly toastController: ToastController,
    private readonly cdr: ChangeDetectorRef
  ) { }

  /// Called by ion-datetime on every value change
  onDateTimeChange(event: CustomEvent): void {
    const raw = event.detail?.value;
    if (!raw) {
      this.bookingDateTime = null;
      this.hoursStatus = 'unknown';
      this.hoursMessage = '';
      this.cdr.markForCheck();
      return;
    }
    // ion-datetime may return an array when multiple selection is enabled — take first
    this.bookingDateTime = Array.isArray(raw) ? raw[0] : raw;
    this.evaluateOpeningHours(this.bookingDateTime!);
  }

  /// Derive HK weekday + time from the selected ISO string and compare to opening hours
  private evaluateOpeningHours(isoString: string): void {
    if (!this.restaurant?.Opening_Hours) {
      this.hoursStatus = 'unknown';
      this.hoursMessage = '';
      this.cdr.markForCheck();
      return;
    }

    const date = new Date(isoString);

    // Use Intl to extract HK local time parts reliably regardless of device timezone
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Hong_Kong',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const weekday = parts.find(p => p.type === 'weekday')?.value ?? '';   // e.g. "Monday"
    const hourStr = parts.find(p => p.type === 'hour')?.value ?? '0';
    const minStr = parts.find(p => p.type === 'minute')?.value ?? '0';
    const selectedMinutes = parseInt(hourStr, 10) * 60 + parseInt(minStr, 10);

    // Match day key case-insensitively
    const hours = this.restaurant.Opening_Hours as OpeningHours;
    const dayKey = Object.keys(hours).find(k => k.toLowerCase() === weekday.toLowerCase());

    if (!dayKey || hours[dayKey] == null) {
      this.hoursStatus = 'unknown';
      this.hoursInfo = null;
      this.hoursMessage = this.lang === 'TC' ? '未提供該日營業時間' : 'Hours not listed for this day';
      this.cdr.markForCheck();
      return;
    }

    const parsed = this.parseHoursValue(hours[dayKey]!);
    this.hoursInfo = parsed;

    if (!parsed.open || !parsed.close) {
      this.hoursStatus = 'unknown';
      this.hoursMessage = this.lang === 'TC' ? '未提供該日營業時間' : 'Hours not listed for this day';
      this.cdr.markForCheck();
      return;
    }

    const [openH, openM] = parsed.open.split(':').map(Number);
    const [closeH, closeM] = parsed.close.split(':').map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    if (selectedMinutes >= openMinutes && selectedMinutes < closeMinutes) {
      this.hoursStatus = 'open';
      this.hoursMessage = this.lang === 'TC'
        ? `營業時間內（${parsed.open} – ${parsed.close}）`
        : `Within opening hours (${parsed.open} – ${parsed.close})`;
    } else {
      this.hoursStatus = 'outside';
      this.hoursMessage = this.lang === 'TC'
        ? `所選時間超出營業時間（${parsed.open} – ${parsed.close}）`
        : `Outside opening hours (${parsed.open} – ${parsed.close})`;
    }

    this.cdr.markForCheck();
  }

  /// Parse a single Opening_Hours day value into open/close strings
  private parseHoursValue(
    value: string | { open?: string | null; close?: string | null } | null
  ): ParsedHours {
    if (!value) return { open: null, close: null };

    if (typeof value === 'string') {
      // Supports "11:30-21:30", "11:30 – 21:30", "11:30~21:30"
      const match = value.match(/(\d{1,2}:\d{2})\s*[-–~]\s*(\d{1,2}:\d{2})/);
      return match ? { open: match[1], close: match[2] } : { open: null, close: null };
    }

    if (typeof value === 'object') {
      return { open: value.open ?? null, close: value.close ?? null };
    }

    return { open: null, close: null };
  }

  increaseGuests(): void {
    if (this.numberOfGuests < 100) {
      this.numberOfGuests++;
      this.cdr.markForCheck();
    }
  }

  decreaseGuests(): void {
    if (this.numberOfGuests > 1) {
      this.numberOfGuests--;
      this.cdr.markForCheck();
    }
  }

  async dismiss(): Promise<void> {
    await this.modalController.dismiss(null);
  }

  async confirm(): Promise<void> {
    if (!this.bookingDateTime) {
      const toast = await this.toastController.create({
        message: this.lang === 'TC' ? '請選擇日期及時間' : 'Please select a date and time',
        duration: 2500,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();
      return;
    }

    // Warn but do not block if outside hours
    if (this.hoursStatus === 'outside') {
      const toast = await this.toastController.create({
        message: this.lang === 'TC'
          ? `注意：所選時間不在餐廳營業時間內（${this.hoursInfo?.open} – ${this.hoursInfo?.close}）`
          : `Note: Selected time is outside opening hours (${this.hoursInfo?.open} – ${this.hoursInfo?.close})`,
        duration: 3500,
        position: 'bottom',
        color: 'warning'
      });
      await toast.present();
    }

    await this.modalController.dismiss({
      dateTime: this.bookingDateTime,
      numberOfGuests: this.numberOfGuests,
      specialRequests: this.specialRequests.trim() || null
    });
  }
}
