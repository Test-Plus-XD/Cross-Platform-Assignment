import { Injectable } from '@angular/core';
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
  constructor(
    public restaurants: RestaurantsService,
    public reviews: ReviewsService,
    public location: LocationService,
    public bookings: BookingService,
    public auth: AuthService,
    public user: UserService,
    public language: LanguageService,
    public theme: ThemeService,
    public platform: PlatformService
  ) {}
}