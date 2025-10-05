// Import Observable utilities
import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
// Import services and types
import { MockDataService, Restaurant } from '../../services/mock-data.service';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';
//import { DataService } from '../../services/data.service'; // Firestore

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})

export class HomePage implements OnInit {
  // Observables expected to come from services (Firestore-friendly)
  offers$: Observable<any[]> = of([]);
  articles$: Observable<any[]> = of([]);
  reviews$: Observable<any[]> = of([]);
  restaurants$: Observable<any[]> = of([]);
  ads$: Observable<any[]> = of([]);

  // Bound featured image for the hero large image
  featuredImage: string | null = null;

  // Expose language stream from LanguageService (emits 'en' or 'tc')
  lang$ = this.lang.lang$;

  // Expose theme stream from ThemeService (emits true/false for dark mode)
  isDark$ = this.theme.isDark$;

  // Inject services for data, language and theme
  constructor(
    private mock: MockDataService,
    //private data: DataService,
    private lang: LanguageService,
    private theme: ThemeService
  ) { }

  // Lifecycle hook: runs after constructor, good for initial data loading
  ngOnInit() {
    // Initialise theme class early (ThemeService should apply .dark)
    this.theme.init?.();

    // Load Firestore collections via DataService
    // Collections: "offers", "articles", "reviews", "restaurants", "ads"
    this.offers$ = this.mock.offers$();
    this.articles$ = this.mock.articles$();
    this.reviews$ = this.mock.reviews$();
    this.restaurants$ = this.mock.restaurants$();
    this.ads$ = this.mock.ads$();

    // Set a default featured image once offers exist
    this.offers$.subscribe(arr => { if (arr && arr.length) this.featuredImage = arr[0].image || this.featuredImage; });
  }

  // Set featured image on hover/focus
  setFeatured(url?: string | null) {
    if (url) this.featuredImage = url;
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