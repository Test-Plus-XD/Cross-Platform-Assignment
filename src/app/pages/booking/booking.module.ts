import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { BookingPageRoutingModule } from './booking-routing.module';
import { BookingPage } from './booking.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonicModule,
    BookingPageRoutingModule
  ],
  declarations: [BookingPage]
})
export class BookingPageModule {}