// Fullscreen modal that shows a Leaflet map for given coordinates
import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { ModalController } from '@ionic/angular';
import * as Leaflet from 'leaflet';

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
  private map: Leaflet.Map | null = null;
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

      // Initialise map with error handling
      this.map = Leaflet.map(this.mapContainer, {
        attributionControl: false,
        zoomControl: true
      }).setView([this.latitude, this.longitude], 16);

      // Add tile layer
      Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      // Add marker
      Leaflet.marker([this.latitude, this.longitude]).addTo(this.map);
      this.mapInitialized = true;

      // Invalidate size after a short delay to ensure proper rendering
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
        }
      }, 100);

      console.log('MapModalComponent: Map initialised successfully');
    } catch (err) {
      console.error('MapModalComponent initialisation error:', err);
      this.mapInitialized = false;
    }
  }

  // Clean up map instance to prevent memory leaks and crashes
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
      if (this.map) {
        // Remove all layers and event listeners
        this.map.eachLayer((layer: Leaflet.Layer) => {
          this.map?.removeLayer(layer);
        });

        // Remove the map instance
        this.map.remove();
        this.map = null;
        this.mapInitialized = false;
        console.log('MapModalComponent: Map cleaned up successfully');
      }
    } catch (err) {
      console.warn('MapModalComponent cleanup error:', err);
    }
  }
}