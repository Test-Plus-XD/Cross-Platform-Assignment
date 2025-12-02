import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { UserPageRoutingModule } from './user-routing.module';
import { UserPage } from './user.page';
import { ProfileModalComponent } from './profile-modal.component';

/// User module is defined with all required imports and declarations
@NgModule({
  imports: [
    CommonModule,
    FormsModule, // Required for ngModel bindings in inline editing
    ReactiveFormsModule, // Required for reactive forms in modal component
    IonicModule,
    UserPageRoutingModule
  ],
  declarations: [
    UserPage,
    ProfileModalComponent // Modal component is declared but not actively used
  ]
})
export class UserPageModule { }