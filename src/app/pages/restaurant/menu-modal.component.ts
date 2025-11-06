// Fullscreen modal that lists the Menu items
import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Menu</ion-title>
        <ion-buttons slot="end"><ion-button (click)="close()">Close</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list lines="none">
        <ion-item *ngFor="let item of (menu || [])">
          <ion-label>
            <div class="font-medium">{{ item?.Name_EN ?? item?.Name_TC ?? '-' }}</div>
            <div class="muted small">{{ item?.Price != null ? ('$' + item.Price) : '-' }}</div>
            <div class="muted small">{{ item?.Description_EN ?? item?.Description_TC ?? '' }}</div>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  `,
  styles: [`.muted { color: var(--muted); }`],
  styleUrls: ['./restaurant.page.scss'],
  standalone: false,
})
export class MenuModalComponent {
  menu: any[] = [];

  constructor(private modalController: ModalController) {}

  async close(): Promise<void> {
    await this.modalController.dismiss();
  }
}