// Fullscreen modal that lists the Menu items
import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Observable } from 'rxjs';

@Component({
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ (langStream | async) === 'TC' ? '餐牌' : 'Menu' }}</ion-title>
        <ion-buttons slot="end"><ion-button (click)="close()">{{ (langStream | async) === 'TC' ? '關閉' : 'Close' }}</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list lines="none">
        <ion-item *ngFor="let item of (menu || [])">
          <ion-label>
            <div class="font-medium">{{ (langStream | async) === 'TC' ? (item?.Name_TC ?? item?.Name_EN ?? '-') : (item?.Name_EN ?? item?.Name_TC ?? '-') }}</div>
            <div class="muted small">{{ item?.Price != null ? ('$' + item.Price) : '-' }}</div>
            <div class="muted small">{{ (langStream | async) === 'TC' ? (item?.Description_TC ?? item?.Description_EN ?? '') : (item?.Description_EN ?? item?.Description_TC ?? '') }}</div>
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
  langStream: Observable<string> | undefined;

  constructor(private modalController: ModalController) {}

  async close(): Promise<void> {
    await this.modalController.dismiss();
  }
}