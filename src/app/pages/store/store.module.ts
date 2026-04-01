import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { StorePageRoutingModule } from './store-routing.module';

import { StorePage } from './store.page';
import { AdModalComponent } from './ad-modal/ad-modal.component';
import { AddRestaurantModalComponent } from './add-restaurant-modal/add-restaurant-modal.component';
import { RestaurantInfoModalComponent } from './restaurant-info-modal/restaurant-info-modal.component';
import { MenuItemModalComponent } from './menu-item-modal/menu-item-modal.component';
import { BulkMenuImportModalComponent } from './bulk-menu-import-modal/bulk-menu-import-modal.component';
import { MenuQrModalComponent } from './menu-qr-modal/menu-qr-modal.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    StorePageRoutingModule,
    SharedModule
  ],
  declarations: [
    StorePage,
    AdModalComponent,
    AddRestaurantModalComponent,
    RestaurantInfoModalComponent,
    MenuItemModalComponent,
    BulkMenuImportModalComponent,
    MenuQrModalComponent
  ]
})
export class StorePageModule {}
