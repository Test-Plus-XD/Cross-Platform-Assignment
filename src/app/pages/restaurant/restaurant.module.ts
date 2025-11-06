import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RestaurantPageRoutingModule } from './restaurant-routing.module';
import { RestaurantPage } from './restaurant.page';
import { MapModalComponent } from './map-modal.component';
import { MenuModalComponent } from './menu-modal.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RestaurantPageRoutingModule,
    SharedModule
  ],
  declarations: [RestaurantPage, MapModalComponent, MenuModalComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class RestaurantPageModule {}
