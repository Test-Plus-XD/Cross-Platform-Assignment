// Page that renders a single restaurant detail with bilingual support
import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ModalController, ToastController } from '@ionic/angular';
import { Observable, Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { RestaurantsService, Restaurant } from '../../services/restaurants.service';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';
import { MapModalComponent } from './map-modal.component';
import { MenuModalComponent } from './menu-modal.component';
import * as Leaflet from 'leaflet';

@Component({
  selector: 'app-restaurant',
  templateUrl: './restaurant.page.html',
  styleUrls: ['./restaurant.page.scss'],
  standalone: false,
})
export class RestaurantPage implements AfterViewInit, OnDestroy {
  // Bilingual language stream
  lang$ = this.language.lang$;
  // Observable boolean that indicates whether dark theme is active
  isDark$: Observable<boolean>;
  // Local restaurant model used by template
  restaurant: Restaurant | null = null;
  // Selected booking date string
  bookingDateTime: string | null = null;
  // Loading flag for UI
  isLoading = true;
  // Error message for UI
  errorMessage: string | null = null;
  // Placeholder image path when image is missing
  readonly placeholderImage = '../assets/icon/Placeholder.png';
  // Subject used to unsubscribe on destroy
  private destroy$ = new Subject<void>();
  // Reference to Leaflet map instance
  private map: Leaflet.Map | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly restaurantsService: RestaurantsService,
    private readonly language: LanguageService,
    private readonly theme: ThemeService,
    private readonly modalController: ModalController,
    private readonly toastController: ToastController 
  ) { this.isDark$ = this.theme.isDark$; }

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
      next: r => {
        this.restaurant = r;
        this.isLoading = false;
        // After restaurant loaded, initialises the map if coordinates exist
        setTimeout(() => this.initialiseMapIfNeeded(), 20);
      },
      error: err => {
        console.error('RestaurantPage: failed to load restaurant', err);
        this.errorMessage = 'Failed to load restaurant';
        this.isLoading = false;
      }
    });
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
        return;
      }
      // Simulate booking request; you can replace this with real API call
      console.info('Booking requested for', this.bookingDateTime, 'restaurant id', this.restaurant?.id);

      // Show a toast to confirm
      const toast = await this.toastController.create({
        message: (this.language.lang$ ? (((await this.language.lang$.pipe(take(1)).toPromise()) === 'TC') ? '已預約' : 'Booked') : 'Booked') + ': ' + this.bookingDateTime,
        duration: 2000
      });
      await toast.present();

      // Optionally clear selection
      // this.bookingDateTime = null;
    } catch (err) {
      console.error('onBook error', err);
    }
  }

  // Open fullscreen map modal and pass coordinates
  async openMapModal(): Promise < void> {
  if(!this.hasCoordinates()) return;
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
  async openMenuModal(): Promise < void> {
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