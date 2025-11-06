import { Component } from '@angular/core';
import { ThemeService } from './services/theme.service';
import { LayoutService } from './services/layout.service';
import { LanguageService } from './services/language.service';
import { PlatformService } from './services/platform.service';
import { UIService } from './services/UI.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  // Inject ThemeService so the service constructor/initializer can run
  constructor(
    readonly theme: ThemeService,
    readonly layout: LayoutService,
    readonly language: LanguageService,
    readonly platform: PlatformService,
    readonly UI: UIService,
  ) {
    // Ensure the initial theme is applied right away.
    // This re-applies whatever ThemeService computed in getInitialTheme().
    // (ThemeService's setTheme will also write to localStorage.)
    this.theme.init();
    this.language.init();
    this.platform.init();
    this.UI.init();
  }
}