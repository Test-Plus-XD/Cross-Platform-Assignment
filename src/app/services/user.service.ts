import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, from, throwError, of } from 'rxjs';
import { catchError, map, tap, switchMap, retry } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// User profile interface matching Firestore schema
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  // Additional profile fields
  phoneNumber?: string | null;
  type?: string | null;
  reviews?: string | null;
  restaurant?: string | null;
  restaurantId?: string | null;
  bio?: string | null;
  preferences?: {
    language?: 'EN' | 'TC';
    theme?: 'light' | 'dark';
    notifications?: boolean;
  };
  // Metadata
  createdAt?: any;
  modifiedAt?: any;
  lastLoginAt?: any;
  loginCount?: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly apiUrl = `${environment.apiUrl}/API/Users`;
  private authToken: string | null = null;
  // Cache current user profile
  private currentProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentProfile$: Observable<UserProfile | null> = this.currentProfileSubject.asObservable();

  constructor(private readonly httpClient: HttpClient) {
    console.log('UserService: Initialised with API URL:', this.apiUrl);
  }

  // Store authentication token for API calls
  setAuthToken(token: string): void {
    this.authToken = token;
    console.log('UserService: Auth token set, length:', token.length);
  }

  // Clear authentication token
  clearAuthToken(): void {
    this.authToken = null;
    this.currentProfileSubject.next(null);
    console.log('UserService: Auth token cleared');
  }

  // Get HTTP headers with authentication
  private getHeaders(): HttpHeaders {
    const headers: { [key: string]: string} = {
      'Content-Type': 'application/json',
      'x-api-passcode': 'PourRice'
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
      console.log('UserService: Headers prepared with auth token');
    } else {
      console.warn('UserService: No auth token available for request headers');
    }

    return new HttpHeaders(headers);
  }

  /**
   * Create user profile in Firestore via the API.
   * This method includes retry logic because the first attempt after authentication
   * might fail if the token hasn't fully propagated through Firebase's systems.
   */
  createUserProfile(profileData: Partial<UserProfile>): Observable<{ id: string }> {
    // Validate required fields
    if (!profileData.uid && !profileData.email) {
      console.error('UserService: Cannot create profile without uid or email', profileData);
      return throwError(() => new Error('uid or email is required'));
    }

    console.log('UserService: Creating profile for uid:', profileData.uid);
    console.log('UserService: Profile data:', JSON.stringify(profileData, null, 2));

    return this.httpClient.post<{ id: string }>(
      this.apiUrl,
      profileData,
      { headers: this.getHeaders() }
    ).pipe(
      // Retry once after a short delay if the first attempt fails
      // This handles cases where the token needs a moment to propagate
      retry({ count: 1, delay: 1000 }),
      tap(response => {
        console.log('UserService: Profile created successfully with ID:', response.id);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('UserService: Error creating profile');
        console.error('UserService: Status:', error.status);
        console.error('UserService: Status text:', error.statusText);
        console.error('UserService: Error body:', error.error);
        console.error('UserService: Full error:', error);
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Sanitize image URL to handle backend em dash replacement.
   * The backend replaces null/undefined with '—' (em dash), which causes 404 errors.
   * This helper returns null for invalid URLs so components can use their placeholder logic.
   */
  private sanitizeImageUrl(url: any): string | null {
    if (!url || url === '—' || url === '' || url === 'null' || url === 'undefined') {
      return null;
    }
    return url;
  }

  /**
   * Get user profile by UID from the API.
   * This method returns null if the profile doesn't exist (404), which is expected
   * for new users who haven't had their profile created yet.
   */
  getUserProfile(uid: string): Observable<UserProfile | null> {
    if (!uid) {
      console.error('UserService: Cannot fetch profile without uid');
      return throwError(() => new Error('UID is required'));
    }

    console.log('UserService: Fetching profile for uid:', uid);

    return this.httpClient.get<UserProfile>(
      `${this.apiUrl}/${encodeURIComponent(uid)}`,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => {
        console.log('UserService: Profile fetched successfully:', response);
        const profile: UserProfile = {
          uid: response.uid || uid,
          email: response.email || null,
          displayName: response.displayName || null,
          photoURL: this.sanitizeImageUrl(response.photoURL),
          emailVerified: response.emailVerified || false,
          createdAt: response.createdAt,
          modifiedAt: response.modifiedAt,
          phoneNumber: response.phoneNumber || null,
          bio: response.bio || null,
          preferences: response.preferences || {},
          lastLoginAt: response.lastLoginAt,
          loginCount: response.loginCount || 0,
          type: response.type || null, // Ensure 'type' is mapped correctly
          restaurantId: response.restaurantId || null // FIXED: Missing restaurantId mapping
        };
        console.log('UserService: Profile mapped with restaurantId:', profile.restaurantId);
        this.currentProfileSubject.next(profile);
        return profile;
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) {
          console.log('UserService: Profile not found (404) for uid:', uid);
          // Return null for non-existent profiles, this is expected for new users
          return of(null);
        }
        console.error('UserService: Error fetching profile:', error);
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Update user profile with partial data.
   * Only the fields provided in the updates object will be modified.
   */
  updateUserProfile(uid: string, updates: Partial<UserProfile>): Observable<void> {
    if (!uid) {
      console.error('UserService: Cannot update profile without uid');
      return throwError(() => new Error('UID is required'));
    }

    console.log('UserService: Updating profile for uid:', uid);
    console.log('UserService: Updates:', JSON.stringify(updates, null, 2));

    // Remove fields that shouldn't be updated
    const sanitisedUpdates = { ...updates };
    delete sanitisedUpdates.uid;
    delete sanitisedUpdates.createdAt;

    return this.httpClient.put<void>(
      `${this.apiUrl}/${encodeURIComponent(uid)}`,
      sanitisedUpdates,
      { headers: this.getHeaders() }
    ).pipe(
      tap(() => {
        console.log('UserService: Profile updated successfully for uid:', uid);
        // Update cached profile
        const currentProfile = this.currentProfileSubject.value;
        if (currentProfile && currentProfile.uid === uid) {
          this.currentProfileSubject.next({ ...currentProfile, ...sanitisedUpdates });
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('UserService: Error updating profile:', error);
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Delete user profile from Firestore.
   * Note: This only deletes the Firestore document, not the Firebase Auth account.
   */
  deleteUserProfile(uid: string): Observable<void> {
    if (!uid) {
      console.error('UserService: Cannot delete profile without uid');
      return throwError(() => new Error('UID is required'));
    }

    console.log('UserService: Deleting profile for uid:', uid);

    return this.httpClient.delete<void>(
      `${this.apiUrl}/${encodeURIComponent(uid)}`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(() => {
        console.log('UserService: Profile deleted successfully for uid:', uid);
        this.currentProfileSubject.next(null);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('UserService: Error deleting profile:', error);
        return throwError(() => this.handleError(error));
      })
    );
  }

  // Get all users (public metadata only)
  getAllUsers(): Observable<UserProfile[]> {
    console.log('UserService: Fetching all users');

    return this.httpClient.get<{ count: number; data: UserProfile[] }>(
      this.apiUrl,
      { headers: this.getHeaders() }
    ).pipe(
      map(response => {
        console.log('UserService: Fetched', response.count, 'users');
        // Sanitize photoURL for each user
        return (response.data || []).map(user => ({
          ...user,
          photoURL: this.sanitizeImageUrl(user.photoURL)
        }));
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('UserService: Error fetching all users:', error);
        return throwError(() => this.handleError(error));
      })
    );
  }

  /**
   * Update last login timestamp and increment login count.
   * This should be called after successful authentication to track user activity.
   */
  updateLoginMetadata(uid: string): Observable<void> {
    console.log('UserService: Updating login metadata for uid:', uid);
    
    const currentProfile = this.currentProfileSubject.value;
    const loginCount = (currentProfile?.loginCount || 0) + 1;

    return this.updateUserProfile(uid, {
      lastLoginAt: new Date().toISOString(),
      loginCount: loginCount
    });
  }

  // Update user preferences
  updatePreferences(uid: string, preferences: Partial<UserProfile['preferences']>): Observable<void> {
    console.log('UserService: Updating preferences for uid:', uid);
    
    const currentProfile = this.currentProfileSubject.value;
    const updatedPreferences = {
      ...currentProfile?.preferences,
      ...preferences
    };

    return this.updateUserProfile(uid, { preferences: updatedPreferences });
  }

  /**
   * Check if user profile exists in Firestore.
   * This is useful before attempting to create a profile to avoid conflicts.
   */
  profileExists(uid: string): Observable<boolean> {
    console.log('UserService: Checking if profile exists for uid:', uid);
    
    return this.getUserProfile(uid).pipe(
      map(profile => {
        const exists = profile !== null;
        console.log('UserService: Profile exists:', exists);
        return exists;
      }),
      catchError((error) => {
        console.error('UserService: Error checking profile existence:', error);
        // If we get an error checking, assume it doesn't exist
        return of(false);
      })
    );
  }

  // Get cached profile synchronously
  get currentProfile(): UserProfile | null {
    return this.currentProfileSubject.value;
  }

  // Clear cached profile
  clearCache(): void {
    this.currentProfileSubject.next(null);
    console.log('UserService: Cache cleared');
  }

  /**
   * Handle HTTP errors and return user-friendly error messages.
   * This method translates technical HTTP errors into messages users can understand.
   */
  private handleError(error: HttpErrorResponse): Error {
    let message = 'An error occurred whilst accessing user data';

    // Log the full error for debugging
    console.error('UserService: HTTP Error Details:');
    console.error('- Status:', error.status);
    console.error('- Status Text:', error.statusText);
    console.error('- URL:', error.url);
    console.error('- Error Object:', error.error);

    // Try to extract error message from server response
    if (error.error?.error) {
      message = error.error.error;
    } else if (error.message) {
      message = error.message;
    }

    // Provide specific messages for common HTTP status codes
    switch (error.status) {
      case 0:
        message = 'Cannot connect to server. Please check your internet connection.';
        break;
      case 401:
        message = 'Unauthorised: Please log in again';
        break;
      case 403:
        message = 'Forbidden: You do not have permission to perform this action';
        break;
      case 404:
        message = 'User profile not found';
        break;
      case 409:
        message = 'User profile already exists';
        break;
      case 500:
        message = 'Server error: Please try again later';
        break;
    }
    return new Error(message);
  }
}