import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { SharedModule } from '../../shared/shared.module';
import { TestPageRoutingModule } from './test-routing.module';
import { TestPage } from './test.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedModule,
    TestPageRoutingModule,
  ],
  declarations: [TestPage],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class TestPageModule {}
