import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly apiUrl = environment.apiUrl;
  private readonly apiPasscode = 'PourRice';

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService
  ) {
    console.log('DataService: Initialised with API URL:', this.apiUrl);
  }

  /**
   * Build HTTP headers with API passcode and optional authentication token.
   * @param includeAuth - Whether to include Firebase authentication token
   */
  private async getHeaders(includeAuth: boolean = false): Promise<HttpHeaders> {
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json',
      'x-api-passcode': this.apiPasscode
    };

    if (includeAuth) {
      const token = await this.authService.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        console.warn('DataService: Auth requested but no token available');
      }
    }

    return new HttpHeaders(headers);
  }

  /**
   * GET request
   * @param endpoint - API endpoint path (e.g., '/API/Restaurants')
   * @param requireAuth - Whether authentication is required
   */
  get<T>(endpoint: string, requireAuth: boolean = false): Observable<T> {
    return new Observable(observer => {
      this.getHeaders(requireAuth).then(headers => {
        const url = `${this.apiUrl}${endpoint}`;
        console.log('DataService: GET', url);

        this.http.get<T>(url, { headers }).pipe(
          catchError(this.handleError)
        ).subscribe({
          next: (data) => {
            observer.next(data);
            observer.complete();
          },
          error: (err) => observer.error(err)
        });
      }).catch(err => observer.error(err));
    });
  }

  /**
   * POST request
   * @param endpoint - API endpoint path
   * @param body - Request body
   * @param requireAuth - Whether authentication is required
   */
  post<T>(endpoint: string, body: any, requireAuth: boolean = false): Observable<T> {
    return new Observable(observer => {
      this.getHeaders(requireAuth).then(headers => {
        const url = `${this.apiUrl}${endpoint}`;
        console.log('DataService: POST', url);

        this.http.post<T>(url, body, { headers }).pipe(
          catchError(this.handleError)
        ).subscribe({
          next: (data) => {
            observer.next(data);
            observer.complete();
          },
          error: (err) => observer.error(err)
        });
      }).catch(err => observer.error(err));
    });
  }

  /**
   * PUT request
   * @param endpoint - API endpoint path
   * @param body - Request body
   * @param requireAuth - Whether authentication is required
   */
  put<T>(endpoint: string, body: any, requireAuth: boolean = false): Observable<T> {
    return new Observable(observer => {
      this.getHeaders(requireAuth).then(headers => {
        const url = `${this.apiUrl}${endpoint}`;
        console.log('DataService: PUT', url);

        this.http.put<T>(url, body, { headers }).pipe(
          catchError(this.handleError)
        ).subscribe({
          next: (data) => {
            observer.next(data);
            observer.complete();
          },
          error: (err) => observer.error(err)
        });
      }).catch(err => observer.error(err));
    });
  }

  /**
   * DELETE request
   * @param endpoint - API endpoint path
   * @param requireAuth - Whether authentication is required
   */
  delete<T>(endpoint: string, requireAuth: boolean = false): Observable<T> {
    return new Observable(observer => {
      this.getHeaders(requireAuth).then(headers => {
        const url = `${this.apiUrl}${endpoint}`;
        console.log('DataService: DELETE', url);

        this.http.delete<T>(url, { headers }).pipe(
          catchError(this.handleError)
        ).subscribe({
          next: (data) => {
            observer.next(data);
            observer.complete();
          },
          error: (err) => observer.error(err)
        });
      }).catch(err => observer.error(err));
    });
  }

  /**
   * Handle HTTP errors and return user-friendly error messages.
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let message = 'An error occurred';

    console.error('DataService: HTTP Error:', {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      error: error.error
    });

    // Extract error message from server response
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
      case 400:
        message = error.error?.error || 'Invalid request data.';
        break;
      case 401:
        message = 'Unauthorised: Please log in again.';
        break;
      case 403:
        message = 'Forbidden: You do not have permission for this action.';
        break;
      case 404:
        message = 'Resource not found.';
        break;
      case 409:
        message = 'Conflict: Resource already exists.';
        break;
      case 500:
        message = 'Server error: Please try again later.';
        break;
    }

    return throwError(() => new Error(message));
  }
}
