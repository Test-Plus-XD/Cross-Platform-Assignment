import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { OffersPageRoutingModule } from './offers-routing.module';
import { OffersPage } from './offers.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonicModule,
    OffersPageRoutingModule,
  ],
  declarations: [OffersPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class OffersPageModule {}
