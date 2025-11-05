// Page that renders a single restaurant detail with bilingual support
import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RestaurantsService, Restaurant } from '../../services/restaurants.service';
import { LanguageService } from '../../services/language.service';
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
  // Local restaurant model used by template
  restaurant: Restaurant | null = null;
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
    private readonly language: LanguageService
  ) { }

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
        setTimeout(() => this.initialiseMapIfNeeded(), 60);
      },
      error: err => {
        console.error('RestaurantPage: failed to load restaurant', err);
        this.errorMessage = 'Failed to load restaurant';
        this.isLoading = false;
      }
    });
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