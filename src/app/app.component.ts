import { Component } from '@angular/core';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  // Inject ThemeService so the service constructor/initializer can run
  constructor(private theme: ThemeService) {
    // Ensure the initial theme is applied right away.
    // This re-applies whatever ThemeService computed in getInitialTheme().
    // (ThemeService's setTheme will also write to localStorage.)
    this.theme.setTheme(this.theme['getInitialTheme']());
  }
}