import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { StorePage } from './store.page';
import { RestaurantInfoModalComponent } from './restaurant-info-modal/restaurant-info-modal.component';

const routes: Routes = [
  {
    path: '',
    component: StorePage
  },
  {
    path: 'edit-info',
    component: RestaurantInfoModalComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StorePageRoutingModule {}
