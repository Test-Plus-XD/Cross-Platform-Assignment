// Shared header component that exposes language & theme controls and brand icon
import { Component } from '@angular/core';
import { map } from 'rxjs/operators';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-shared-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  // Expose observable stream for current language (EN or TC)
  lang$ = this.lang.lang$;
  // Expose observable stream for dark mode flag
  isDark$ = this.theme.isDark$;
  // Expose brand icon path which reacts to theme changes
  brandIcon$ = this.isDark$.pipe(map(d => d ? 'assets/icon/App-Dark.png?theme=dark' : 'assets/icon/App-Light.png?theme=light'));

  constructor(private lang: LanguageService, private theme: ThemeService) { /* No-op constructor */ }

  // Toggle theme via ThemeService
  toggleTheme(): void {
    this.theme.toggle(); // Toggle dark / light mode safely
  }

  // Set language via LanguageService
  setLang(l: 'EN' | 'TC'): void {
    this.lang.setLang(l); // Update language globally
  }
}