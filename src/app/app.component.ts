import { Component, ViewChild } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { HeaderComponent } from './shared/header/header.component';
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
    @ViewChild(HeaderComponent) header!: HeaderComponent;

    constructor(
        readonly theme: ThemeService,
        readonly layout: LayoutService,
        readonly language: LanguageService,
        readonly platform: PlatformService,
        readonly UI: UIService,
        private router: Router
    ) {
        // Ensure the initial theme is applied right away.
        // This re-applies whatever ThemeService computed in getInitialTheme().
        // (ThemeService's setTheme will also write to localStorage.)
        this.theme.init();
        this.language.init();
        this.platform.init();
        this.UI.init();

        // Listen to router events
        this.router.events.pipe(
            filter((event): event is NavigationEnd => event instanceof NavigationEnd)
        ).subscribe(() => {
            // Reset window.appSetPageTitle after each navigation
            (window as any).appSetPageTitle = (title: { Header_EN: string; Header_TC: string }) => {
                if (this.header) {
                    this.header.emitPageTitle(title);
                }
            };
        });
    }
}