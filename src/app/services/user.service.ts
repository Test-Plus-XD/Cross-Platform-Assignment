import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:3000';
  private authToken: string | null = null;

  constructor(private http: HttpClient) { }

  // Store the auth token for future API calls
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  // Clear auth token
  clearAuthToken(): void {
    this.authToken = null;
  }

  // Create user record in backend
  async createUserRecord(userData: { uid: string; email: string | null; displayName: string | null; photoURL?: string | null; }): Promise<any> {
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${this.authToken}` });
    return this.http.post(`${this.apiUrl}/API/Users`, userData, { headers }).toPromise();
  }

  // Update or fetch user record (example)
  async getUserRecord(uid: string): Promise<any> {
    const headers = new HttpHeaders({ 'Authorization': `Bearer ${this.authToken}` });
    return this.http.get(`${this.apiUrl}/API/Users/${uid}`, { headers }).toPromise();
  }
}