// Service to manage GPS location and distance calculations
// Provides location retrieval with permission handling and Haversine distance formula
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

// Interface for geographical coordinates
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
}

// Interface for distance result with formatted display
export interface DistanceResult {
  distanceKm: number;
  distanceMeters: number;
  displayText: string;
  isNearby: boolean; // Within 2km is considered nearby
}

// Permission status type
export type LocationPermissionStatus = 'granted' | 'denied' | 'prompt' | 'unavailable';

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  // Current user location
  private currentLocationSubject = new BehaviorSubject<Coordinates | null>(null);
  public currentLocation$: Observable<Coordinates | null> = this.currentLocationSubject.asObservable();
  // Permission status
  private permissionStatusSubject = new BehaviorSubject<LocationPermissionStatus>('prompt');
  public permissionStatus$: Observable<LocationPermissionStatus> = this.permissionStatusSubject.asObservable();
  // Loading state
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$: Observable<boolean> = this.isLoadingSubject.asObservable();
  // Error state
  private errorSubject = new BehaviorSubject<string | null>(null);
  public error$: Observable<string | null> = this.errorSubject.asObservable();
  // Earth radius in kilometres for Haversine formula
  private readonly EARTH_RADIUS_KM = 6371;
  // Threshold for considering a location as nearby (in kilometres)
  private readonly NEARBY_THRESHOLD_KM = 2;

  constructor() {
    console.log('LocationService: Initialised');
    // Check initial permission status
    this.checkPermissionStatus();
  }

  /**
   * Check the current permission status for geolocation.
   * Uses the Permissions API if available, falls back to checking navigator.geolocation.
   */
  async checkPermissionStatus(): Promise<LocationPermissionStatus> {
    try {
      // Check if geolocation is available
      if (!navigator.geolocation) {
        console.warn('LocationService: Geolocation is not supported');
        this.permissionStatusSubject.next('unavailable');
        return 'unavailable';
      }

      // Use Permissions API if available
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        const status = permission.state as LocationPermissionStatus;
        console.log('LocationService: Permission status:', status);
        this.permissionStatusSubject.next(status);

        // Listen for permission changes
        permission.addEventListener('change', () => {
          const newStatus = permission.state as LocationPermissionStatus;
          console.log('LocationService: Permission changed to:', newStatus);
          this.permissionStatusSubject.next(newStatus);
        });

        return status;
      }

      // Fallback: assume prompt is needed
      console.log('LocationService: Permissions API not available, assuming prompt');
      this.permissionStatusSubject.next('prompt');
      return 'prompt';
    } catch (error) {
      console.error('LocationService: Error checking permission:', error);
      this.permissionStatusSubject.next('prompt');
      return 'prompt';
    }
  }

  /**
   * Request location permission from the user.
   * This triggers the browser's permission dialog.
   */
  async requestPermission(): Promise<boolean> {
    try {
      console.log('LocationService: Requesting permission');
      this.isLoadingSubject.next(true);
      this.errorSubject.next(null);

      // Request location to trigger permission prompt
      const position = await this.getCurrentPositionAsync();
      
      if (position) {
        this.permissionStatusSubject.next('granted');
        console.log('LocationService: Permission granted');
        return true;
      }

      return false;
    } catch (error: any) {
      console.error('LocationService: Permission request failed:', error);
      
      if (error.code === GeolocationPositionError.PERMISSION_DENIED) {
        this.permissionStatusSubject.next('denied');
        this.errorSubject.next('Location permission denied. Please enable location access in your browser settings.');
      } else {
        this.errorSubject.next('Failed to get location permission.');
      }
      
      return false;
    } finally {
      this.isLoadingSubject.next(false);
    }
  }

  /**
   * Get the current GPS location.
   * Returns cached location if available and recent (within 5 minutes).
   */
  getCurrentLocation(forceRefresh: boolean = false): Observable<Coordinates | null> {
    const cached = this.currentLocationSubject.getValue();
    const now = Date.now();
    const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

    // Return cached location if valid and not forcing refresh
    if (cached && !forceRefresh && cached.timestamp && (now - cached.timestamp) < CACHE_DURATION_MS) {
      console.log('LocationService: Returning cached location');
      return of(cached);
    }

    console.log('LocationService: Fetching current location');
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return from(this.getCurrentPositionAsync()).pipe(
      tap(coords => {
        if (coords) {
          this.currentLocationSubject.next(coords);
          console.log('LocationService: Location updated:', coords);
        }
        this.isLoadingSubject.next(false);
      }),
      catchError(error => {
        console.error('LocationService: Error getting location:', error);
        this.handleGeolocationError(error);
        this.isLoadingSubject.next(false);
        return of(null);
      })
    );
  }

  /**
   * Async wrapper for the Geolocation API's getCurrentPosition.
   */
  private getCurrentPositionAsync(): Promise<Coordinates | null> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          resolve(coords);
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, // 10 seconds
          maximumAge: 60000 // 1 minute cache
        }
      );
    });
  }

  /**
   * Calculate the distance between two coordinates using the Haversine formula.
   * Returns distance in kilometres.
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    // Convert degrees to radians
    const toRadians = (degrees: number) => degrees * (Math.PI / 180);

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = this.EARTH_RADIUS_KM * c;

    return distance;
  }

  /**
   * Calculate distance from current location to a target location.
   * Returns a DistanceResult object with formatted display text.
   */
  calculateDistanceFromCurrentLocation(
    targetLat: number,
    targetLon: number
  ): DistanceResult | null {
    const currentLocation = this.currentLocationSubject.getValue();
    
    if (!currentLocation) {
      console.warn('LocationService: No current location available for distance calculation');
      return null;
    }

    const distanceKm = this.calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      targetLat,
      targetLon
    );

    const distanceMeters = distanceKm * 1000;
    const isNearby = distanceKm <= this.NEARBY_THRESHOLD_KM;

    // Format display text based on distance
    let displayText: string;
    if (distanceKm < 1) {
      displayText = `${Math.round(distanceMeters)}m`;
    } else if (distanceKm < 10) {
      displayText = `${distanceKm.toFixed(1)}km`;
    } else {
      displayText = `${Math.round(distanceKm)}km`;
    }

    return {
      distanceKm,
      distanceMeters,
      displayText,
      isNearby
    };
  }

  /**
   * Get distance colour based on proximity.
   * Used for visual indicators in the UI.
   */
  getDistanceColour(distanceKm: number): string {
    if (distanceKm <= 1) {
      return 'success'; // Green - very close
    } else if (distanceKm <= 3) {
      return 'primary'; // Blue - nearby
    } else if (distanceKm <= 5) {
      return 'warning'; // Yellow - moderate distance
    } else {
      return 'medium'; // Grey - far
    }
  }

  /**
   * Sort an array of items by distance from current location.
   * Items must have latitude and longitude properties.
   */
  sortByDistance<T extends { Latitude?: number | null; Longitude?: number | null }>(
    items: T[]
  ): T[] {
    const currentLocation = this.currentLocationSubject.getValue();
    
    if (!currentLocation) {
      console.warn('LocationService: No current location for sorting');
      return items;
    }

    return [...items].sort((a, b) => {
      // Handle items without coordinates
      if (!a.Latitude || !a.Longitude) return 1;
      if (!b.Latitude || !b.Longitude) return -1;

      const distanceA = this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        a.Latitude,
        a.Longitude
      );

      const distanceB = this.calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        b.Latitude,
        b.Longitude
      );

      return distanceA - distanceB;
    });
  }

  /**
   * Watch position for continuous updates (useful for real-time tracking).
   * Returns a cleanup function to stop watching.
   */
  watchPosition(callback: (coords: Coordinates) => void): () => void {
    if (!navigator.geolocation) {
      console.error('LocationService: Geolocation is not supported');
      return () => {};
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
        this.currentLocationSubject.next(coords);
        callback(coords);
      },
      (error) => {
        this.handleGeolocationError(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10000
      }
    );

    console.log('LocationService: Started watching position, ID:', watchId);

    // Return cleanup function
    return () => {
      navigator.geolocation.clearWatch(watchId);
      console.log('LocationService: Stopped watching position');
    };
  }

  /**
   * Handle geolocation errors and update error state.
   */
  private handleGeolocationError(error: GeolocationPositionError): void {
    let message: string;

    switch (error.code) {
      case GeolocationPositionError.PERMISSION_DENIED:
        message = 'Location permission denied. Please enable location access in your browser settings.';
        this.permissionStatusSubject.next('denied');
        break;
      case GeolocationPositionError.POSITION_UNAVAILABLE:
        message = 'Location information is unavailable. Please try again later.';
        break;
      case GeolocationPositionError.TIMEOUT:
        message = 'Location request timed out. Please try again.';
        break;
      default:
        message = 'An unknown error occurred while getting your location.';
    }

    console.error('LocationService: Geolocation error:', message);
    this.errorSubject.next(message);
  }

  // Getter for current location synchronously
  get currentLocationValue(): Coordinates | null {
    return this.currentLocationSubject.getValue();
  }

  // Getter for permission status synchronously
  get permissionStatusValue(): LocationPermissionStatus {
    return this.permissionStatusSubject.getValue();
  }

  // Check if location is available
  get hasLocation(): boolean {
    return this.currentLocationSubject.getValue() !== null;
  }

  // Check if geolocation is supported
  get isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  // Clear current location
  clearLocation(): void {
    this.currentLocationSubject.next(null);
    this.errorSubject.next(null);
    console.log('LocationService: Location cleared');
  }
}
