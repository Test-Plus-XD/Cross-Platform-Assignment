// Page that renders a single restaurant detail with bilingual support
// Integrates booking service for reservations and location service for distance calculations
import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { Observable, Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { RestaurantsService, Restaurant } from '../../services/restaurants.service';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { BookingService, CreateBookingRequest } from '../../services/booking.service';
import { LocationService, DistanceResult } from '../../services/location.service';
import { MapModalComponent } from './map-modal.component';
import { MenuModalComponent } from './menu-modal.component';
import * as Leaflet from 'leaflet';

@Component({
  selector: 'app-restaurant',
  templateUrl: './restaurant.page.html',
  styleUrls: ['./restaurant.page.scss'],
  standalone: false,
})
export class RestaurantPage implements OnInit, AfterViewInit, OnDestroy {
  // Bilingual language stream
  lang$ = this.language.lang$;
  // Observable boolean that indicates whether dark theme is active
  isDark$: Observable<boolean>;
  // Local restaurant model used by template
  restaurant: Restaurant | null = null;
  // Selected booking date string
  bookingDateTime: string | null = null;
  // Number of guests for booking (default: 2)
  numberOfGuests: number = 2;
  // Special requests for booking
  specialRequests: string = '';
  // Loading flag for UI
  isLoading = true;
  // Booking loading flag
  isBookingLoading = false;
  // Error message for UI
  errorMessage: string | null = null;
  // Distance result from user's location
  distanceResult: DistanceResult | null = null;
  // Placeholder image path when image is missing
  readonly placeholderImage = '../assets/icon/Placeholder.png';
  // Subject used to unsubscribe on destroy
  private destroy$ = new Subject<void>();
  // Reference to Leaflet map instance
  private map: Leaflet.Map | null = null;
  // Touch tracking for double-tap detection
  private lastTapTime: number = 0;
  private readonly doubleTapThreshold: number = 300; // milliseconds
  // Guest number options for booking
  readonly guestOptions: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  // Declare the property and optionally initialise it
  readonly minBookingDate: string = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly restaurantsService: RestaurantsService,
    private readonly language: LanguageService,
    private readonly theme: ThemeService,
    private readonly authService: AuthService,
    private readonly bookingService: BookingService,
    private readonly locationService: LocationService,
    private readonly modalController: ModalController,
    private readonly toastController: ToastController,
    private readonly alertController: AlertController
  ) { this.isDark$ = this.theme.isDark$; }

  ngOnInit() {
    // Emit the event directly
    const event = new CustomEvent('page-title', {
      detail: { Header_EN: 'Restaurant', Header_TC: '餐廳' },
      bubbles: true
    });
    window.dispatchEvent(event);

    // Try to get user's location for distance calculation
    this.locationService.getCurrentLocation().pipe(takeUntil(this.destroy$)).subscribe();
  }

  // When view initialises, fetch restaurant id and load record
  ngAfterViewInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    if (!id) {
      this.errorMessage = 'Missing restaurant id';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.restaurantsService.getRestaurantById(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r: Restaurant | null) => {
        this.restaurant = r;
        this.isLoading = false;
        // After restaurant loaded, initialises the map if coordinates exist
        setTimeout(() => this.initialiseMapIfNeeded(), 20);
        // Calculate distance from user's location
        this.calculateDistance();
      },
      error: (err: Error) => {
        console.error('RestaurantPage: failed to load restaurant', err);
        this.errorMessage = 'Failed to load restaurant';
        this.isLoading = false;
      }
    });
  }

  // Calculate distance from user's location to restaurant
  private calculateDistance(): void {
    if (!this.restaurant?.Latitude || !this.restaurant?.Longitude) {
      return;
    }

    this.distanceResult = this.locationService.calculateDistanceFromCurrentLocation(
      this.restaurant.Latitude,
      this.restaurant.Longitude
    );
  }

  // Get distance colour for badge display
  getDistanceColour(): string {
    if (!this.distanceResult) return 'medium';
    return this.locationService.getDistanceColour(this.distanceResult.distanceKm);
  }

  // Initialise a Leaflet map when coordinates are present
  private initialiseMapIfNeeded(): void {
    try {
      if (!this.restaurant) return;
      const lat = this.restaurant.Latitude;
      const lng = this.restaurant.Longitude;
      if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
        return;
      }

      // Ensure map container exists and clear if already initialised
      const mapContainer = document.getElementById('restaurant-map');
      if (!mapContainer) return;
      if (this.map) {
        this.map.remove();
        this.map = null;
      }

      // Create Leaflet map and set view
      this.map = Leaflet.map(mapContainer, { attributionControl: false }).setView([lat, lng], 15);

      // Add OpenStreetMap tile layer
      Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      // Add marker for the restaurant
      Leaflet.marker([lat, lng]).addTo(this.map);

      // Invalidate size to ensure correct rendering in Ionic
      setTimeout(() => this.map && this.map.invalidateSize(), 50);

    } catch (err) {
      console.warn('RestaurantPage.initialiseMapIfNeeded error', err);
    }
  }

  // Booking handler invoked by Book button
  async onBook(): Promise<void> {
    try {
      if (!this.bookingDateTime) {
        const lang = await this.language.lang$.pipe(take(1)).toPromise();
        await this.showToast(lang === 'TC' ? '請選擇預約日期和時間' : 'Please select a booking date and time', 'warning');
        return;
      }

      // Check if user is logged in
      if (!this.authService.isLoggedIn) {
        const lang = await this.language.lang$.pipe(take(1)).toPromise();
        const shouldLogin = await this.showLoginPrompt(lang === 'TC');
        if (shouldLogin) {
          // Navigate to login page with return URL
          this.router.navigate(['/login'], { 
            queryParams: { returnUrl: `/restaurant/${this.restaurant?.id}` }
          });
        }
        return;
      }

      // Confirm booking details
      const lang = await this.language.lang$.pipe(take(1)).toPromise();
      const confirmed = await this.confirmBooking(lang === 'TC');
      if (!confirmed) return;

      this.isBookingLoading = true;

      // Create booking request
      const bookingRequest: CreateBookingRequest = {
        restaurantId: this.restaurant?.id || '',
        restaurantName: lang === 'TC' 
          ? (this.restaurant?.Name_TC || this.restaurant?.Name_EN || '') 
          : (this.restaurant?.Name_EN || this.restaurant?.Name_TC || ''),
        dateTime: new Date(this.bookingDateTime).toISOString(),
        numberOfGuests: this.numberOfGuests,
        specialRequests: this.specialRequests || null
      };

      // Call booking service
      this.bookingService.createBooking(bookingRequest).pipe(takeUntil(this.destroy$)).subscribe({
        next: async (response) => {
          console.info('Booking created successfully:', response.id);
          this.isBookingLoading = false;

          // Show success message
          const successMessage = lang === 'TC' 
            ? `已成功預約！預約編號: ${response.id.substring(0, 8)}` 
            : `Booking confirmed! Booking ID: ${response.id.substring(0, 8)}`;
          await this.showToast(successMessage, 'success');

          // Clear form
          this.bookingDateTime = null;
          this.numberOfGuests = 2;
          this.specialRequests = '';
        },
        error: async (err: Error) => {
          console.error('Booking failed:', err);
          this.isBookingLoading = false;
          await this.showToast(err.message || (lang === 'TC' ? '預約失敗，請重試' : 'Booking failed, please try again'), 'danger');
        }
      });

    } catch (err) {
      console.error('onBook error', err);
      this.isBookingLoading = false;
    }
  }

  // Show login prompt alert
  private async showLoginPrompt(isTC: boolean): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: isTC ? '需要登入' : 'Login Required',
        message: isTC ? '您需要登入才能進行預約。是否前往登入頁面？' : 'You need to log in to make a booking. Would you like to go to the login page?',
        buttons: [
          {
            text: isTC ? '取消' : 'Cancel',
            role: 'cancel',
            handler: () => resolve(false)
          },
          {
            text: isTC ? '登入' : 'Login',
            handler: () => resolve(true)
          }
        ]
      });
      await alert.present();
    });
  }

  // Confirm booking details before submission
  private async confirmBooking(isTC: boolean): Promise<boolean> {
    return new Promise(async (resolve) => {
      const formattedDate = new Date(this.bookingDateTime!).toLocaleString(isTC ? 'zh-HK' : 'en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const restaurantName = isTC 
        ? (this.restaurant?.Name_TC || this.restaurant?.Name_EN || '') 
        : (this.restaurant?.Name_EN || this.restaurant?.Name_TC || '');

      const message = isTC
        ? `餐廳: ${restaurantName}\n日期時間: ${formattedDate}\n人數: ${this.numberOfGuests}${this.specialRequests ? '\n特別要求: ' + this.specialRequests : ''}`
        : `Restaurant: ${restaurantName}\nDate & Time: ${formattedDate}\nGuests: ${this.numberOfGuests}${this.specialRequests ? '\nSpecial Requests: ' + this.specialRequests : ''}`;

      const alert = await this.alertController.create({
        header: isTC ? '確認預約' : 'Confirm Booking',
        message: message,
        buttons: [
          {
            text: isTC ? '取消' : 'Cancel',
            role: 'cancel',
            handler: () => resolve(false)
          },
          {
            text: isTC ? '確認' : 'Confirm',
            handler: () => resolve(true)
          }
        ]
      });
      await alert.present();
    });
  }

  // Show toast message helper
  private async showToast(message: string, color: 'success' | 'warning' | 'danger' = 'success'): Promise<void> {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }

  // Open fullscreen map modal and pass coordinates
  async openMapModal(): Promise<void> {
    if (!this.hasCoordinates()) return;
    const modal = await this.modalController.create({
      component: MapModalComponent,
      componentProps: {
        latitude: this.restaurant?.Latitude,
        longitude: this.restaurant?.Longitude,
        title: (this.lang$ ? undefined : undefined) // keep for potential use
      },
      cssClass: 'fullscreen-modal'
    });
    await modal.present();
    await modal.onDidDismiss();
  }

  // Open fullscreen menu modal and pass menu array
  async openMenuModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: MenuModalComponent,
      componentProps: {
        menu: this.restaurant?.Menu ?? [],
        langStream: this.language.lang$
      },
      cssClass: 'fullscreen-modal'
    });
    await modal.present();
    await modal.onDidDismiss();
  }

  // Reserve review spot (placeholder action)
  async reserveReviewSpot(): Promise<void> {
    const toast = await this.toastController.create({
      message: (await this.language.lang$.pipe(take(1)).toPromise()) === 'TC' ? '已預留食評位置' : 'Review spot reserved',
      duration: 1600
    });
    await toast.present();
  }

  // Start writing review now (placeholder action)
  startReviewNow(): void {
    // Placeholder navigation or modal open; for now, just console log
    console.info('Start review for', this.restaurant?.id);
    // e.g. this.router.navigate(['/review', { id: this.restaurant?.id }]);
  }

  // Handle double-tap on map for mobile devices
  onMapTouchEnd(): void {
    const currentTime = Date.now();
    if (currentTime - this.lastTapTime < this.doubleTapThreshold) {
      // Double-tap detected
      this.openMapModal();
    }
    this.lastTapTime = currentTime;
  }

  // Handle double-tap on menu items for mobile devices
  onMenuItemTouchEnd(): void {
    const currentTime = Date.now();
    if (currentTime - this.lastTapTime < this.doubleTapThreshold) {
      // Double-tap detected
      this.openMenuModal();
    }
    this.lastTapTime = currentTime;
  }

  // Helper to display a fallback string for null-ish fields
  displayText(value: string | number | null | undefined): string {
    if (value === null || typeof value === 'undefined' || value === '') return '-';
    return String(value);
  }

  // Helper to choose image url or placeholder
  imageUrlOrPlaceholder(): string {
    if (!this.restaurant) return this.placeholderImage;
    return (this.restaurant.ImageUrl && this.restaurant.ImageUrl.trim() !== '') ? this.restaurant.ImageUrl : this.placeholderImage;
  }

  // Helper to return true if we have numeric coordinates
  hasCoordinates(): boolean {
    return !!(this.restaurant && typeof this.restaurant.Latitude === 'number' && typeof this.restaurant.Longitude === 'number');
  }

  // Clean up on destroy
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}