// Fullscreen modal that shows a Leaflet map for given coordinates
import { Component, AfterViewInit } from '@angular/core';
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
    .modal-map-container { width:100%; height:100%; }
    ion-content { --padding-top: 0; }
  `],
  styleUrls: ['./restaurant.page.scss'],
  standalone: false,
})
export class MapModalComponent implements AfterViewInit {
  latitude!: number;
  longitude!: number;

  private map: L.Map | null = null;

  constructor(private modalController: ModalController) {}

  // Called by ModalController.create(componentProps: {...})
  // Note: Angular will bind componentProps to instance fields automatically
  async ngAfterViewInit(): Promise<void> {
    try {
      const element = document.getElementById('modal-map');
      if (!element || typeof this.latitude !== 'number' || typeof this.longitude !== 'number') return;
      this.map = Leaflet.map(element).setView([this.latitude, this.longitude], 16);
      Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(this.map);
      Leaflet.marker([this.latitude, this.longitude]).addTo(this.map);
      setTimeout(() => this.map && this.map.invalidateSize(), 30);
    } catch (err) {
      console.warn('MapModalComponent error', err);
    }
  }

  // Close modal
  async close(): Promise<void> {
    try {
      await this.modalController.dismiss();
    } catch (err) {
      console.warn('MapModalComponent.close error', err);
    }
  }
}