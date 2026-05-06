import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { AuthService, User } from './auth.service';
import { Restaurant } from './restaurants.service';
import { UserProfile, UserService } from './user.service';

// Stores the compact restaurant fields needed to rebuild local saved cards without a network request.
export interface SavedRestaurant {
  id: string;
  Name_EN?: string | null;
  Name_TC?: string | null;
  ImageUrl?: string | null;
  District_EN?: string | null;
  District_TC?: string | null;
  Address_EN?: string | null;
  Address_TC?: string | null;
  savedAt: string;
}

interface SavedRestaurantStorage {
  version: number;
  lists: Record<string, SavedRestaurant[]>;
}

@Injectable({
  providedIn: 'root'
})
export class SavedRestaurantsService {
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly storageKey = 'pourRiceSavedRestaurantsByUser';
  private readonly legacyStorageKey = 'pourRiceSavedRestaurants';
  private readonly guestScopeKey = 'guest';
  private activeScopeKey: string | null = null;
  private readonly savedRestaurantsSubject = new BehaviorSubject<SavedRestaurant[]>([]);
  private readonly canUseSavedRestaurantsSubject = new BehaviorSubject<boolean>(false);
  public readonly savedRestaurants$: Observable<SavedRestaurant[]> = this.savedRestaurantsSubject.asObservable();
  public readonly canUseSavedRestaurants$: Observable<boolean> = this.canUseSavedRestaurantsSubject.asObservable();

  constructor() {
    this.migrateLegacyStorageIfNeeded();

    combineLatest([
      this.authService.currentUser$,
      this.userService.currentProfile$,
      this.authService.authInitialized$
    ]).subscribe(([user, profile, isAuthInitialized]) => {
      this.applyStorageScope(user, profile, isAuthInitialized);
    });
  }

  // Switches saved-restaurant storage between guest, diner UID, and hidden restaurant-owner states.
  private applyStorageScope(user: User | null, profile: UserProfile | null, isAuthInitialized: boolean): void {
    let nextScopeKey: string | null = null;
    let canUseSavedRestaurants = false;

    if (!isAuthInitialized) {
      nextScopeKey = null;
    } else if (!user) {
      nextScopeKey = this.guestScopeKey;
      canUseSavedRestaurants = true;
    } else if (this.isDinerProfile(profile)) {
      nextScopeKey = user.uid;
      canUseSavedRestaurants = true;
    }

    this.canUseSavedRestaurantsSubject.next(canUseSavedRestaurants);

    if (this.activeScopeKey === nextScopeKey) {
      if (!canUseSavedRestaurants && this.savedRestaurantsSubject.value.length > 0) {
        this.savedRestaurantsSubject.next([]);
      }
      return;
    }

    this.activeScopeKey = nextScopeKey;
    this.savedRestaurantsSubject.next(nextScopeKey ? this.readSavedRestaurants(nextScopeKey) : []);
  }

  // Returns true only for diner profiles; restaurant-owner and incomplete profiles do not expose local saves.
  private isDinerProfile(profile: UserProfile | null): boolean {
    return (profile?.type || '').trim().toLowerCase() === 'diner';
  }

  // Moves the old single-list localStorage value into the new guest list once.
  private migrateLegacyStorageIfNeeded(): void {
    try {
      if (localStorage.getItem(this.storageKey)) return;
      const rawLegacyValue = localStorage.getItem(this.legacyStorageKey);
      if (!rawLegacyValue) return;

      const parsedLegacyValue = JSON.parse(rawLegacyValue);
      const guestRestaurants = this.sanitiseSavedRestaurants(parsedLegacyValue);
      if (guestRestaurants.length === 0) return;

      this.writeStorage({
        version: 1,
        lists: {
          [this.guestScopeKey]: guestRestaurants
        }
      });
      localStorage.removeItem(this.legacyStorageKey);
    } catch (error) {
      console.warn('SavedRestaurantsService: Could not migrate legacy saved restaurants', error);
    }
  }

  // Reads the full localStorage payload, falling back to an empty scoped object.
  private readStorage(): SavedRestaurantStorage {
    try {
      const rawValue = localStorage.getItem(this.storageKey);
      if (!rawValue) return { version: 1, lists: {} };
      const parsedValue = JSON.parse(rawValue);
      if (!parsedValue || typeof parsedValue !== 'object') return { version: 1, lists: {} };
      if (!parsedValue.lists || typeof parsedValue.lists !== 'object') return { version: 1, lists: {} };
      return {
        version: 1,
        lists: parsedValue.lists
      };
    } catch (error) {
      console.warn('SavedRestaurantsService: Could not read saved restaurants storage', error);
      return { version: 1, lists: {} };
    }
  }

  // Writes the full scoped saved-restaurant payload to localStorage.
  private writeStorage(storage: SavedRestaurantStorage): void {
    localStorage.setItem(this.storageKey, JSON.stringify(storage));
  }

  // Drops malformed entries and sorts the list by most recently saved.
  private sanitiseSavedRestaurants(value: unknown): SavedRestaurant[] {
    if (!Array.isArray(value)) return [];
    return value
      .filter((restaurant): restaurant is SavedRestaurant => !!restaurant && typeof restaurant.id === 'string')
      .sort((firstRestaurant, secondRestaurant) =>
        new Date(secondRestaurant.savedAt).getTime() - new Date(firstRestaurant.savedAt).getTime()
      );
  }

  // Reads saved restaurants for the active localStorage scope.
  private readSavedRestaurants(scopeKey: string): SavedRestaurant[] {
    try {
      const storage = this.readStorage();
      return this.sanitiseSavedRestaurants(storage.lists[scopeKey]);
    } catch (error) {
      console.warn('SavedRestaurantsService: Could not read saved restaurants', error);
      return [];
    }
  }

  // Writes the current saved list to localStorage and publishes it to subscribers.
  private persistSavedRestaurants(restaurants: SavedRestaurant[]): void {
    if (!this.activeScopeKey) return;

    const sortedRestaurants = [...restaurants].sort((firstRestaurant, secondRestaurant) =>
      new Date(secondRestaurant.savedAt).getTime() - new Date(firstRestaurant.savedAt).getTime()
    );
    try {
      const storage = this.readStorage();
      storage.lists[this.activeScopeKey] = sortedRestaurants;
      this.writeStorage(storage);
    } catch (error) {
      console.warn('SavedRestaurantsService: Could not persist saved restaurants', error);
    }
    this.savedRestaurantsSubject.next(sortedRestaurants);
  }

  // Converts a full restaurant record into the compact local saved shape.
  private buildSavedRestaurant(restaurant: Partial<Restaurant> & { id?: string }): SavedRestaurant | null {
    if (!restaurant.id) return null;
    return {
      id: restaurant.id,
      Name_EN: restaurant.Name_EN ?? null,
      Name_TC: restaurant.Name_TC ?? null,
      ImageUrl: restaurant.ImageUrl ?? null,
      District_EN: restaurant.District_EN ?? null,
      District_TC: restaurant.District_TC ?? null,
      Address_EN: restaurant.Address_EN ?? null,
      Address_TC: restaurant.Address_TC ?? null,
      savedAt: new Date().toISOString()
    };
  }

  // Returns the latest saved list snapshot for synchronous template helper methods.
  public get currentSavedRestaurants(): SavedRestaurant[] {
    return this.savedRestaurantsSubject.value;
  }

  // Returns true when the current account context can use local saved restaurants.
  public get canUseSavedRestaurants(): boolean {
    return this.canUseSavedRestaurantsSubject.value;
  }

  // Returns true when a restaurant ID is already saved locally.
  public isRestaurantSaved(restaurantId: string | null | undefined): boolean {
    if (!restaurantId || !this.canUseSavedRestaurants) return false;
    return this.currentSavedRestaurants.some(restaurant => restaurant.id === restaurantId);
  }

  // Saves or refreshes a restaurant in localStorage and returns true when it is saved.
  public saveRestaurant(restaurant: Partial<Restaurant> & { id?: string }): boolean {
    if (!this.canUseSavedRestaurants || !this.activeScopeKey) return false;
    const savedRestaurant = this.buildSavedRestaurant(restaurant);
    if (!savedRestaurant) return false;
    const remainingRestaurants = this.currentSavedRestaurants.filter(item => item.id !== savedRestaurant.id);
    this.persistSavedRestaurants([savedRestaurant, ...remainingRestaurants]);
    return true;
  }

  // Removes a restaurant from localStorage and returns true when an item was removed.
  public removeRestaurant(restaurantId: string): boolean {
    if (!this.canUseSavedRestaurants || !this.activeScopeKey) return false;
    const currentRestaurants = this.currentSavedRestaurants;
    const nextRestaurants = currentRestaurants.filter(restaurant => restaurant.id !== restaurantId);
    if (nextRestaurants.length === currentRestaurants.length) return false;
    this.persistSavedRestaurants(nextRestaurants);
    return true;
  }

  // Toggles the saved state for a restaurant and returns the new saved state.
  public toggleRestaurant(restaurant: Partial<Restaurant> & { id?: string }): boolean {
    if (!restaurant.id || !this.canUseSavedRestaurants) return false;
    if (this.isRestaurantSaved(restaurant.id)) {
      this.removeRestaurant(restaurant.id);
      return false;
    }
    return this.saveRestaurant(restaurant);
  }

  // Removes every local saved restaurant entry.
  public clearSavedRestaurants(): void {
    if (!this.canUseSavedRestaurants || !this.activeScopeKey) return;
    this.persistSavedRestaurants([]);
  }
}
