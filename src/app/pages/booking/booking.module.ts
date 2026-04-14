import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { BookingPageRoutingModule } from './booking-routing.module';
import { BookingPage } from './booking.page';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonicModule,
    BookingPageRoutingModule,
    SharedModule,
  ],
  declarations: [BookingPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BookingPageModule {}