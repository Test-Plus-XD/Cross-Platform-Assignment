// Shared header component that exposes language & theme controls and brand icon
import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';
import { PlatformService } from '../../services/platform.service';
import { UIService } from '../../services/UI.service';

@Component({
  selector: 'app-shared-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: false,
})
export class HeaderComponent implements OnInit {
  // Observable boolean that is true when running on mobile
  isMobile$: Observable<boolean>;
  // Observable boolean for whether to show menu
  showHeaderMenu$: Observable<boolean>;
  // Expose observable stream for current language (EN or TC)
  lang$ = this.lang.lang$;
  // Expose observable stream for dark mode flag
  isDark$ = this.theme.isDark$;
  // Expose brand icon path which reacts to theme changes
  brandIcon$ = this.isDark$.pipe(map(d => d ? 'assets/icon/App-Dark.png?theme=dark' : 'assets/icon/App-Light.png?theme=light'));

  constructor(
    readonly lang: LanguageService,
    readonly theme: ThemeService,
    readonly platform: PlatformService,
    readonly UI: UIService
  ) {
    // Use service observable directly for template consumption
    this.isMobile$ = this.platform.isMobile$;
    this.showHeaderMenu$ = this.UI.showHeaderMenu$;
  }

  ngOnInit(): void {
    // Debug logs to verify what the platform service is emitting
    this.platform.platform$.subscribe(p => console.debug('HeaderComponent platform =>', p));
    this.platform.isMobile$.subscribe(flag => console.debug('HeaderComponent isMobile =>', flag));
    this.UI.showHeaderMenu$.subscribe(flag => console.debug('HeaderComponent showHeaderMenu =>', flag));
  }

  // Toggle theme via ThemeService
  toggleTheme(): void {
    this.theme.toggle(); // Toggle dark / light mode safely
  }

  // Set language via LanguageService
  setLang(l: 'EN' | 'TC'): void {
    this.lang.setLang(l); // Update language globally
  }

  // Toggle menu via UIService
  onMenuButtonClicked(): void {
    this.UI.toggleMenu();
  }
}