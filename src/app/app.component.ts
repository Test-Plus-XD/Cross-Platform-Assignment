import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { HeaderComponent } from './shared/header/header.component';
import { ThemeService } from './services/theme.service';
import { LayoutService } from './services/layout.service';
import { LanguageService } from './services/language.service';
import { PlatformService } from './services/platform.service';
import { UIService } from './services/UI.service';
import { AppStateService } from './services/app-state.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
    @ViewChild(HeaderComponent) header!: HeaderComponent;

    // Cleanup subject
    private destroy$ = new Subject<void>();

    constructor(
        readonly theme: ThemeService,
        readonly layout: LayoutService,
        readonly language: LanguageService,
        readonly platform: PlatformService,
        readonly UI: UIService,
        readonly appState: AppStateService,
        readonly router: Router
    ) {
        // Ensure the initial theme is applied right away.
        // This re-applies whatever ThemeService computed in getInitialTheme().
        // (ThemeService's setTheme will also write to localStorage.)
        this.theme.init();
        this.language.init();
        this.platform.init();
        this.UI.init();

        // Listen to router events
      this.router.events
        .pipe(
          filter((event): event is NavigationEnd => event instanceof NavigationEnd),
          takeUntil(this.destroy$)
        )
        .subscribe(() => {
          // Find the currently active child route
          let current = this.router.routerState.root;
          while (current.firstChild) {
            current = current.firstChild;
          }

          // Read the 'title' data field if it exists
          const titleData = current.snapshot.data['title'];
          if (titleData && this.header) {
            this.header.emitPageTitle(titleData);
          }
        });
    }

    ngOnInit(): void {
      // AppStateService now handles state management automatically
    }

    ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
    }
}
