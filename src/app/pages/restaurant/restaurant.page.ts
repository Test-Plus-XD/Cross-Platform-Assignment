import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MockDataService, Restaurant } from '../../services/mock-data.service';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-restaurant',
  templateUrl: './restaurant.page.html',
  styleUrls: ['./restaurant.page.scss'],
  standalone: false,
})
export class RestaurantPage implements OnInit {
  // Restaurant Observable resolved from route param id
  rest$!: Observable<Restaurant | undefined>;
  lang$ = this.lang.lang$;

  constructor(
    private route: ActivatedRoute,
    private mock: MockDataService,
    private lang: LanguageService
  ) { }

  ngOnInit() {
    // Read id from route and use mock service to fetch
    this.rest$ = this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        return id ? this.mock.getRestaurant(id) : of(undefined);
      })
    );
  }
}