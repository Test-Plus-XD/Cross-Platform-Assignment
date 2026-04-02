import { Injectable, inject } from '@angular/core';
import { RestaurantsService } from './restaurants.service';
import { BookingService } from './booking.service';
import { UserService } from './user.service';
import { AuthService } from './auth.service';
import { LanguageService } from './language.service';
import { ThemeService } from './theme.service';
import { PlatformService } from './platform.service';

/**
 * Feature aggregator service for Store page
 * Consolidates commonly used services to reduce constructor injection overhead
 */
@Injectable({
  providedIn: 'root'
})
export class StoreFeatureService {
  restaurants = inject(RestaurantsService);
  bookings = inject(BookingService);
  user = inject(UserService);
  auth = inject(AuthService);
  language = inject(LanguageService);
  theme = inject(ThemeService);
  platform = inject(PlatformService);

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {}
}
