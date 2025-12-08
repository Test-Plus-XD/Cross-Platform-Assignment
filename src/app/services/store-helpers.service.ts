import { Injectable } from '@angular/core';
import { Booking } from './booking.service';
import { Weekday, Weekdays } from '../constants/weekdays.const';
import { District, Districts } from '../constants/districts.const';
import { Keyword, Keywords } from '../constants/keywords.const';
import { PaymentMethod, PaymentMethods } from '../constants/payments.const';

/**
 * Helper service for store page utilities
 * Extracts common formatting and calculation logic
 */
@Injectable({
  providedIn: 'root'
})
export class StoreHelpersService {

  constructor() { }

  /**
   * Calculates count of today's bookings
   */
  getTodayBookingsCount(bookings: Booking[]): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return bookings.filter(booking => {
      const bookingDate = new Date(booking.dateTime);
      return bookingDate >= today && bookingDate < tomorrow;
    }).length;
  }

  /**
   * Calculates count of pending bookings
   */
  getPendingBookingsCount(bookings: Booking[]): number {
    return bookings.filter(b => b.status === 'pending').length;
  }

  /**
   * Formats a date for display in booking list
   */
  formatBookingDate(dateTime: string | Date, lang: 'EN' | 'TC'): string {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    const locale = lang === 'TC' ? 'zh-HK' : 'en-GB';

    return date.toLocaleString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: lang === 'EN'
    });
  }

  /**
   * Finds district by English or Chinese name
   */
  findDistrictByName(name: string, lang: 'EN' | 'TC'): District | undefined {
    return Districts.find(d =>
      lang === 'TC' ? d.name_TC === name : d.name_EN === name
    );
  }

  /**
   * Finds keyword by English or Chinese name
   */
  findKeywordByName(name: string, lang: 'EN' | 'TC'): Keyword | undefined {
    return Keywords.find(k =>
      lang === 'TC' ? k.name_TC === name : k.name_EN === name
    );
  }

  /**
   * Finds payment method by English or Chinese name
   */
  findPaymentMethodByName(name: string, lang: 'EN' | 'TC'): PaymentMethod | undefined {
    return PaymentMethods.find(p =>
      lang === 'TC' ? p.name_TC === name : p.name_EN === name
    );
  }

  /**
   * Gets display name for a weekday
   */
  getWeekdayDisplayName(key: string, lang: 'EN' | 'TC'): string {
    const weekday = Weekdays.find(w => w.key === key);
    return weekday ? (lang === 'TC' ? weekday.name_TC : weekday.name_EN) : key;
  }

  /**
   * Formats opening hours string for display
   */
  formatOpeningHours(hours: string | null | undefined, lang: 'EN' | 'TC'): string {
    if (!hours || hours.trim() === '') {
      return lang === 'TC' ? '休息' : 'Closed';
    }

    if (hours.toLowerCase() === '24h' || hours.toLowerCase() === '00:00-23:59') {
      return lang === 'TC' ? '24小時' : 'Open 24h';
    }

    return hours;
  }

  /**
   * Validates time format (HH:MM or HH:MM-HH:MM)
   */
  isValidTimeFormat(time: string): boolean {
    if (!time || time.trim() === '') return true; // Empty is valid (closed)
    if (time.toLowerCase() === '24h') return true;

    // Single time range: HH:MM-HH:MM
    const singleRangePattern = /^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/;
    if (singleRangePattern.test(time)) return true;

    // Multiple time ranges: HH:MM-HH:MM, HH:MM-HH:MM
    const multipleRangePattern = /^(([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d))(,\s*([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d))*$/;
    if (multipleRangePattern.test(time)) return true;

    return false;
  }

  /**
   * Sanitizes opening hours input by trimming spaces
   */
  sanitizeOpeningHours(hours: { [key: string]: string }): { [key: string]: string } {
    const sanitized: { [key: string]: string } = {};
    Object.keys(hours).forEach(key => {
      sanitized[key] = hours[key]?.trim() || '';
    });
    return sanitized;
  }

  /**
   * Checks if a booking is editable (pending or confirmed status)
   */
  isBookingEditable(booking: Booking): boolean {
    return booking.status === 'pending' || booking.status === 'confirmed';
  }

  /**
   * Gets badge color for booking status
   */
  getBookingStatusColor(status: string): string {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'completed':
        return 'medium';
      case 'cancelled':
        return 'danger';
      default:
        return 'medium';
    }
  }

  /**
   * Generates initials from a name
   */
  getInitials(name: string | null | undefined): string {
    if (!name) return '?';

    const parts = name.trim().split(' ').filter(part => part.length > 0);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  /**
   * Validates coordinates
   */
  isValidCoordinates(lat: number | null, lng: number | null): boolean {
    if (lat === null || lng === null) return false;
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  /**
   * Formats coordinates for display
   */
  formatCoordinates(lat: number | null, lng: number | null): string {
    if (!this.isValidCoordinates(lat, lng)) return 'Not set';
    return `${lat?.toFixed(6)}, ${lng?.toFixed(6)}`;
  }
}
