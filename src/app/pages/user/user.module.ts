import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { UserPageRoutingModule } from './user-routing.module';
import { UserPage } from './user.page';
import { ProfileModalComponent } from './profile-modal.component';
import { SharedModule } from '../../shared/shared.module';

/// User module is defined with all required imports and declarations
@NgModule({
  imports: [
    CommonModule,
    FormsModule, // Required for ngModel bindings in inline editing
    ReactiveFormsModule, // Required for reactive forms in modal component
    IonicModule,
    UserPageRoutingModule,
    SharedModule,
  ],
  declarations: [
    UserPage,
    ProfileModalComponent // Modal component is declared but not actively used
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class UserPageModule { }