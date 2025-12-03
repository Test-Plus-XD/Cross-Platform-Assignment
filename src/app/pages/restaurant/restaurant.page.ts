// Restaurant detail page component with modern responsive design
// Displays comprehensive restaurant information including menu, reviews, and booking functionality
import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { Observable, Subject, combineLatest } from 'rxjs';
import { take, takeUntil, tap } from 'rxjs/operators';
import { RestaurantsService, Restaurant, MenuItem } from '../../services/restaurants.service';
import { ReviewsService, Review, ReviewStats, CreateReviewRequest } from '../../services/reviews.service';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';
import { PlatformService } from '../../services/platform.service';
import { AuthService } from '../../services/auth.service';
import { UserService, UserProfile } from '../../services/user.service';
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
  // Platform detection for responsive UI
  isMobile$ = this.platform.isMobile$;
  // Local restaurant model used by template
  restaurant: Restaurant | null = null;
  // Menu items loaded separately from sub-collection
  menuItems: MenuItem[] = [];
  // Reviews for this restaurant
  reviews: Review[] = [];
  // Review statistics
  reviewStats: ReviewStats | null = null;
  // Selected booking date string
  bookingDateTime: string | null = null;
  // Number of guests for booking (default 1)
  numberOfGuests: number = 1;
  // Special requests for booking
  specialRequests: string = '';
  // Loading flags for UI
  isLoading = true;
  isMenuLoading = false;
  isReviewsLoading = false;
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
  private readonly doubleTapThreshold: number = 300; // Milliseconds
  // Guest number options for booking
  readonly guestOptions: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  // Minimum booking date (current date)
  readonly minBookingDate: string = new Date().toISOString();
  // Review form data
  newReviewRating: number = 5;
  newReviewComment: string = '';
  isWritingReview: boolean = false;
  // Restaurant claim state
  canClaimRestaurant: boolean = false;
  isClaimingRestaurant: boolean = false;
  // Tab navigation state
  selectedTab: string = 'overview';
  // Opening hours expansion state
  hoursExpanded: boolean = false;
  // Swiper breakpoints configuration for responsive review carousel
  readonly ReviewSwiperBreakpoints = {
    768: { slidesPerView: 2 },
    1024: { slidesPerView: 3 }
  };
  // Image upload state for unclaimed restaurants
  selectedRestaurantImage: File | null = null;
  restaurantImagePreview: string | null = null;
  isUploadingRestaurantImage: boolean = false;
  // Check if current user can edit this restaurant (no owner or is owner)
  canEditRestaurant: boolean = false;
  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly restaurantsService: RestaurantsService,
    private readonly reviewsService: ReviewsService,
    private readonly language: LanguageService,
    private readonly theme: ThemeService,
    private readonly platform: PlatformService,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly bookingService: BookingService,
    private readonly locationService: LocationService,
    private readonly modalController: ModalController,
    private readonly toastController: ToastController,
    private readonly alertController: AlertController
  ) {
    this.isDark$ = this.theme.isDark$;
  }

  ngOnInit() {
    // Try to get user's location for distance calculation
    this.locationService.getCurrentLocation().pipe(takeUntil(this.destroy$)).subscribe();
  }

  // When view initialises, fetch restaurant ID and load all data
  ngAfterViewInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || '';
    if (!id) {
      this.errorMessage = 'Missing restaurant ID';
      this.isLoading = false;
      return;
    }

    this.loadRestaurantData(id);
  }

  /// Load all restaurant data including basic info, menu, and reviews
  private loadRestaurantData(id: string): void {
    this.isLoading = true;

    // Fetch restaurant basic information
    this.restaurantsService.getRestaurantById(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (restaurant: Restaurant | null) => {
        if (!restaurant) {
          this.errorMessage = 'Restaurant not found';
          this.isLoading = false;
          return;
        }

        this.restaurant = restaurant;
        this.isLoading = false;

        // Emit dynamic restaurant name to header
        const titleEvent = new CustomEvent('page-title', {
          detail: {
            Header_EN: restaurant.Name_EN || 'Restaurant',
            Header_TC: restaurant.Name_TC || '餐廳'
          },
          bubbles: true
        });
        window.dispatchEvent(titleEvent);

        // After restaurant loaded, initialise the map if coordinates exist
        setTimeout(() => this.initialiseMapIfNeeded(), 20);
        // Calculate distance from user's location
        this.calculateDistance();
        // Check if user can claim this restaurant
        this.checkClaimEligibility();
        // Check if user can edit this restaurant (no owner)
        this.checkEditPermission();
        // Load menu items from sub-collection
        this.loadMenuItems(id);
        // Load reviews
        this.loadReviews(id);
      },
      error: (err: Error) => {
        console.error('RestaurantPage: Failed to load restaurant', err);
        this.errorMessage = 'Failed to load restaurant';
        this.isLoading = false;
      }
    });
  }

  /// Load menu items for the restaurant from API sub-collection
  private loadMenuItems(restaurantId: string): void {
    this.isMenuLoading = true;
    this.restaurantsService.getMenuItems(restaurantId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (items: MenuItem[]) => {
        this.menuItems = items;
        this.isMenuLoading = false;
        console.log('RestaurantPage: Loaded', items.length, 'menu items');
      },
      error: (err: Error) => {
        console.error('RestaurantPage: Failed to load menu items', err);
        this.menuItems = [];
        this.isMenuLoading = false;
      }
    });
  }

  /// Load reviews for the restaurant
  private loadReviews(restaurantId: string): void {
    this.isReviewsLoading = true;

    // Load reviews and stats in parallel
    combineLatest([
      this.reviewsService.getReviews(restaurantId),
      this.reviewsService.getRestaurantStats(restaurantId)
    ]).pipe(takeUntil(this.destroy$)).subscribe({
      next: ([reviews, stats]) => {
        this.reviews = reviews;
        this.reviewStats = stats;
        this.isReviewsLoading = false;
        console.log('RestaurantPage: Loaded', reviews.length, 'reviews');
      },
      error: (err: Error) => {
        console.error('RestaurantPage: Failed to load reviews', err);
        this.reviews = [];
        this.reviewStats = null;
        this.isReviewsLoading = false;
      }
    });
  }

  // Retrieves the count for a specific rating from the distribution
  public GetRatingCount(Rating: number): number {
    return (this.reviewStats?.ratingDistribution as any)?.[Rating] ?? 0;
  }

  // Calculates the percentage width for a rating bar
  public GetRatingPercentage(Rating: number): number {
    if (!this.reviewStats?.totalReviews) return 0;
    return (this.GetRatingCount(Rating) / this.reviewStats.totalReviews) * 100;
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

  /// Booking handler invoked by Book button
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

  /// Show login prompt alert
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

  /// Confirm booking details before submission
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

  /// Submit new review
  async submitReview(): Promise<void> {
    try {
      // Check if user is logged in
      if (!this.authService.isLoggedIn) {
        const lang = await this.language.lang$.pipe(take(1)).toPromise();
        const shouldLogin = await this.showLoginPrompt(lang === 'TC');
        if (shouldLogin) {
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: `/restaurant/${this.restaurant?.id}` }
          });
        }
        return;
      }

      const lang = await this.language.lang$.pipe(take(1)).toPromise();

      // Validate rating
      if (this.newReviewRating < 1 || this.newReviewRating > 5) {
        await this.showToast(lang === 'TC' ? '請選擇評分' : 'Please select a rating', 'warning');
        return;
      }

      const reviewRequest: CreateReviewRequest = {
        restaurantId: this.restaurant?.id || '',
        rating: this.newReviewRating,
        comment: this.newReviewComment || undefined
      };

      // Call reviews service
      this.reviewsService.createReview(reviewRequest).pipe(takeUntil(this.destroy$)).subscribe({
        next: async (response) => {
          console.info('Review created successfully:', response.id);

          // Show success message
          const successMessage = lang === 'TC' ? '已成功提交評論！' : 'Review submitted successfully!';
          await this.showToast(successMessage, 'success');

          // Reset form
          this.newReviewRating = 5;
          this.newReviewComment = '';
          this.isWritingReview = false;

          // Reload reviews
          if (this.restaurant?.id) {
            this.loadReviews(this.restaurant.id);
          }
        },
        error: async (err: Error) => {
          console.error('Review submission failed:', err);
          await this.showToast(err.message || (lang === 'TC' ? '提交評論失敗，請重試' : 'Review submission failed, please try again'), 'danger');
        }
      });

    } catch (err) {
      console.error('submitReview error', err);
    }
  }

  /// Toggle review writing form
  toggleReviewForm(): void {
    this.isWritingReview = !this.isWritingReview;
    if (!this.isWritingReview) {
      // Reset form when closing
      this.newReviewRating = 5;
      this.newReviewComment = '';
    }
  }

  /// Show toast message helper
  private async showToast(message: string, color: 'success' | 'warning' | 'danger' = 'success'): Promise<void> {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }

  /// Open fullscreen map modal and pass coordinates
  async openMapModal(): Promise<void> {
    if (!this.hasCoordinates()) return;
    const modal = await this.modalController.create({
      component: MapModalComponent,
      componentProps: {
        latitude: this.restaurant?.Latitude,
        longitude: this.restaurant?.Longitude
      },
      cssClass: 'fullscreen-modal'
    });
    await modal.present();
    await modal.onDidDismiss();
  }

  /// Open fullscreen menu modal and pass menu array
  async openMenuModal(): Promise<void> {
    const modal = await this.modalController.create({
      component: MenuModalComponent,
      componentProps: {
        menu: this.menuItems,
        langStream: this.language.lang$
      },
      cssClass: 'fullscreen-modal'
    });
    await modal.present();
    await modal.onDidDismiss();
  }

  /// Handle double-tap on map for mobile devices
  onMapTouchEnd(): void {
    const currentTime = Date.now();
    if (currentTime - this.lastTapTime < this.doubleTapThreshold) {
      // Double-tap detected
      this.openMapModal();
    }
    this.lastTapTime = currentTime;
  }

  /// Handle double-tap on menu items for mobile devices
  onMenuItemTouchEnd(): void {
    const currentTime = Date.now();
    if (currentTime - this.lastTapTime < this.doubleTapThreshold) {
      // Double-tap detected
      this.openMenuModal();
    }
    this.lastTapTime = currentTime;
  }

  /// Helper to display a fallback string for null-ish fields
  displayText(value: string | number | null | undefined): string {
    if (value === null || typeof value === 'undefined' || value === '') return '—';
    return String(value);
  }

  /// Helper to choose image URL or placeholder
  imageUrlOrPlaceholder(): string {
    if (!this.restaurant) return this.placeholderImage;
    return (this.restaurant.ImageUrl && this.restaurant.ImageUrl.trim() !== '') ? this.restaurant.ImageUrl : this.placeholderImage;
  }

  /// Helper to return true if we have numeric coordinates
  hasCoordinates(): boolean {
    return !!(this.restaurant && typeof this.restaurant.Latitude === 'number' && typeof this.restaurant.Longitude === 'number');
  }

  /// Format rating as stars for display
  formatRatingStars(rating: number): string {
    return this.reviewsService.formatRatingStars(rating);
  }

  /// Get rating colour
  getRatingColour(rating: number): string {
    return this.reviewsService.getRatingColour(rating);
  }

  /// Check if current user can claim this restaurant
  private checkClaimEligibility(): void {
    // Check if user is logged in
    if (!this.authService.isLoggedIn) {
      this.canClaimRestaurant = false;
      return;
    }

    // Check if restaurant has no owner
    if (this.restaurant?.ownerId) {
      this.canClaimRestaurant = false;
      return;
    }

    // Get current user profile to check type
    this.authService.currentUser$.pipe(take(1)).subscribe(user => {
      if (!user) {
        this.canClaimRestaurant = false;
        return;
      }

      // Get user profile to check type and restaurantId
      this.userService.getUserProfile(user.uid).pipe(takeUntil(this.destroy$)).subscribe({
        next: (profile: UserProfile | null) => {
          // User can claim if they have type 'Restaurant' (case insensitive) AND
          // they haven't claimed a restaurant yet (restaurantId is empty or null)
          const isRestaurantType = profile?.type?.toLowerCase() === 'restaurant';
          const hasNoRestaurant = !profile?.restaurantId || profile.restaurantId.trim() === '';

          this.canClaimRestaurant = isRestaurantType && hasNoRestaurant;
          console.log('RestaurantPage: Can claim restaurant:', this.canClaimRestaurant,
            'User type:', profile?.type, 'Has restaurantId:', !!profile?.restaurantId);
        },
        error: (err) => {
          console.error('RestaurantPage: Error checking claim eligibility', err);
          this.canClaimRestaurant = false;
        }
      });
    });
  }

  /// Claim ownership of this restaurant
  async claimRestaurant(): Promise<void> {
    try {
      if (!this.restaurant || !this.authService.isLoggedIn) {
        return;
      }

      const lang = await this.language.lang$.pipe(take(1)).toPromise();
      const user = await this.authService.currentUser$.pipe(take(1)).toPromise();

      if (!user) {
        await this.showToast(lang === 'TC' ? '請先登入' : 'Please log in first', 'warning');
        return;
      }

      // Confirm claim
      const confirmed = await this.confirmClaim(lang === 'TC');
      if (!confirmed) return;

      this.isClaimingRestaurant = true;

      // Get authentication token
      const authToken = await this.authService.getIdToken();
      if (!authToken) {
        this.isClaimingRestaurant = false;
        await this.showToast(lang === 'TC' ? '無法獲取身份驗證令牌' : 'Failed to get authentication token', 'danger');
        return;
      }

      // Call claim API endpoint
      this.restaurantsService.claimRestaurant(this.restaurant.id, authToken)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: async (response) => {
            console.log('RestaurantPage: Restaurant claimed successfully:', response);

            // Update local restaurant object
            if (this.restaurant) this.restaurant.ownerId = response.userId;

            this.isClaimingRestaurant = false;
            this.canClaimRestaurant = false;

            const successMessage = lang === 'TC'
              ? '已成功認領餐廳！正在前往商鋪頁面...'
              : 'Restaurant claimed successfully! Redirecting to store page...';
            await this.showToast(successMessage, 'success');

            // Redirect to store page after a short delay
            setTimeout(() => {
              this.router.navigate(['/store']);
            }, 1500);
          },
          error: async (err: Error) => {
            console.error('RestaurantPage: Error claiming restaurant', err);
            this.isClaimingRestaurant = false;

            // Provide bilingual error messages
            let errorMessage: string;
            if (err.message.includes('already claimed') || err.message.includes('已被認領')) {
              errorMessage = lang === 'TC' ? '此餐廳已被認領' : 'This restaurant has already been claimed';
            } else if (err.message.includes('already own') || err.message.includes('已擁有')) {
              errorMessage = lang === 'TC' ? '您已經擁有另一間餐廳' : 'You already own another restaurant';
            } else if (err.message.includes('not authorized') || err.message.includes('未授權')) {
              errorMessage = lang === 'TC' ? '您沒有權限認領此餐廳' : 'You are not authorized to claim this restaurant';
            } else if (err.message.includes('not found') || err.message.includes('找不到')) {
              errorMessage = lang === 'TC' ? '找不到此餐廳' : 'Restaurant not found';
            } else {
              errorMessage = err.message || (lang === 'TC' ? '認領失敗，請重試' : 'Claim failed, please try again');
            }

            await this.showToast(errorMessage, 'danger');
          }
        });
    } catch (err) {
      console.error('claimRestaurant error', err);
      this.isClaimingRestaurant = false;
    }
  }

  /// Confirm restaurant claim
  private async confirmClaim(isTC: boolean): Promise<boolean> {
    return new Promise(async (resolve) => {
      const restaurantName = isTC
        ? (this.restaurant?.Name_TC || this.restaurant?.Name_EN || '')
        : (this.restaurant?.Name_EN || this.restaurant?.Name_TC || '');

      const message = isTC
        ? `您確定要認領 ${restaurantName} 嗎？認領後，您將成為此餐廳的擁有者。`
        : `Are you sure you want to claim ${restaurantName}? After claiming, you will become the owner of this restaurant.`;

      const alert = await this.alertController.create({
        header: isTC ? '確認認領' : 'Confirm Claim',
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

  /// Toggle opening hours expansion
  toggleHours(): void {
    this.hoursExpanded = !this.hoursExpanded;
  }

  /// Translate day names to Traditional Chinese
  translateDayName(dayName: string): string {
    // Map of English day names to Traditional Chinese
    const dayTranslations: { [key: string]: string } = {
      'Monday': '星期一',
      'Tuesday': '星期二',
      'Wednesday': '星期三',
      'Thursday': '星期四',
      'Friday': '星期五',
      'Saturday': '星期六',
      'Sunday': '星期日',
      // Also handle lowercase
      'monday': '星期一',
      'tuesday': '星期二',
      'wednesday': '星期三',
      'thursday': '星期四',
      'friday': '星期五',
      'saturday': '星期六',
      'sunday': '星期日',
      // Handle abbreviated forms
      'Mon': '週一',
      'Tue': '週二',
      'Wed': '週三',
      'Thu': '週四',
      'Fri': '週五',
      'Sat': '週六',
      'Sun': '週日'
    };

    return dayTranslations[dayName] || dayName;
  }

  /// Get day name based on current language
  getDayName(dayName: string, lang: 'EN' | 'TC'): string {
    return lang === 'TC' ? this.translateDayName(dayName) : dayName;
  }

  /// Scroll to booking section (switches to overview tab if needed)
  scrollToBooking(): void {
    this.selectedTab = 'overview';
    // Smooth scroll to booking section would be implemented here if needed
  }

  /// Check if current user can edit this restaurant (no owner)
  checkEditPermission(): void {
    // Allow editing if restaurant has no owner and user is logged in
    this.canEditRestaurant = this.authService.isLoggedIn && !this.restaurant?.ownerId;
  }

  /// Handle restaurant image file selection
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

  /// Upload restaurant hero image (for unclaimed restaurants)
  async uploadRestaurantImageInline(): Promise<void> {
    if (!this.selectedRestaurantImage || !this.restaurant?.id) return;

    const lang = await this.language.lang$.pipe(take(1)).toPromise();
    this.isUploadingRestaurantImage = true;

    try {
      // Get auth token
      const token = await this.authService.getIdToken();
      if (!token) {
        throw new Error(lang === 'TC' ? '無法獲取身份驗證令牌' : 'Failed to get authentication token');
      }

      // Upload image
      const response = await this.restaurantsService.uploadRestaurantImage(
        this.restaurant.id,
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
      }
    } catch (error: any) {
      console.error('RestaurantPage: Error uploading restaurant image:', error);
      await this.showToast(error.message || (lang === 'TC' ? '圖片上傳失敗' : 'Image upload failed'), 'danger');
    } finally {
      this.isUploadingRestaurantImage = false;
    }
  }

  /// Click handler for image upload button
  clickImageUploadButton(): void {
    const fileInput = document.getElementById('restaurant-page-image-input') as HTMLInputElement;
    fileInput?.click();
  }

  /// Clear restaurant image selection
  clearRestaurantImageSelection(): void {
    this.selectedRestaurantImage = null;
    this.restaurantImagePreview = null;

    // Reset file input
    const fileInput = document.getElementById('restaurant-page-image-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  /// Clean up on destroy
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}