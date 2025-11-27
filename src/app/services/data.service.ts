import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly apiUrl = environment.apiUrl;
  private readonly apiPasscode = 'PourRice';

  constructor(
    private readonly http: HttpClient
  ) {
    console.log('DataService: Initialised with API URL:', this.apiUrl);
  }

  /**
   * Build HTTP headers with API passcode and optional authentication token.
   * @param authToken - Optional Firebase authentication token to include
   */
  private getHeaders(authToken?: string | null): HttpHeaders {
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json',
      'x-api-passcode': this.apiPasscode
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    return new HttpHeaders(headers);
  }

  /**
   * GET request
   * @param endpoint - API endpoint path (e.g., '/API/Restaurants')
   * @param authToken - Optional authentication token to include in headers
   */
  get<T>(endpoint: string, authToken?: string | null): Observable<T> {
    const url = `${this.apiUrl}${endpoint}`;
    const headers = this.getHeaders(authToken);
    console.log('DataService: GET', url);

    return this.http.get<T>(url, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * POST request
   * @param endpoint - API endpoint path
   * @param body - Request body
   * @param authToken - Optional authentication token to include in headers
   */
  post<T>(endpoint: string, body: any, authToken?: string | null): Observable<T> {
    const url = `${this.apiUrl}${endpoint}`;
    const headers = this.getHeaders(authToken);
    console.log('DataService: POST', url);

    return this.http.post<T>(url, body, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * PUT request
   * @param endpoint - API endpoint path
   * @param body - Request body
   * @param authToken - Optional authentication token to include in headers
   */
  put<T>(endpoint: string, body: any, authToken?: string | null): Observable<T> {
    const url = `${this.apiUrl}${endpoint}`;
    const headers = this.getHeaders(authToken);
    console.log('DataService: PUT', url);

    return this.http.put<T>(url, body, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * DELETE request
   * @param endpoint - API endpoint path
   * @param authToken - Optional authentication token to include in headers
   */
  delete<T>(endpoint: string, authToken?: string | null): Observable<T> {
    const url = `${this.apiUrl}${endpoint}`;
    const headers = this.getHeaders(authToken);
    console.log('DataService: DELETE', url);

    return this.http.delete<T>(url, { headers }).pipe(
      catchError(this.handleError)
    );
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