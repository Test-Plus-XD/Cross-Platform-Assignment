import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { SearchPageRoutingModule } from './search-routing.module';
import { SearchPage } from './search.page';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    IonicModule,
    SearchPageRoutingModule
  ],
  declarations: [SearchPage],
})
export class SearchPageModule {}
