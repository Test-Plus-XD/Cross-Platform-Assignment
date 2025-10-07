import { Component, OnInit } from '@angular/core';
import { MockDataService } from '../../services/mock-data.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-user',
  templateUrl: './user.page.html',
  styleUrls: ['./user.page.scss'],
  standalone: false,
})
export class UserPage {
  // For demo, show recent reviews from mock service
  reviews$ = this.mock.reviews$();
  lang$ = this.lang.lang$;
  constructor(
    private mock: MockDataService,
    private lang: LanguageService
  ) { }

  ngOnInit() {
  }
}