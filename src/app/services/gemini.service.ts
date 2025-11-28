import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { DataService } from './data.service';

// Chat history entry interface
export interface ChatHistoryEntry {
  role: 'user' | 'model';
  parts: string;
}

// AI response interface matching actual API response
export interface GeminiResponse {
  result: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  history?: Array<{
    role: string;
    parts: Array<{ text: string }>;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  // Chat history for maintaining conversation context
  private readonly chatHistory = new BehaviorSubject<ChatHistoryEntry[]>([]);
  public chatHistory$ = this.chatHistory.asObservable();

  // Loading state
  private readonly isLoading = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.isLoading.asObservable();

  constructor(
    private readonly dataService: DataService,
    private readonly authService: AuthService // Inject authentication service
  ) {
    console.log('GeminiService: Initialised');
  }

  /**
   * Send a chat message to Gemini AI
   * @param message - User message text
   * @param includeHistory - Whether to include conversation history
   */
  chat(message: string, includeHistory: boolean = true): Observable<string> {
    this.isLoading.next(true);
    const body: any = { message };

    if (includeHistory) {
      body.history = this.chatHistory.value;
    }
    console.log('GeminiService: Sending chat request', { message, historyLength: body.history?.length || 0 });

    // Pass null since no authentication is required
    return this.dataService.post<GeminiResponse>('/API/Gemini/chat', body, null).pipe(
      map(response => {
        console.log('GeminiService: Raw API response:', response);
        return response.result || '';
      }),
      tap(result => {
        // Add user message and model response to chat history
        const history = this.chatHistory.value;
        history.push({ role: 'user', parts: message });
        history.push({ role: 'model', parts: result });
        this.chatHistory.next(history);
        this.isLoading.next(false);
        console.log('GeminiService: Response received, history length:', history.length);
      }),
      catchError(error => {
        console.error('GeminiService: Error in chat request', error);
        this.isLoading.next(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Generate text content from a prompt
   * @param prompt - Text generation prompt
   */
  generate(prompt: string): Observable<string> {
    this.isLoading.next(true);
    console.log('GeminiService: Generating text from prompt');

    return this.dataService.post<GeminiResponse>('/API/Gemini/generate', { prompt }, null).pipe(
      map(response => {
        console.log('GeminiService: Generate API response:', response);
        return response.result || '';
      }),
      tap(() => {
        this.isLoading.next(false);
        console.log('GeminiService: Text generated successfully');
      }),
      catchError(error => {
        console.error('GeminiService: Error in generate request', error);
        this.isLoading.next(false);
        return throwError(() => error);
      })
    );
  }

  /**
   * Generate restaurant description
   * @param restaurantName - Name of the restaurant
   * @param cuisine - Type of cuisine
   * @param specialties - Restaurant specialties
   * @param atmosphere - Restaurant atmosphere
   */
  generateRestaurantDescription(
    restaurantName: string,
    cuisine?: string,
    specialties?: string[],
    atmosphere?: string
  ): Observable<string> {
    this.isLoading.next(true);

    const body = {
      restaurantName,
      cuisine,
      specialties,
      atmosphere
    };
    console.log('GeminiService: Generating restaurant description');

    return this.dataService.post<GeminiResponse>('/API/Gemini/restaurant-description', body, null).pipe(
      map(response => {
        console.log('GeminiService: Restaurant description API response:', response);
        return response.result || '';
      }),
      tap(() => {
        this.isLoading.next(false);
        console.log('GeminiService: Restaurant description generated');
      }),
      catchError(error => {
        console.error('GeminiService: Error in restaurant description request', error);
        this.isLoading.next(false);
        return throwError(() => error);
      })
    );
  }

  // Clear chat history
  clearHistory(): void {
    this.chatHistory.next([]);
    console.log('GeminiService: Chat history cleared');
  }

  // Get current chat history
  getHistory(): ChatHistoryEntry[] {
    return this.chatHistory.value;
  }

  // Quick helper for common restaurant-related questions
  askAboutRestaurant(question: string, restaurantName?: string): Observable<string> {
    const prompt = restaurantName
      ? `Question about ${restaurantName}: ${question}`
      : question;

    return this.chat(prompt, true);
  }

  // Get dining recommendations
  getDiningRecommendation(preferences: {
    cuisine?: string;
    location?: string;
    priceRange?: string;
    occasion?: string;
  }): Observable<string> {
    const parts = [];
    if (preferences.cuisine) parts.push(`cuisine: ${preferences.cuisine}`);
    if (preferences.location) parts.push(`location: ${preferences.location}`);
    if (preferences.priceRange) parts.push(`price range: ${preferences.priceRange}`);
    if (preferences.occasion) parts.push(`occasion: ${preferences.occasion}`);

    const prompt = `I'm looking for restaurant recommendations with the following preferences: ${parts.join(', ')}. Can you help me?`;

    return this.chat(prompt, false);
  }

  // Ask about booking or reservation
  askAboutBooking(question: string): Observable<string> {
    const prompt = `Question about restaurant booking: ${question}`;
    return this.chat(prompt, true);
  }

  //` Get menu suggestions
  getMenuSuggestions(dietaryRestrictions?: string[]): Observable<string> {
    const prompt = dietaryRestrictions && dietaryRestrictions.length > 0
      ? `I have the following dietary restrictions: ${dietaryRestrictions.join(', ')}. What menu items would you recommend?`
      : `What are some popular menu items you would recommend?`;

    return this.chat(prompt, true);
  }
}
