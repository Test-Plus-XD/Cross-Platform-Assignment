import { Component, OnInit } from '@angular/core';
import { MockDataService } from '../../services/mock-data.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
  standalone: false,
})
export class SearchPage {
  // Load restaurants for client-side search demo
  restaurants$ = this.mock.restaurants$();
  lang$ = this.lang.lang$;

  // Minimal filter term
  q = '';

  constructor(
    private mock: MockDataService,
    private lang: LanguageService
  ) { }

  ngOnInit() {
  }
}