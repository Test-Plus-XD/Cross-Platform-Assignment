// Component that renders the ion-menu contents and controls navigation
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { UIService } from '../../services/UI.service';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';

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

  constructor(
    readonly router: Router,
    readonly UI: UIService,
    readonly menu: MenuController,
    readonly language: LanguageService,
    readonly theme: ThemeService
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
}