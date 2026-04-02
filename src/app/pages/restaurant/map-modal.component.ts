// Fullscreen modal that shows a Google Map for given coordinates
// with optional directions/routing support and travel mode selection
import { Component, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { LocationService } from '../../services/location.service';
import { firstValueFrom } from 'rxjs';

@Component({
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ restaurantName || (lang === 'TC' ? '地圖' : 'Map') }}</ion-title>
        <ion-buttons slot="start" *ngIf="showDirections">
          <ion-button (click)="openExternalMaps()">
            <ion-icon slot="icon-only" name="open-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button (click)="close()">{{ lang === 'TC' ? '關閉' : 'Close' }}</ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Travel mode selector — shown when directions are enabled -->
      <ion-toolbar *ngIf="showDirections && !directionsError && !isDirectionsLoading">
        <ion-segment [value]="selectedTravelMode" (ionChange)="onTravelModeChange($any($event).detail.value)">
          <ion-segment-button value="TRANSIT">
            <ion-icon name="bus-outline"></ion-icon>
            <ion-label class="travel-label">{{ lang === 'TC' ? '公共交通' : 'Transit' }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="WALKING">
            <ion-icon name="walk-outline"></ion-icon>
            <ion-label class="travel-label">{{ lang === 'TC' ? '步行' : 'Walking' }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="DRIVING">
            <ion-icon name="car-outline"></ion-icon>
            <ion-label class="travel-label">{{ lang === 'TC' ? '駕車' : 'Driving' }}</ion-label>
          </ion-segment-button>
          <ion-segment-button value="BICYCLING">
            <ion-icon name="bicycle-outline"></ion-icon>
            <ion-label class="travel-label">{{ lang === 'TC' ? '騎車' : 'Cycling' }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content fullscreen>
      <!-- Route info bar -->
      <div class="route-info-bar" *ngIf="routeInfo && !isDirectionsLoading">
        <div class="route-detail">
          <ion-icon name="time-outline"></ion-icon>
          <span>{{ routeInfo.duration }}</span>
        </div>
        <div class="route-detail">
          <ion-icon name="resize-outline"></ion-icon>
          <span>{{ routeInfo.distance }}</span>
        </div>
      </div>

      <!-- Loading state for directions -->
      <div class="directions-loading" *ngIf="isDirectionsLoading">
        <img src="assets/icon/Eclipse.gif" alt="Loading" class="loading-spinner">
        <p>{{ lang === 'TC' ? '正在取得位置...' : 'Getting your location...' }}</p>
      </div>

      <!-- Directions error state -->
      <div class="directions-error" *ngIf="directionsError && !isDirectionsLoading">
        <ion-icon name="warning-outline" class="error-icon"></ion-icon>
        <p>{{ directionsError }}</p>
        <ion-button size="small" fill="outline" (click)="openExternalMaps()">
          <ion-icon slot="start" name="open-outline"></ion-icon>
          {{ lang === 'TC' ? '在 Google Maps 開啟' : 'Open in Google Maps' }}
        </ion-button>
      </div>

      <!-- Map container -->
      <div id="modal-map" class="modal-map-container"></div>
    </ion-content>
  `,
  styles: [`
    .modal-map-container {
      width: 100%;
      height: 100%;
    }

    ion-content {
      --padding-top: 0;
    }

    .travel-label {
      font-size: 0.65rem;
    }

    /* Route info bar */
    .route-info-bar {
      display: flex;
      justify-content: center;
      gap: 2rem;
      padding: 0.75rem 1rem;
      background: var(--ion-color-light);
      border-bottom: 1px solid var(--ion-color-light-shade);
      z-index: 5;
      position: relative;

      .route-detail {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
        font-size: 1rem;
        color: var(--ion-text-color);

        ion-icon {
          font-size: 1.25rem;
          color: var(--ion-color-primary);
        }
      }
    }

    /* Directions loading */
    .directions-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      position: relative;
      z-index: 5;

      .loading-spinner {
        width: 50px;
        height: 50px;
      }

      p {
        margin-top: 0.5rem;
        color: var(--ion-color-medium);
        font-size: 0.9rem;
      }
    }

    /* Directions error */
    .directions-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 1.5rem;
      position: relative;
      z-index: 5;

      .error-icon {
        font-size: 2.5rem;
        color: var(--ion-color-warning);
        margin-bottom: 0.5rem;
      }

      p {
        color: var(--ion-color-medium);
        margin-bottom: 1rem;
        font-size: 0.9rem;
      }
    }

  `],
  styleUrls: ['./restaurant.page.scss'],
  standalone: false,
})
export class MapModalComponent implements AfterViewInit, OnDestroy {
  private readonly modalController = inject(ModalController);
  private readonly locationService = inject(LocationService);

  // Props passed via componentProps
  latitude!: number;
  longitude!: number;
  showDirections: boolean = false;
  restaurantName: string = '';
  lang: 'EN' | 'TC' = 'EN';

  // Directions state
  selectedTravelMode: string = 'TRANSIT';
  isDirectionsLoading: boolean = false;
  directionsError: string | null = null;
  routeInfo: { duration: string; distance: string } | null = null;

  // Map internals
  private map: google.maps.Map | null = null;
  private marker: google.maps.Marker | null = null;
  private mapInitialized = false;
  private mapContainer: HTMLElement | null = null;
  private directionsService: google.maps.DirectionsService | null = null;
  private directionsRenderer: google.maps.DirectionsRenderer | null = null;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() { }

  async ngAfterViewInit(): Promise<void> {
    // Wait for DOM to stabilise
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      this.mapContainer = document.getElementById('modal-map');

      if (!this.mapContainer || typeof this.latitude !== 'number' || typeof this.longitude !== 'number') {
        console.warn('MapModalComponent: Invalid coordinates or element not found');
        return;
      }

      // Prevent multiple initialisations
      if (this.mapInitialized || this.map) {
        return;
      }

      // Initialise Google Map
      this.map = new google.maps.Map(this.mapContainer, {
        center: { lat: this.latitude, lng: this.longitude },
        zoom: 16,
        mapTypeControl: false,
        fullscreenControl: true,
        zoomControl: true,
        streetViewControl: false
      });

      // Add marker for the restaurant
      this.marker = new google.maps.Marker({
        position: { lat: this.latitude, lng: this.longitude },
        map: this.map,
        title: this.restaurantName || 'Restaurant Location'
      });

      this.mapInitialized = true;
      console.log('MapModalComponent: Map initialised successfully');

      // Load directions if requested
      if (this.showDirections) {
        await this.loadDirections();
      }
    } catch (err) {
      console.error('MapModalComponent initialisation error:', err);
      this.mapInitialized = false;
    }
  }

  // Load directions from user's location to the restaurant
  async loadDirections(): Promise<void> {
    this.isDirectionsLoading = true;
    this.directionsError = null;
    this.routeInfo = null;

    try {
      // Get user's current location
      const coords = await firstValueFrom(this.locationService.getCurrentLocation(true));

      if (!coords) {
        this.directionsError = this.lang === 'TC'
          ? '路線導航需要位置存取權限。'
          : 'Location access is required for directions.';
        this.isDirectionsLoading = false;
        return;
      }

      // Create DirectionsService and DirectionsRenderer
      if (!this.directionsService) {
        this.directionsService = new google.maps.DirectionsService();
      }

      if (!this.directionsRenderer) {
        this.directionsRenderer = new google.maps.DirectionsRenderer({
          suppressMarkers: false,
          polylineOptions: {
            strokeColor: '#4A46E8',
            strokeWeight: 5,
            strokeOpacity: 0.8
          }
        });
      }

      if (this.map) {
        this.directionsRenderer.setMap(this.map);
      }

      // Hide the static marker when showing directions (renderer adds its own)
      if (this.marker) {
        this.marker.setMap(null);
      }

      // Map string to TravelMode enum
      const travelMode = this.getTravelMode(this.selectedTravelMode);

      // Request directions
      const result = await this.directionsService.route({
        origin: { lat: coords.latitude, lng: coords.longitude },
        destination: { lat: this.latitude, lng: this.longitude },
        travelMode
      });

      if (result.routes && result.routes.length > 0) {
        this.directionsRenderer.setDirections(result);
        const leg = result.routes[0].legs[0];
        this.routeInfo = {
          duration: leg.duration?.text || '—',
          distance: leg.distance?.text || '—'
        };
        this.directionsError = null;
      } else {
        this.directionsError = this.lang === 'TC'
          ? '找不到此出行方式的路線。'
          : 'No route found for this travel mode.';
      }
    } catch (err: any) {
      console.error('MapModalComponent: Directions error:', err);

      if (err?.status === 'ZERO_RESULTS' || err?.code === 'ZERO_RESULTS') {
        this.directionsError = this.lang === 'TC'
          ? '找不到此出行方式的路線。'
          : 'No route found for this travel mode.';
      } else {
        this.directionsError = this.lang === 'TC'
          ? '無法載入路線。請嘗試在 Google Maps 中開啟。'
          : 'Unable to load directions. Try opening in Google Maps.';
      }

      // Show static marker again on error
      if (this.marker && this.map) {
        this.marker.setMap(this.map);
      }
    } finally {
      this.isDirectionsLoading = false;
    }
  }

  // Handle travel mode change
  onTravelModeChange(mode: string): void {
    this.selectedTravelMode = mode;
    this.loadDirections();
  }

  // Open external Google Maps with directions
  openExternalMaps(): void {
    const modeMap: Record<string, string> = {
      'DRIVING': 'driving',
      'WALKING': 'walking',
      'TRANSIT': 'transit',
      'BICYCLING': 'bicycling'
    };
    const travelmode = modeMap[this.selectedTravelMode] || 'transit';

    const userCoords = this.locationService.currentLocationValue;
    let url: string;

    if (userCoords) {
      url = `https://www.google.com/maps/dir/?api=1&origin=${userCoords.latitude},${userCoords.longitude}&destination=${this.latitude},${this.longitude}&travelmode=${travelmode}`;
    } else {
      url = `https://www.google.com/maps/dir/?api=1&destination=${this.latitude},${this.longitude}&travelmode=${travelmode}`;
    }

    window.open(url, '_blank');
  }

  // Map string to Google Maps TravelMode enum
  private getTravelMode(mode: string): google.maps.TravelMode {
    switch (mode) {
      case 'DRIVING': return google.maps.TravelMode.DRIVING;
      case 'WALKING': return google.maps.TravelMode.WALKING;
      case 'BICYCLING': return google.maps.TravelMode.BICYCLING;
      case 'TRANSIT':
      default: return google.maps.TravelMode.TRANSIT;
    }
  }

  // Clean up map instance to prevent memory leaks
  ngOnDestroy(): void {
    this.cleanupMap();
  }

  // Close modal and clean up
  async close(): Promise<void> {
    try {
      this.cleanupMap();
      await new Promise(resolve => setTimeout(resolve, 50));
      await this.modalController.dismiss();
    } catch (err) {
      console.warn('MapModalComponent.close error:', err);
    }
  }

  // Centralised cleanup method
  private cleanupMap(): void {
    try {
      if (this.directionsRenderer) {
        this.directionsRenderer.setMap(null);
        this.directionsRenderer = null;
      }

      if (this.marker) {
        this.marker.setMap(null);
        this.marker = null;
      }

      if (this.map) {
        this.map = null;
        this.mapInitialized = false;
        console.log('MapModalComponent: Map cleaned up successfully');
      }

      this.directionsService = null;
    } catch (err) {
      console.warn('MapModalComponent cleanup error:', err);
    }
  }
}
