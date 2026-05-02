// Restaurant detail page component with modern responsive design
// Displays comprehensive restaurant information including menu, reviews, and booking functionality
import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { Observable, Subject, combineLatest } from 'rxjs';
import { take, takeUntil, tap, finalize } from 'rxjs/operators';
import { Restaurant, MenuItem } from '../../services/restaurants.service';
import { Review, ReviewStats, CreateReviewRequest } from '../../services/reviews.service';
import { UserProfile } from '../../services/user.service';
import { CreateBookingRequest } from '../../services/booking.service';
import { DistanceResult } from '../../services/location.service';
import { RestaurantFeatureService } from '../../services/restaurant-feature.service';
import { DataService } from '../../services/data.service';
import { MapModalComponent } from './map-modal.component';
import { FullMenuModalComponent } from './full-menu-modal.component';
import { BookingModalComponent } from './booking-modal.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-restaurant',
  templateUrl: './restaurant.page.html',
  styleUrls: ['./restaurant.page.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantPage implements OnInit, AfterViewInit, OnDestroy {
  private readonly feature = inject(RestaurantFeatureService);
  private readonly dataService = inject(DataService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly modalController = inject(ModalController);
  private readonly toastController = inject(ToastController);
  private readonly alertController = inject(AlertController);
  private readonly changeDetectionReference = inject(ChangeDetectorRef);

  // Bilingual language stream
  lang$ = this.feature.language.lang$;
  // Observable boolean that indicates whether dark theme is active
  isDark$: Observable<boolean>;
  // Platform detection for responsive UI
  isMobile$ = this.feature.platform.isMobile$;
  // Local restaurant model used by template
  restaurant: Restaurant | null = null;
  // Menu items loaded separately from sub-collection
  menuItems: MenuItem[] = [];
  // Randomised menu preview shown in the compact scroller before the full menu modal opens
  menuPreviewItems: MenuItem[] = [];
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
  readonly placeholderImage = environment.placeholderImageUrl || '../assets/icon/Placeholder.png';
  // Subject used to unsubscribe on destroy
  private destroy$ = new Subject<void>();
  // Reference to Google Maps instance
  private map: google.maps.Map | null = null;
  private marker: google.maps.Marker | null = null;
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
  // Review image upload state
  newReviewImageFile: File | null = null;
  newReviewImagePreviewUrl: string | null = null;
  isUploadingReviewImage: boolean = false;
  // Restaurant claim state
  canClaimRestaurant: boolean = false;
  isClaimingRestaurant: boolean = false;
  // Tab navigation state
  selectedTab: string = 'overview';
  // Opening hours stay expanded so booking context is always visible
  hoursExpanded: boolean = true;
  // Swiper breakpoints configuration for responsive review carousel
  readonly ReviewSwiperBreakpoints = {
    768: { slidesPerView: 2 },
    1024: { slidesPerView: 3 }
  };
  // Check if current user is the owner of this restaurant
  isCurrentUserOwner: boolean = false;
  // Snapshot of the current language for synchronous access in methods
  currentLanguage: 'EN' | 'TC' = 'EN';
  private isDarkThemeActive = false;
  // Number of random menu entries loaded into the compact preview scroller
  readonly menuPreviewLimit: number = 5;
  // Number of menu rows that should be visible before the preview area scrolls
  readonly visibleMenuPreviewCount: number = 3;
  // Deep-link flag that waits until restaurant and menu loading finish before opening the menu modal
  private pendingMenuDeepLink: boolean = false;
  // Modal guard that prevents repeated deep-link query emissions from opening duplicate menu modals
  private isMenuModalOpen: boolean = false;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {
    this.isDark$ = this.feature.theme.isDark$;
  }

  ngOnInit() {
    // Keep currentLanguage snapshot in sync for methods that cannot use async pipe
    this.lang$.pipe(takeUntil(this.destroy$)).subscribe(lang => {
      this.currentLanguage = lang;
      this.updatePageShareData();
    });

    this.isDark$.pipe(takeUntil(this.destroy$)).subscribe(isDark => {
      this.isDarkThemeActive = isDark;
      if (this.map && this.restaurant) this.initialiseMapIfNeeded();
    });

    // Try to get user's location for distance calculation
    this.feature.location.getCurrentLocation().pipe(takeUntil(this.destroy$)).subscribe();

    // Watch route query parameters so deep links can open the full menu after this cached page re-enters.
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(queryParameters => {
      const tab = queryParameters.get('tab');
      const shouldOpenMenu = queryParameters.get('menu') === 'open' || queryParameters.get('section') === 'menu';
      if (tab === 'review') this.selectedTab = 'review';
      if (shouldOpenMenu) {
        this.selectedTab = 'overview';
        this.pendingMenuDeepLink = true;
        this.openMenuModalWhenReady();
      }
      this.changeDetectionReference.markForCheck();
    });
  }

  /// When view initialises, fetch restaurant ID and load all data
  ngAfterViewInit(): void {
    try {
      const restaurantId = this.route.snapshot.paramMap.get('id') || '';
      if (!restaurantId) {
        this.errorMessage = 'Missing restaurant ID';
        this.isLoading = false;
        this.changeDetectionReference.markForCheck();
        console.error('RestaurantPage: No restaurant ID provided');
        return;
      }

      console.log('RestaurantPage: ngAfterViewInit called with ID:', restaurantId);
      this.loadRestaurantData(restaurantId);
    } catch (error) {
      console.error('RestaurantPage: Error in ngAfterViewInit:', error);
      this.errorMessage = 'An unexpected error occurred';
      this.isLoading = false;
      this.changeDetectionReference.markForCheck();
    }
  }

  /// Load all restaurant data including basic info, menu, and reviews
  private loadRestaurantData(restaurantId: string): void {
    console.log('RestaurantPage: Starting to load restaurant data for ID:', restaurantId);
    this.isLoading = true;
    this.errorMessage = null;
    this.changeDetectionReference.markForCheck();

    // Fetch restaurant basic information
    this.feature.restaurants.getRestaurantById(restaurantId).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        console.log('RestaurantPage: getRestaurantById observable completed');
      })
    ).subscribe({
      next: (restaurant: Restaurant | null) => {
        console.log('RestaurantPage: getRestaurantById returned:', restaurant?.id, restaurant?.Name_EN);

        if (!restaurant) {
          console.error('RestaurantPage: Restaurant not found with ID:', restaurantId);
          this.errorMessage = 'Restaurant not found';
          this.isLoading = false;
          this.changeDetectionReference.markForCheck();
          return;
        }

        this.restaurant = restaurant;
        console.log('RestaurantPage: Restaurant loaded successfully:', restaurant.Name_EN);

        // Emit dynamic restaurant name and share payload to the shared header.
        this.emitRestaurantPageTitle(restaurant);
        this.updatePageShareData();

        // After restaurant loaded, initialise the map if coordinates exist
        setTimeout(() => this.initialiseMapIfNeeded(), 20);
        // Calculate distance from user's location
        this.calculateDistance();
        // Check if user can claim this restaurant
        this.checkClaimEligibility();
        // Check if current user is the owner
        this.checkIfCurrentUserIsOwner();
        // Load menu items from sub-collection
        this.loadMenuItems(restaurantId);
        // Load reviews
        this.loadReviews(restaurantId);

        // Mark loading as complete after primary data is loaded
        this.isLoading = false;
        this.changeDetectionReference.markForCheck();
        console.log('RestaurantPage: Primary restaurant data loaded');
      },
      error: (error: any) => {
        console.error('RestaurantPage: Error loading restaurant:', error);
        this.errorMessage = error?.message || 'Failed to load restaurant';
        this.isLoading = false;
        this.changeDetectionReference.markForCheck();
      }
    });
  }

  /// Load menu items for the restaurant from API sub-collection
  private loadMenuItems(restaurantId: string): void {
    console.log('RestaurantPage: Starting to load menu items');
    this.isMenuLoading = true;
    this.changeDetectionReference.markForCheck();

    this.feature.restaurants.getMenuItems(restaurantId).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        console.log('RestaurantPage: getMenuItems observable completed');
      })
    ).subscribe({
      next: (items: MenuItem[]) => {
        this.menuItems = items;
        this.menuPreviewItems = this.buildRandomMenuPreview(items);
        this.isMenuLoading = false;
        this.openMenuModalWhenReady();
        this.changeDetectionReference.markForCheck();
        console.log('RestaurantPage: Loaded', items.length, 'menu items');
      },
      error: (error: any) => {
        console.error('RestaurantPage: Error loading menu items:', error);
        this.menuItems = [];
        this.menuPreviewItems = [];
        this.isMenuLoading = false;
        this.openMenuModalWhenReady();
        this.changeDetectionReference.markForCheck();
      }
    });
  }

  /// Build a compact random menu sample so the page preview stays fresh without loading every item into view.
  private buildRandomMenuPreview(items: MenuItem[]): MenuItem[] {
    if (items.length <= this.menuPreviewLimit) return [...items];

    const shuffledItems = [...items];
    for (let currentIndex = shuffledItems.length - 1; currentIndex > 0; currentIndex--) {
      const randomIndex = Math.floor(Math.random() * (currentIndex + 1));
      [shuffledItems[currentIndex], shuffledItems[randomIndex]] = [shuffledItems[randomIndex], shuffledItems[currentIndex]];
    }

    return shuffledItems.slice(0, this.menuPreviewLimit);
  }

  /// Load reviews for the restaurant
  private loadReviews(restaurantId: string): void {
    console.log('RestaurantPage: Starting to load reviews');
    this.isReviewsLoading = true;
    this.changeDetectionReference.markForCheck();

    // Load reviews and stats in parallel
    combineLatest([
      this.feature.reviews.getReviews(restaurantId),
      this.feature.reviews.getRestaurantStats(restaurantId)
    ]).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        console.log('RestaurantPage: getReviews and getRestaurantStats observables completed');
      })
    ).subscribe({
      next: ([reviews, stats]) => {
        this.reviews = reviews;
        this.reviewStats = stats;
        this.isReviewsLoading = false;
        this.changeDetectionReference.markForCheck();
        console.log('RestaurantPage: Loaded', reviews.length, 'reviews');
      },
      error: (error: any) => {
        console.error('RestaurantPage: Error loading reviews:', error);
        this.reviews = [];
        this.reviewStats = null;
        this.isReviewsLoading = false;
        this.changeDetectionReference.markForCheck();
      }
    });
  }

  // Emit the loaded restaurant name so the shared header reflects the current page context.
  private emitRestaurantPageTitle(restaurant: Restaurant): void {
    const titleEvent = new CustomEvent('page-title', {
      detail: {
        Header_EN: restaurant.Name_EN || 'Restaurant',
        Header_TC: restaurant.Name_TC || '餐廳'
      },
      bubbles: true
    });
    window.dispatchEvent(titleEvent);
  }

  // Publish the current restaurant share payload so the shared header can open the native share sheet.
  private updatePageShareData(): void {
    if (!this.restaurant) return;

    const restaurantName = this.currentLanguage === 'TC'
      ? (this.restaurant.Name_TC || this.restaurant.Name_EN || '餐廳')
      : (this.restaurant.Name_EN || this.restaurant.Name_TC || 'Restaurant');
    const restaurantAddress = this.currentLanguage === 'TC'
      ? (this.restaurant.Address_TC || this.restaurant.Address_EN || '')
      : (this.restaurant.Address_EN || this.restaurant.Address_TC || '');
    const shareText = this.currentLanguage === 'TC'
      ? `我啱啱發現咗呢間好正斗嘅素食餐廳！\n\n${restaurantName}${restaurantAddress ? `\n${restaurantAddress}` : ''}`
      : `I found this great vegan restaurant!\n\n${restaurantName}${restaurantAddress ? `\n${restaurantAddress}` : ''}`;
    const shareEvent = new CustomEvent('page-share', {
      detail: {
        isVisible: true,
        title: restaurantName,
        text: shareText,
        url: this.getRestaurantShareMapUrl(),
        dialogTitle: this.currentLanguage === 'TC' ? '分享餐廳' : 'Share Restaurant'
      },
      bubbles: true
    });
    window.dispatchEvent(shareEvent);
  }

  // Build a public Google Maps URL so shared content stays useful outside the app shell.
  private getRestaurantShareMapUrl(): string | undefined {
    if (!this.restaurant) return undefined;
    if (typeof this.restaurant.Latitude === 'number' && typeof this.restaurant.Longitude === 'number') {
      return `https://www.google.com/maps/search/?api=1&query=${this.restaurant.Latitude},${this.restaurant.Longitude}`;
    }

    const restaurantAddress = this.currentLanguage === 'TC'
      ? (this.restaurant.Address_TC || this.restaurant.Address_EN || '')
      : (this.restaurant.Address_EN || this.restaurant.Address_TC || '');
    if (!restaurantAddress.trim()) return undefined;

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurantAddress)}`;
  }

  // Remove the contextual share action when the restaurant page is destroyed.
  private clearPageShareData(): void {
    const shareEvent = new CustomEvent('page-share', {
      detail: { isVisible: false },
      bubbles: true
    });
    window.dispatchEvent(shareEvent);
  }

  /// Retrieves the count for a specific rating from the distribution
  public GetRatingCount(Rating: number): number {
    return (this.reviewStats?.ratingDistribution as any)?.[Rating] ?? 0;
  }

  /// Calculates the percentage width for a rating bar
  public GetRatingPercentage(Rating: number): number {
    if (!this.reviewStats?.totalReviews) return 0;
    return (this.GetRatingCount(Rating) / this.reviewStats.totalReviews) * 100;
  }

  /// Calculate distance from user's location to restaurant
  private calculateDistance(): void {
    if (!this.restaurant?.Latitude || !this.restaurant?.Longitude) {
      return;
    }

    this.distanceResult = this.feature.location.calculateDistanceFromCurrentLocation(
      this.restaurant.Latitude,
      this.restaurant.Longitude
    );
  }

  /// Get distance colour for badge display
  getDistanceColour(): string {
    if (!this.distanceResult) return 'medium';
    return this.feature.location.getDistanceColour(this.distanceResult.distanceKm);
  }

  /// Initialise a Google Map when coordinates are present
  private initialiseMapIfNeeded(): void {
    try {
      if (!this.restaurant) return;
      const latitude = this.restaurant.Latitude;
      const longitude = this.restaurant.Longitude;
      if (typeof latitude !== 'number' || typeof longitude !== 'number' || Number.isNaN(latitude) || Number.isNaN(longitude)) {
        console.warn('RestaurantPage: Invalid coordinates for map initialisation');
        return;
      }

      // Ensure map container exists and clear if already initialised
      const mapContainer = document.getElementById('restaurant-map');
      if (!mapContainer) {
        console.warn('RestaurantPage: Map container not found');
        return;
      }
      if (this.marker) {
        this.marker.setMap(null);
        this.marker = null;
      }
      if (this.map) {
        this.map = null;
      }

      // Create Google Map
      this.map = new google.maps.Map(mapContainer, {
        center: { lat: latitude, lng: longitude },
        zoom: 15,
        mapTypeControl: false,
        fullscreenControl: false,
        zoomControl: true,
        streetViewControl: false,
        styles: this.isDarkThemeActive ? this.getGoogleDarkMapStyles() : undefined
      });

      setTimeout(() => {
        if (!this.map) return;
        google.maps.event.trigger(this.map, 'resize');
        this.map.setCenter({ lat: latitude, lng: longitude });
      }, 120);

      // Add marker for the restaurant
      this.marker = new google.maps.Marker({
        position: { lat: latitude, lng: longitude },
        map: this.map,
        title: this.restaurant.Name_EN || 'Restaurant'
      });

      console.log('RestaurantPage: Map initialised successfully');

    } catch (error) {
      console.warn('RestaurantPage.initialiseMapIfNeeded error:', error);
    }
  }


  // Dark map styles improve contrast and avoid dark-theme render regressions on WebView/browser.
  private getGoogleDarkMapStyles(): google.maps.MapTypeStyle[] {
    return [
      { elementType: 'geometry', stylers: [{ color: '#1e2b22' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#d3e5d6' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#1b261f' }] },
      { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#b4cab8' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#34453a' }] },
      { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#e1f2e3' }] },
      { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2a3a30' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#152d38' }] },
      { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9ac9d8' }] }
    ];
  }

  /// Booking handler invoked by Book button
  async onBook(): Promise<void> {
    try {
      const lang = this.currentLanguage;

      if (!this.bookingDateTime) {
        await this.showToast(lang === 'TC' ? '請選擇預約日期和時間' : 'Please select a booking date and time', 'warning');
        return;
      }

      // Check if user is logged in
      if (!this.feature.auth.isLoggedIn) {
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
      const confirmed = await this.confirmBooking(lang === 'TC');
      if (!confirmed) return;

      this.isBookingLoading = true;
      this.changeDetectionReference.markForCheck();

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
      this.feature.bookings.createBooking(bookingRequest).pipe(takeUntil(this.destroy$)).subscribe({
        next: async (response) => {
          console.info('Booking created successfully:', response.id);
          this.isBookingLoading = false;
          this.changeDetectionReference.markForCheck();

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
        error: async (error: any) => {
          console.error('Booking failed:', error);
          this.isBookingLoading = false;
          this.changeDetectionReference.markForCheck();
          await this.showToast(error.message || (lang === 'TC' ? '預約失敗，請重試' : 'Booking failed, please try again'), 'danger');
        }
      });

    } catch (error) {
      console.error('onBook error', error);
      this.isBookingLoading = false;
      this.changeDetectionReference.markForCheck();
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
      const lang = this.currentLanguage;

      // Check if user is logged in
      if (!this.feature.auth.isLoggedIn) {
        const shouldLogin = await this.showLoginPrompt(lang === 'TC');
        if (shouldLogin) {
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: `/restaurant/${this.restaurant?.id}` }
          });
        }
        return;
      }

      // Validate rating
      if (this.newReviewRating < 1 || this.newReviewRating > 5) {
        await this.showToast(lang === 'TC' ? '請選擇評分' : 'Please select a rating', 'warning');
        return;
      }

      // If the user attached an image, upload it first and capture the URL
      let uploadedImageUrl: string | undefined;
      if (this.newReviewImageFile) {
        try {
          this.isUploadingReviewImage = true;
          this.changeDetectionReference.markForCheck();

          const token = await this.feature.auth.getIdToken();
          const uploadResponse = await this.dataService
            .uploadFile<{ imageUrl: string }>(
              '/API/Images/upload?folder=Reviews',
              this.newReviewImageFile,
              'image',
              token
            )
            .toPromise();

          uploadedImageUrl = uploadResponse?.imageUrl;
          this.isUploadingReviewImage = false;
          this.changeDetectionReference.markForCheck();
        } catch (uploadError: any) {
          this.isUploadingReviewImage = false;
          this.changeDetectionReference.markForCheck();
          console.error('Review image upload failed:', uploadError);
          await this.showToast(
            lang === 'TC' ? '圖片上傳失敗，請重試' : 'Image upload failed, please try again',
            'danger'
          );
          return;
        }
      }

      const reviewRequest: CreateReviewRequest = {
        restaurantId: this.restaurant?.id || '',
        rating: this.newReviewRating,
        comment: this.newReviewComment || undefined,
        imageUrl: uploadedImageUrl
      };

      // Call reviews service
      this.feature.reviews.createReview(reviewRequest).pipe(takeUntil(this.destroy$)).subscribe({
        next: async (response) => {
          console.info('Review created successfully:', response.id);

          // Show success message
          const successMessage = lang === 'TC' ? '已成功提交評論！' : 'Review submitted successfully!';
          await this.showToast(successMessage, 'success');

          // Reset form including any selected image
          this.newReviewRating = 5;
          this.newReviewComment = '';
          this.newReviewImageFile = null;
          if (this.newReviewImagePreviewUrl) {
            URL.revokeObjectURL(this.newReviewImagePreviewUrl);
            this.newReviewImagePreviewUrl = null;
          }
          this.isWritingReview = false;
          this.changeDetectionReference.markForCheck();

          // Reload reviews
          if (this.restaurant?.id) {
            this.loadReviews(this.restaurant.id);
          }
        },
        error: async (error: any) => {
          console.error('Review submission failed:', error);
          await this.showToast(error.message || (lang === 'TC' ? '提交評論失敗，請重試' : 'Review submission failed, please try again'), 'danger');
        }
      });

    } catch (error) {
      console.error('submitReview error', error);
    }
  }

  /// Toggle review writing form
  toggleReviewForm(): void {
    this.isWritingReview = !this.isWritingReview;
    if (!this.isWritingReview) {
      // Reset form when closing — including any selected image
      this.newReviewRating = 5;
      this.newReviewComment = '';
      this.newReviewImageFile = null;
      this.newReviewImagePreviewUrl = null;
    }
    this.changeDetectionReference.markForCheck();
  }

  /// Called when the hidden file input emits a change event.
  /// Stores the chosen file and generates a local preview URL.
  onReviewImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    // Revoke any previously created object URL to avoid memory leaks
    if (this.newReviewImagePreviewUrl) {
      URL.revokeObjectURL(this.newReviewImagePreviewUrl);
    }

    this.newReviewImageFile = file;
    this.newReviewImagePreviewUrl = file ? URL.createObjectURL(file) : null;
    this.changeDetectionReference.markForCheck();
  }

  /// Remove the currently selected review image
  clearReviewImage(): void {
    if (this.newReviewImagePreviewUrl) {
      URL.revokeObjectURL(this.newReviewImagePreviewUrl);
    }
    this.newReviewImageFile = null;
    this.newReviewImagePreviewUrl = null;
    this.changeDetectionReference.markForCheck();
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
        longitude: this.restaurant?.Longitude,
        restaurantName: this.currentLanguage === 'TC'
          ? (this.restaurant?.Name_TC || this.restaurant?.Name_EN || '')
          : (this.restaurant?.Name_EN || this.restaurant?.Name_TC || ''),
        lang: this.currentLanguage
      },
      cssClass: 'fullscreen-modal'
    });
    await modal.present();
    await modal.onDidDismiss();
  }

  /// Open fullscreen map modal with directions enabled
  async openDirectionsModal(): Promise<void> {
    if (!this.hasCoordinates()) return;
    const modal = await this.modalController.create({
      component: MapModalComponent,
      componentProps: {
        latitude: this.restaurant?.Latitude,
        longitude: this.restaurant?.Longitude,
        showDirections: true,
        restaurantName: this.currentLanguage === 'TC'
          ? (this.restaurant?.Name_TC || this.restaurant?.Name_EN || '')
          : (this.restaurant?.Name_EN || this.restaurant?.Name_TC || ''),
        lang: this.currentLanguage
      },
      cssClass: 'fullscreen-modal'
    });
    await modal.present();
    await modal.onDidDismiss();
  }

  /// Open the full menu modal and pass every loaded menu item.
  async openMenuModal(): Promise<void> {
    if (this.isMenuModalOpen) return;

    this.isMenuModalOpen = true;

    try {
      const modal = await this.modalController.create({
        component: FullMenuModalComponent,
        componentProps: {
          menuItems: this.menuItems,
          restaurantName: this.currentLanguage === 'TC'
            ? (this.restaurant?.Name_TC || this.restaurant?.Name_EN || '')
            : (this.restaurant?.Name_EN || this.restaurant?.Name_TC || ''),
          langStream: this.feature.language.lang$
        },
        cssClass: 'fullscreen-modal'
      });
      await modal.present();
      await modal.onDidDismiss();
    } finally {
      this.isMenuModalOpen = false;
    }
  }

  /// Open a pending menu deep link only after the menu request settles and restaurant context exists.
  private openMenuModalWhenReady(): void {
    if (!this.pendingMenuDeepLink || this.isMenuLoading || this.isMenuModalOpen || !this.restaurant) return;
    this.pendingMenuDeepLink = false;
    void this.openMenuModal();
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
    return this.feature.reviews.formatRatingStars(rating);
  }

  /// Get rating colour
  getRatingColour(rating: number): string {
    return this.feature.reviews.getRatingColour(rating);
  }

  /// Check if current user can claim this restaurant
  private checkClaimEligibility(): void {
    // Check if user is logged in
    if (!this.feature.auth.isLoggedIn) {
      this.canClaimRestaurant = false;
      return;
    }

    // Check if restaurant has no owner
    if (this.restaurant?.ownerId) {
      this.canClaimRestaurant = false;
      return;
    }

    // Get current user profile to check type
    this.feature.auth.currentUser$.pipe(take(1)).subscribe(user => {
      if (!user) {
        this.canClaimRestaurant = false;
        this.changeDetectionReference.markForCheck();
        return;
      }

      // Get user profile to check type and restaurantId
      this.feature.user.getUserProfile(user.uid).pipe(takeUntil(this.destroy$)).subscribe({
        next: (profile: UserProfile | null) => {
          // User can claim if they have type 'Restaurant' (case insensitive) AND
          // they haven't claimed a restaurant yet (restaurantId is empty or null)
          const isRestaurantType = profile?.type?.toLowerCase() === 'restaurant';
          const hasNoRestaurant = !profile?.restaurantId || profile.restaurantId.trim() === '';

          this.canClaimRestaurant = isRestaurantType && hasNoRestaurant;
          this.changeDetectionReference.markForCheck();
          console.log('RestaurantPage: Can claim restaurant:', this.canClaimRestaurant,
            'User type:', profile?.type, 'Has restaurantId:', !!profile?.restaurantId);
        },
        error: (error) => {
          console.error('RestaurantPage: Error checking claim eligibility', error);
          this.canClaimRestaurant = false;
          this.changeDetectionReference.markForCheck();
        }
      });
    });
  }

  /// Claim ownership of this restaurant
  async claimRestaurant(): Promise<void> {
    try {
      if (!this.restaurant || !this.feature.auth.isLoggedIn) {
        return;
      }

      const lang = this.currentLanguage;
      const user = await this.feature.auth.currentUser$.pipe(take(1)).toPromise();

      if (!user) {
        await this.showToast(lang === 'TC' ? '請先登入' : 'Please log in first', 'warning');
        return;
      }

      // Confirm claim
      const confirmed = await this.confirmClaim(lang === 'TC');
      if (!confirmed) return;

      this.isClaimingRestaurant = true;
      this.changeDetectionReference.markForCheck();

      // Get authentication token
      const authToken = await this.feature.auth.getIdToken();
      if (!authToken) {
        this.isClaimingRestaurant = false;
        this.changeDetectionReference.markForCheck();
        await this.showToast(lang === 'TC' ? '無法獲取身份驗證令牌' : 'Failed to get authentication token', 'danger');
        return;
      }

      // Call claim API endpoint
      this.feature.restaurants.claimRestaurant(this.restaurant.id, authToken)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: async (response) => {
            console.log('RestaurantPage: Restaurant claimed successfully:', response);

            // Update local restaurant object
            if (this.restaurant) this.restaurant.ownerId = response.userId;

            this.isClaimingRestaurant = false;
            this.canClaimRestaurant = false;
            this.changeDetectionReference.markForCheck();

            const successMessage = lang === 'TC'
              ? '已成功認領餐廳！正在前往商鋪頁面...'
              : 'Restaurant claimed successfully! Redirecting to store page...';
            await this.showToast(successMessage, 'success');

            // Redirect to store page after a short delay
            setTimeout(() => {
              this.router.navigate(['/store']);
            }, 1500);
          },
          error: async (error: any) => {
            console.error('RestaurantPage: Error claiming restaurant', error);
            this.isClaimingRestaurant = false;
            this.changeDetectionReference.markForCheck();

            // Provide bilingual error messages
            let errorMessage: string;
            if (error.message.includes('already claimed') || error.message.includes('已被認領')) {
              errorMessage = lang === 'TC' ? '此餐廳已被認領' : 'This restaurant has already been claimed';
            } else if (error.message.includes('already own') || error.message.includes('已擁有')) {
              errorMessage = lang === 'TC' ? '您已經擁有另一間餐廳' : 'You already own another restaurant';
            } else if (error.message.includes('not authorized') || error.message.includes('未授權')) {
              errorMessage = lang === 'TC' ? '您沒有權限認領此餐廳' : 'You are not authorized to claim this restaurant';
            } else if (error.message.includes('not found') || error.message.includes('找不到')) {
              errorMessage = lang === 'TC' ? '找不到此餐廳' : 'Restaurant not found';
            } else {
              errorMessage = error.message || (lang === 'TC' ? '認領失敗，請重試' : 'Claim failed, please try again');
            }

            await this.showToast(errorMessage, 'danger');
          }
        });
    } catch (error) {
      console.error('claimRestaurant error', error);
      this.isClaimingRestaurant = false;
      this.changeDetectionReference.markForCheck();
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

  /// Preserve the old handler contract while keeping opening hours permanently expanded.
  toggleHours(): void {
    this.hoursExpanded = true;
    this.changeDetectionReference.markForCheck();
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

  /// Increment guest count (max 10)
  increaseGuests(): void {
    if (this.numberOfGuests < 10) {
      this.numberOfGuests++;
      this.changeDetectionReference.markForCheck();
    }
  }

  /// Decrement guest count (min 1)
  decreaseGuests(): void {
    if (this.numberOfGuests > 1) {
      this.numberOfGuests--;
      this.changeDetectionReference.markForCheck();
    }
  }

  /// Open booking modal — checks login first, then presents BookingModalComponent
  async openBookingModal(): Promise<void> {
    const lang = this.currentLanguage;
    const isTC = lang === 'TC';

    if (!this.feature.auth.isLoggedIn) {
      const shouldLogin = await this.showLoginPrompt(isTC);
      if (shouldLogin) {
        this.router.navigate(['/login'], {
          queryParams: { returnUrl: `/restaurant/${this.restaurant?.id}` }
        });
      }
      return;
    }

    const modal = await this.modalController.create({
      component: BookingModalComponent,
      componentProps: {
        restaurant: this.restaurant,
        lang: lang
      }
    });

    await modal.present();

    const { data } = await modal.onDidDismiss();
    if (!data) return;

    this.isBookingLoading = true;
    this.changeDetectionReference.markForCheck();

    const bookingRequest: CreateBookingRequest = {
      restaurantId: this.restaurant?.id || '',
      restaurantName: isTC
        ? (this.restaurant?.Name_TC || this.restaurant?.Name_EN || '')
        : (this.restaurant?.Name_EN || this.restaurant?.Name_TC || ''),
      dateTime: new Date(data.dateTime).toISOString(),
      numberOfGuests: data.numberOfGuests,
      specialRequests: data.specialRequests || null
    };

    this.feature.bookings.createBooking(bookingRequest).pipe(takeUntil(this.destroy$)).subscribe({
      next: async (response) => {
        console.info('Booking created:', response.id);
        this.isBookingLoading = false;
        this.changeDetectionReference.markForCheck();
        const msg = isTC
          ? `已成功預約！預約編號: ${response.id.substring(0, 8)}`
          : `Booking confirmed! Booking ID: ${response.id.substring(0, 8)}`;
        await this.showToast(msg, 'success');
      },
      error: async (error: any) => {
        console.error('Booking failed:', error);
        this.isBookingLoading = false;
        this.changeDetectionReference.markForCheck();
        await this.showToast(
          error.message || (isTC ? '預約失敗，請重試' : 'Booking failed, please try again'),
          'danger'
        );
      }
    });
  }

  /// Scroll to booking section (switches to overview tab if needed)
  scrollToBooking(): void {
    this.selectedTab = 'overview';
    this.changeDetectionReference.markForCheck();
    setTimeout(() => {
      const el = document.getElementById('booking-section');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  /// Check if current user is the owner of this restaurant
  checkIfCurrentUserIsOwner(): void {
    if (!this.feature.auth.isLoggedIn || !this.restaurant?.ownerId) {
      this.isCurrentUserOwner = false;
      this.changeDetectionReference.markForCheck();
      return;
    }

    this.feature.auth.currentUser$.pipe(take(1)).subscribe(user => {
      this.isCurrentUserOwner = user?.uid === this.restaurant?.ownerId;
      this.changeDetectionReference.markForCheck();
    });
  }

  /// Clean up on destroy
  ngOnDestroy(): void {
    this.clearPageShareData();
    this.destroy$.next();
    this.destroy$.complete();
    if (this.marker) {
      this.marker.setMap(null);
      this.marker = null;
    }
    if (this.map) {
      this.map = null;
    }
  }
}
