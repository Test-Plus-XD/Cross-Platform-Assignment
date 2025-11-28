import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { GeminiService } from '../../services/gemini.service';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-gemini-button',
  templateUrl: './gemini-button.component.html',
  styleUrls: ['./gemini-button.component.scss'],
  standalone: false
})
export class GeminiButtonComponent implements OnInit, OnDestroy {
  // Chat state
  isOpen = false;
  messages: Message[] = [];
  newMessage = '';
  isLoading = false;
  isDimmed = false;

  // Visibility
  isVisible = true;
  isLoggedIn = false;

  // Language
  lang$ = this.languageService.lang$;
  currentLang: 'EN' | 'TC' = 'EN';

  // Auto-dim
  private dimTimeout: any;
  private readonly dimDelay = 3000; // 3 seconds of inactivity

  // Cleanup
  private destroy$ = new Subject<void>();

  // Quick suggestions
  suggestions = [
    { key: 'booking', en: 'How do I make a booking?', tc: '如何預約？' },
    { key: 'cancel', en: 'How do I cancel a booking?', tc: '如何取消預約？' },
    { key: 'menu', en: 'What dishes do you recommend?', tc: '有什麼推薦菜式？' },
    { key: 'location', en: 'How do I find restaurants near me?', tc: '如何找到附近的餐廳？' }
  ];

  // Translations
  translations = {
    welcome: {
      EN: 'Hello! I\'m your PourRice AI assistant. How can I help you today?',
      TC: '你好！我是 PourRice AI 助理。今天我能為您提供什麼幫助？'
    },
    cleared: {
      EN: 'Chat cleared. How can I help you?',
      TC: '對話已清除。我能為您提供什麼幫助？'
    },
    error: {
      EN: 'Sorry, I encountered an error. Please try again.',
      TC: '抱歉，發生錯誤。請重試。'
    }
  };

  constructor(
    private readonly geminiService: GeminiService,
    private readonly authService: AuthService,
    private readonly languageService: LanguageService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to language changes
    this.lang$.pipe(takeUntil(this.destroy$)).subscribe(lang => {
      this.currentLang = lang === 'TC' ? 'TC' : 'EN';

      // Update welcome message if it's the only message
      if (this.messages.length === 1 && this.messages[0].role === 'assistant') {
        this.messages[0].content = this.translations.welcome[this.currentLang];
      }
    });

    // Subscribe to auth state
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.isLoggedIn = !!user;
    });

    // Subscribe to loading state
    this.geminiService.isLoading$.pipe(takeUntil(this.destroy$)).subscribe(loading => {
      this.isLoading = loading;
    });

    // Check current route and update visibility
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.updateVisibility();
      });

    // Initial visibility check
    this.updateVisibility();

    // Start auto-dim timer
    this.startDimTimer();

    // Add welcome message based on current language
    const initialLang = this.currentLang;
    this.messages.push({
      role: 'assistant',
      content: this.translations.welcome[initialLang],
      timestamp: new Date()
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.dimTimeout) {
      clearTimeout(this.dimTimeout);
    }
  }

  /**
   * Update visibility based on current route
   */
  private updateVisibility(): void {
    const currentUrl = this.router.url;
    // Hide on login page
    this.isVisible = !currentUrl.includes('/login');
  }

  /**
   * Start auto-dim timer
   */
  private startDimTimer(): void {
    if (this.dimTimeout) {
      clearTimeout(this.dimTimeout);
    }

    this.dimTimeout = setTimeout(() => {
      if (!this.isOpen) {
        this.isDimmed = true;
      }
    }, this.dimDelay);
  }

  /**
   * Reset auto-dim timer on user activity
   */
  @HostListener('document:mousemove')
  @HostListener('document:keypress')
  @HostListener('document:click')
  onUserActivity(): void {
    this.isDimmed = false;
    this.startDimTimer();
  }

  /**
   * Toggle chat window
   */
  toggleChat(): void {
    // Check if user is logged in
    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }

    this.isOpen = !this.isOpen;
    this.isDimmed = false;

    if (this.isOpen) {
      setTimeout(() => this.scrollToBottom(), 100);
    } else {
      this.startDimTimer();
    }
  }

  /**
   * Send message to Gemini
   */
  async sendMessage(message?: string): Promise<void> {
    const messageToSend = message || this.newMessage.trim();

    if (!messageToSend || this.isLoading) return;

    // Add user message
    this.messages.push({
      role: 'user',
      content: messageToSend,
      timestamp: new Date()
    });

    this.newMessage = '';
    setTimeout(() => this.scrollToBottom(), 100);

    // Get AI response
    this.geminiService.chat(messageToSend, true).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.messages.push({
          role: 'assistant',
          content: response,
          timestamp: new Date()
        });
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (error) => {
        console.error('GeminiButton: Error getting response', error);
        this.messages.push({
          role: 'assistant',
          content: this.translations.error[this.currentLang],
          timestamp: new Date()
        });
      }
    });
  }

  /**
   * Send suggestion
   */
  sendSuggestion(suggestion: any): void {
    const lang = (this.languageService as any)._lang.value || 'EN';
    const message = lang === 'TC' ? suggestion.tc : suggestion.en;
    this.sendMessage(message);
  }

  /**
   * Clear chat history
   */
  clearChat(): void {
    this.messages = [
      {
        role: 'assistant',
        content: this.translations.cleared[this.currentLang],
        timestamp: new Date()
      }
    ];
    this.geminiService.clearHistory();
  }

  /**
   * Scroll chat to bottom
   */
  private scrollToBottom(): void {
    const messageList = document.querySelector('.gemini-messages');
    if (messageList) {
      messageList.scrollTop = messageList.scrollHeight;
    }
  }

  /**
   * Format timestamp based on language
   */
  formatTime(timestamp: Date): string {
    const locale = this.currentLang === 'TC' ? 'zh-HK' : 'en-US';
    return timestamp.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Convert markdown-like formatting to HTML
   * Supports: line breaks, bold, headers, bullet points
   */
  formatMarkdown(content: string): string {
    if (!content) return '';

    let formatted = content;

    // Convert ## headers to bold text
    formatted = formatted.replace(/^## (.+)$/gm, '<strong>$1</strong>');
    formatted = formatted.replace(/^### (.+)$/gm, '<strong>$1</strong>');

    // Convert **bold** to <strong>
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Convert bullet points (* or -) to proper list items
    formatted = formatted.replace(/^[\*\-] (.+)$/gm, '• $1');

    // Convert numbered lists
    formatted = formatted.replace(/^\d+\.\s+(.+)$/gm, (match, p1) => {
      return match.replace(p1, p1);
    });

    // Convert double line breaks to paragraphs
    formatted = formatted.replace(/\n\n/g, '<br/><br/>');

    // Convert single line breaks to <br/>
    formatted = formatted.replace(/\n/g, '<br/>');

    return formatted;
  }
}
