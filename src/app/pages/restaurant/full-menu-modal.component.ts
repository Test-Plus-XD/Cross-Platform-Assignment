// Full-screen modal that presents every menu item from the restaurant menu sub-collection.
import { Component, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Observable, of } from 'rxjs';
import { MenuItem } from '../../services/restaurants.service';

@Component({
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ restaurantName || ((langStream | async) === 'TC' ? '完整菜單' : 'Full Menu') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close()">
            {{ (langStream | async) === 'TC' ? '關閉' : 'Close' }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="full-menu-content">
      <ng-container *ngIf="langStream | async as language">
        <div *ngIf="menuItems.length > 0; else emptyMenu" class="full-menu-list">
          <article *ngFor="let menuItem of menuItems; trackBy: trackByMenuItem" class="full-menu-item">
            <div class="full-menu-item-main">
              <h2>{{ getMenuItemName(menuItem, language) }}</h2>
              <p *ngIf="getMenuItemDescription(menuItem, language) as description">{{ description }}</p>
            </div>
            <span class="full-menu-price">{{ getMenuItemPrice(menuItem) }}</span>
          </article>
        </div>

        <ng-template #emptyMenu>
          <div class="empty-menu-state">
            <ion-icon name="restaurant-outline"></ion-icon>
            <p>{{ language === 'TC' ? '未提供菜單' : 'Menu not available' }}</p>
          </div>
        </ng-template>
      </ng-container>
    </ion-content>
  `,
  styles: [`
    ion-content.full-menu-content {
      --background: var(--ion-background-color);
      --padding-bottom: 1.25rem;
      --padding-end: 1rem;
      --padding-start: 1rem;
      --padding-top: 1rem;
    }

    .full-menu-list {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      max-width: 860px;
      margin: 0 auto;
    }

    .full-menu-item {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem;
      background: var(--ion-card-background);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    .full-menu-item-main {
      min-width: 0;
      flex: 1;
    }

    .full-menu-item-main h2 {
      margin: 0 0 0.35rem 0;
      color: var(--ion-text-color);
      font-size: 1rem;
      font-weight: 700;
      line-height: 1.3;
    }

    .full-menu-item-main p {
      margin: 0;
      color: var(--muted);
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .full-menu-price {
      flex: 0 0 auto;
      color: var(--ion-color-primary);
      font-size: 1rem;
      font-weight: 800;
      line-height: 1.3;
      white-space: nowrap;
    }

    .empty-menu-state {
      display: flex;
      min-height: 45vh;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      color: var(--muted);
      text-align: center;
    }

    .empty-menu-state ion-icon {
      color: var(--ion-color-primary);
      font-size: 3rem;
    }
  `],
  standalone: false,
})
export class FullMenuModalComponent {
  private readonly modalController = inject(ModalController);

  // Full menu items are passed from RestaurantPage after the sub-collection request completes.
  menuItems: MenuItem[] = [];
  // Restaurant name is optional because deep links can still open an empty menu state.
  restaurantName: string = '';
  // Language stream keeps the modal bilingual even when the user switches language while it is open.
  langStream: Observable<string> = of('EN');

  // Inserted by Angular inject() migration for backwards compatibility.
  constructor(...args: unknown[]);

  constructor() {}

  /// Returns the menu item name in the active language with a clear fallback chain.
  getMenuItemName(menuItem: MenuItem, language: string): string {
    const isTraditionalChinese = language === 'TC';
    return isTraditionalChinese
      ? (menuItem.Name_TC || menuItem.Name_EN || '—')
      : (menuItem.Name_EN || menuItem.Name_TC || '—');
  }

  /// Returns the optional item description in the active language.
  getMenuItemDescription(menuItem: MenuItem, language: string): string {
    const isTraditionalChinese = language === 'TC';
    return isTraditionalChinese
      ? (menuItem.Description_TC || menuItem.Description_EN || '')
      : (menuItem.Description_EN || menuItem.Description_TC || '');
  }

  /// Formats price consistently with the restaurant page preview.
  getMenuItemPrice(menuItem: MenuItem): string {
    if (typeof menuItem.price !== 'number') return '—';
    return `$${menuItem.price}`;
  }

  /// Keeps Angular from recreating every modal row when change detection runs.
  trackByMenuItem(index: number, menuItem: MenuItem): string {
    return menuItem.id || `${index}-${menuItem.Name_EN || menuItem.Name_TC || 'menu-item'}`;
  }

  /// Closes the full menu modal.
  async close(): Promise<void> {
    await this.modalController.dismiss();
  }
}
