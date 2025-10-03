// Import Observable utilities
import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';

// Import your services and types
import { Restaurant, RestaurantService } from '../../services/restaurant.service';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})

export class HomePage implements OnInit {
  // Initialise with an empty observable so that the template is always safe
  restaurants$: Observable<Restaurant[]> = of([]);

  // Expose language stream from LanguageService (emits 'en' or 'tc')
  lang$ = this.lang.lang$;

  // Expose theme stream from ThemeService (emits true/false for dark mode)
  isDark$ = this.theme.isDark$;

  // Inject services for data, language and theme
  constructor(
    private rest: RestaurantService,
    private lang: LanguageService,
    private theme: ThemeService
  ) { }

  // Lifecycle hook: runs after constructor, good for initial data loading
  ngOnInit() {
    // Assign the real restaurant stream from the service
    this.restaurants$ = this.rest.getAll();
  }

  // Toggle the theme (light/dark)
  toggleTheme() {
    this.theme.toggle();
  }

  // Set language
  setLang(l: 'EN' | 'TC') {
    this.lang.setLang(l);
  }
}