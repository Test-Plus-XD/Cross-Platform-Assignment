import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RestaurantPageRoutingModule } from './restaurant-routing.module';
import { RestaurantPage } from './restaurant.page';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RestaurantPageRoutingModule,
    SharedModule
  ],
  declarations: [RestaurantPage]
})
export class RestaurantPageModule {}
