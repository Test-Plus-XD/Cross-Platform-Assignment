// Component that renders the ion-menu contents and controls navigation
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { map } from 'rxjs/operators';
import { UIService } from '../../services/UI.service';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';
import { UserService } from '../../services/user.service';
import { AppComponent } from '../../app.component';

@Component({
  selector: 'app-shared-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
  standalone: false
})
export class MenuComponent {
  // Expose language observable for bilingual labels (shorthand assignment)
  lang$ = this.language.lang$;
  // Expose dark-mode observable for template use
  isDark$ = this.theme.isDark$;
  // App state for checking login status
  appState$ = inject(AppComponent).appState$;
  // User profile for checking user type
  userProfile$ = this.userService.currentProfile$;
  // Computed observable for whether user is Restaurant type
  isRestaurantUser$ = this.userProfile$.pipe(
    map(profile => profile?.type?.toLowerCase() === 'restaurant')
  );

  constructor(
    readonly router: Router,
    readonly UI: UIService,
    readonly menu: MenuController,
    readonly language: LanguageService,
    readonly theme: ThemeService,
    readonly userService: UserService
  ) { }

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
}