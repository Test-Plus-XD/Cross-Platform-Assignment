import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SearchPageRoutingModule } from './search-routing.module';
import { SearchPage } from './search.page';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    IonicModule,
    SearchPageRoutingModule,
    SharedModule,
  ],
  declarations: [SearchPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class SearchPageModule {}
