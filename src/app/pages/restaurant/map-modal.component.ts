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

  private map: L.Map | null = null;
  private mapInitialized = false;

  constructor(private modalController: ModalController) {}

  // Called by ModalController.create(componentProps: {...})
  // Note: Angular will bind componentProps to instance fields automatically
  async ngAfterViewInit(): Promise<void> {
    try {
      const element = document.getElementById('modal-map');
      if (!element || typeof this.latitude !== 'number' || typeof this.longitude !== 'number') {
        console.warn('MapModalComponent: Invalid coordinates or element not found');
        return;
      }

      // Prevent multiple initializations
      if (this.mapInitialized) {
        return;
      }

      // Initialize map with error handling
      this.map = Leaflet.map(element, {
        attributionControl: false,
        zoomControl: true
      }).setView([this.latitude, this.longitude], 16);

      Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

      Leaflet.marker([this.latitude, this.longitude]).addTo(this.map);

      this.mapInitialized = true;

      // Invalidate size after a short delay to ensure proper rendering
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
        }
      }, 100);
    } catch (err) {
      console.error('MapModalComponent initialization error:', err);
      this.mapInitialized = false;
    }
  }

  // Clean up map instance to prevent memory leaks and crashes
  ngOnDestroy(): void {
    try {
      if (this.map) {
        this.map.remove();
        this.map = null;
        this.mapInitialized = false;
      }
    } catch (err) {
      console.warn('MapModalComponent cleanup error:', err);
    }
  }

  // Close modal and clean up
  async close(): Promise<void> {
    try {
      // Clean up map before dismissing modal
      if (this.map) {
        this.map.remove();
        this.map = null;
        this.mapInitialized = false;
      }
      await this.modalController.dismiss();
    } catch (err) {
      console.warn('MapModalComponent.close error:', err);
    }
  }
}