import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { UserPageRoutingModule } from './user-routing.module';
import { UserPage } from './user.page';
import { ProfileModalComponent } from './profile-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule, // Required for reactive forms in modal
    IonicModule,
    UserPageRoutingModule
  ],
  declarations: [
    UserPage,
    ProfileModalComponent // Declare the modal component here
  ]
})
export class UserPageModule { }