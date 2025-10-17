// SharedModule exports header and footer components for use across the app
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { MenuComponent } from './menu/menu.component';
import { TabComponent } from './tab/tab.component';

@NgModule({
  // Declare the header and footer components in this module
  declarations: [HeaderComponent, FooterComponent, MenuComponent, TabComponent],
  // Import common building blocks and Ionic/Router for routerLink support
  imports: [CommonModule, IonicModule, RouterModule],
  // Export so AppModule (or any feature module) can use <app-shared-header> / <app-shared-footer> and menu/tab
  exports: [HeaderComponent, FooterComponent, MenuComponent, TabComponent]
})
export class SharedModule { }