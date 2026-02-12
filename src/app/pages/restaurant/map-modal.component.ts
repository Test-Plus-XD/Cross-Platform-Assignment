// Fullscreen modal that shows a Google Map for given coordinates
import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Map</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content fullscreen>
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

    /* Mobile: 10% margin top and bottom for pop-up map */
    @media (max-width: 768px) {
      .modal-map-container {
        height: 80vh;
        margin: 10vh auto;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      }
    }
  `],
  styleUrls: ['./restaurant.page.scss'],
  standalone: false,
})
export class MapModalComponent implements AfterViewInit, OnDestroy {
  latitude!: number;
  longitude!: number;
  private map: google.maps.Map | null = null;
  private marker: google.maps.Marker | null = null;
  private mapInitialized = false;
  private mapContainer: HTMLElement | null = null;

  constructor(private readonly modalController: ModalController) { }

  // Called by ModalController.create(componentProps: {...})
  // Note: Angular will bind componentProps to instance fields automatically
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

      // Initialise Google Map with error handling
      this.map = new google.maps.Map(this.mapContainer, {
        center: { lat: this.latitude, lng: this.longitude },
        zoom: 16,
        mapTypeControl: false,
        fullscreenControl: true,
        zoomControl: true,
        streetViewControl: false
      });

      // Add marker
      this.marker = new google.maps.Marker({
        position: { lat: this.latitude, lng: this.longitude },
        map: this.map,
        title: 'Restaurant Location'
      });

      this.mapInitialized = true;
      console.log('MapModalComponent: Map initialised successfully');
    } catch (err) {
      console.error('MapModalComponent initialisation error:', err);
      this.mapInitialized = false;
    }
  }

  // Clean up map instance to prevent memory leaks
  ngOnDestroy(): void {
    this.cleanupMap();
  }

  // Close modal and clean up
  async close(): Promise<void> {
    try {
      // Clean up map before dismissing modal
      this.cleanupMap();

      // Add small delay to ensure cleanup completes
      await new Promise(resolve => setTimeout(resolve, 50));

      await this.modalController.dismiss();
    } catch (err) {
      console.warn('MapModalComponent.close error:', err);
    }
  }

  // Centralised cleanup method
  private cleanupMap(): void {
    try {
      if (this.marker) {
        this.marker.setMap(null);
        this.marker = null;
      }

      if (this.map) {
        this.map = null;
        this.mapInitialized = false;
        console.log('MapModalComponent: Map cleaned up successfully');
      }
    } catch (err) {
      console.warn('MapModalComponent cleanup error:', err);
    }
  }
}
