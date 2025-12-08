import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Service to manage visibility state of chat components
 * Ensures only one chat interface (Chat or Gemini) is visible at a time
 */
@Injectable({
  providedIn: 'root'
})
export class ChatVisibilityService {
  private chatButtonOpenSubject = new BehaviorSubject<boolean>(false);
  private geminiButtonOpenSubject = new BehaviorSubject<boolean>(false);

  public chatButtonOpen$: Observable<boolean> = this.chatButtonOpenSubject.asObservable();
  public geminiButtonOpen$: Observable<boolean> = this.geminiButtonOpenSubject.asObservable();

  constructor() { }

  /**
   * Sets the open state of the Chat button
   * Automatically closes Gemini button if opening Chat
   */
  setChatButtonOpen(isOpen: boolean): void {
    this.chatButtonOpenSubject.next(isOpen);
    if (isOpen) {
      this.geminiButtonOpenSubject.next(false);
    }
  }

  /**
   * Sets the open state of the Gemini button
   * Automatically closes Chat button if opening Gemini
   */
  setGeminiButtonOpen(isOpen: boolean): void {
    this.geminiButtonOpenSubject.next(isOpen);
    if (isOpen) {
      this.chatButtonOpenSubject.next(false);
    }
  }

  /**
   * Gets current state of Chat button
   */
  get isChatButtonOpen(): boolean {
    return this.chatButtonOpenSubject.value;
  }

  /**
   * Gets current state of Gemini button
   */
  get isGeminiButtonOpen(): boolean {
    return this.geminiButtonOpenSubject.value;
  }
}
