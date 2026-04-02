import { Injectable, inject } from '@angular/core';
import { RestaurantsService } from './restaurants.service';
import { ReviewsService } from './reviews.service';
import { LocationService } from './location.service';
import { BookingService } from './booking.service';
import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { LanguageService } from './language.service';
import { ThemeService } from './theme.service';
import { PlatformService } from './platform.service';

/**
 * Feature aggregator service for Restaurant detail page
 * Consolidates commonly used services to reduce constructor injection overhead
 */
@Injectable({
  providedIn: 'root'
})
export class RestaurantFeatureService {
  restaurants = inject(RestaurantsService);
  reviews = inject(ReviewsService);
  location = inject(LocationService);
  bookings = inject(BookingService);
  auth = inject(AuthService);
  user = inject(UserService);
  language = inject(LanguageService);
  theme = inject(ThemeService);
  platform = inject(PlatformService);

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {}
}