import { Component, OnInit } from '@angular/core';
import { Restaurant, RestaurantService } from '../../services/restaurant.service';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
    restaurants$: Observable<Restaurant[]>;
    lang$ = this.lang.lang$;
    isDark$ = this.theme.isDark$;

    constructor(
        private rest: RestaurantService,
        private lang: LanguageService,
        private theme: ThemeService
    ) { }

    ngOnInit() {
        this.restaurants$ = this.rest.getAll();
    }

    toggleTheme() {
        this.theme.toggle();
    }

    setLang(l: 'EN' | 'TC') {
        this.lang.setLang(l);
    }

    // Small helper in template to choose text according to current language
    showName(item: Restaurant, currentLang: 'EN' | 'TC') {
        return currentLang === 'TC' ? item.Name_TC || item.Name_EN : item.Name_EN || item.Name_TC;
    }
}