// Component that renders the ion-menu contents and controls navigation
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController, ModalController } from '@ionic/angular';
import { map } from 'rxjs/operators';
import { UIService } from '../../services/UI.service';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';
import { UserService } from '../../services/user.service';
import { AppStateService } from '../../services/app-state.service';
import { QrScannerModalComponent } from '../qr-scanner/qr-scanner-modal.component';

@Component({
  selector: 'app-shared-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
  standalone: false
})
export class MenuComponent {
  readonly router = inject(Router);
  readonly UI = inject(UIService);
  readonly menu = inject(MenuController);
  readonly language = inject(LanguageService);
  readonly theme = inject(ThemeService);
  readonly userService = inject(UserService);
  private readonly modalController = inject(ModalController);

  // Expose language observable for bilingual labels (shorthand assignment)
  lang$ = this.language.lang$;
  // Expose dark-mode observable for template use
  isDark$ = this.theme.isDark$;
  // App state for checking login status
  appState$ = inject(AppStateService).appState$;
  // User profile for checking user type
  userProfile$ = this.userService.currentProfile$;
  // Computed observable for whether user is Restaurant type
  isRestaurantUser$ = this.userProfile$.pipe(
    map(profile => profile?.type?.toLowerCase() === 'restaurant')
  );

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() { }

  // Called by template when user clicks an item
  async onMenuItemSelected(route: string): Promise<void> {
    try {
      // Close the menu first (push animation will be visible because menu type = push)
      await this.menu.close();
      // Navigate to route
      await this.router.navigateByUrl(route);
    } catch (error) {
      console.error('MenuComponent.onMenuItemSelected error', error);
    }
  }

  // Optional method to close menu programmatically
  async closeMenu(): Promise<void> {
    try {
      await this.menu.close();
    } catch (error) {
      console.error('MenuComponent.closeMenu error', error);
    }
  }

  // Toggle theme via ThemeService
  toggleTheme(): void {
    this.theme.toggle(); // Toggle dark / light mode safely
  }

  // Set language via LanguageService
  toggleLanguage() {
    this.language.toggleLanguage();// Update language globally
  }

  // Open the QR scanner modal (accessible to all users — no login required)
  async openQrScanner(): Promise<void> {
    await this.menu.close();
    const lang = this.language.getCurrentLanguage();
    const modal = await this.modalController.create({
      component: QrScannerModalComponent,
      componentProps: { lang },
      cssClass: 'qr-scanner-modal',
    });
    await modal.present();
  }
}