import { Injectable } from '@angular/core';
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
  constructor(
    public restaurants: RestaurantsService,
    public bookings: BookingService,
    public user: UserService,
    public auth: AuthService,
    public language: LanguageService,
    public theme: ThemeService,
    public platform: PlatformService
  ) {}
}
