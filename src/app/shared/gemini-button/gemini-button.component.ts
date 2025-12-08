import { Component, OnInit, OnDestroy, HostListener, Input } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, Observable } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { GeminiService } from '../../services/gemini.service';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { ChatVisibilityService } from '../../services/chat-visibility.service';
import { RestaurantsService, Restaurant, MenuItem } from '../../services/restaurants.service';

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

  // Chat visibility
  chatButtonOpen$: Observable<boolean>;

  // Auto-dim
  private dimTimeout: any;
  private readonly dimDelay = 3000; // 3 seconds of inactivity

  // Cleanup
  private destroy$ = new Subject<void>();

  // Current route tracking
  private currentRoute = '';
  private currentRestaurantId: string | null = null;
  private currentRestaurant: Restaurant | null = null;
  private currentMenu: MenuItem[] = [];

  // Quick suggestions - base suggestions that always appear
  private baseSuggestions = [
    { key: 'booking', en: 'How do I make a booking?', tc: '如何預約？' },
    { key: 'cancel', en: 'How do I cancel a booking?', tc: '如何取消預約？' },
    { key: 'location', en: 'How do I find restaurants near me?', tc: '如何找到附近的餐廳？' }
  ];

  // Context-specific suggestions that appear based on current page
  private restaurantPageSuggestion = [
    { key: 'menu', en: 'What is on the menu?', tc: '菜單上有什麼？' }
  ];

  // Computed suggestions array that combines base and context-specific suggestions
  suggestions: Array<{ key: string; en: string; tc: string }> = [];

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
    private readonly chatVisibilityService: ChatVisibilityService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly restaurantsService: RestaurantsService,
    private readonly sanitizer: DomSanitizer
  ) {
    this.chatButtonOpen$ = this.chatVisibilityService.chatButtonOpen$;
  }

  ngOnInit(): void {
    // Subscribe to language changes
    this.lang$.pipe(takeUntil(this.destroy$)).subscribe(lang => {
      this.currentLang = lang === 'TC' ? 'TC' : 'EN';

      // Update welcome message if it is the only message
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
        this.updateSuggestions();
        this.loadRestaurantContext();
      });

    // Initial visibility check
    this.updateVisibility();
    this.updateSuggestions();
    this.loadRestaurantContext();

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

  /// Update visibility based on current route
  private updateVisibility(): void {
    const currentUrl = this.router.url;
    this.currentRoute = currentUrl;
    // Hide on login page
    this.isVisible = !currentUrl.includes('/login');
  }

  /// Update suggestions based on current route context
  private updateSuggestions(): void {
    // Start with base suggestions
    this.suggestions = [...this.baseSuggestions];

    // Add restaurant-specific suggestion if on restaurant detail page
    if (this.currentRoute.includes('/restaurant/')) {
      this.suggestions = [...this.baseSuggestions, ...this.restaurantPageSuggestion];
    }
  }

  /// Load restaurant context when on restaurant page
  private loadRestaurantContext(): void {
    // Check if we are on a restaurant detail page
    const restaurantMatch = this.currentRoute.match(/\/restaurant\/([^/?]+)/);

    if (restaurantMatch && restaurantMatch[1]) {
      const restaurantId = restaurantMatch[1];

      // Only load if this is a different restaurant
      if (this.currentRestaurantId !== restaurantId) {
        this.currentRestaurantId = restaurantId;

        // Load restaurant details
        this.restaurantsService.getRestaurantById(restaurantId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (restaurant) => {
              this.currentRestaurant = restaurant;
              console.log('GeminiButton: Loaded restaurant context:', restaurant?.Name_EN);
            },
            error: (err) => {
              console.error('GeminiButton: Error loading restaurant:', err);
              this.currentRestaurant = null;
            }
          });

        // Load menu items
        this.restaurantsService.getMenuItems(restaurantId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (menu) => {
              this.currentMenu = menu;
              console.log('GeminiButton: Loaded menu context:', menu.length, 'items');
            },
            error: (err) => {
              console.error('GeminiButton: Error loading menu:', err);
              this.currentMenu = [];
            }
          });
      }
    } else {
      // Clear context when not on restaurant page
      this.currentRestaurantId = null;
      this.currentRestaurant = null;
      this.currentMenu = [];
    }
  }

  /// Start auto-dim timer
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

  /// Reset auto-dim timer on user activity
  @HostListener('document:mousemove')
  @HostListener('document:keypress')
  @HostListener('document:click')
  onUserActivity(): void {
    this.isDimmed = false;
    this.startDimTimer();
  }

  /// Toggle chat window
  toggleChat(): void {
    this.isOpen = !this.isOpen;
    this.isDimmed = false;

    // Update visibility service
    this.chatVisibilityService.setGeminiButtonOpen(this.isOpen);

    if (this.isOpen) {
      setTimeout(() => this.scrollToBottom(), 100);
    } else {
      this.startDimTimer();
    }
  }

  /// Send message to Gemini with restaurant context
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

    // Build context string if on restaurant page
    let contextMessage = messageToSend;

    if (this.currentRestaurant && this.currentMenu.length > 0) {
      // Build restaurant context
      const restaurantName = this.currentLang === 'TC'
        ? (this.currentRestaurant.Name_TC || this.currentRestaurant.Name_EN || 'Unknown')
        : (this.currentRestaurant.Name_EN || this.currentRestaurant.Name_TC || 'Unknown');

      const restaurantDistrict = this.currentLang === 'TC'
        ? (this.currentRestaurant.District_TC || this.currentRestaurant.District_EN || '')
        : (this.currentRestaurant.District_EN || this.currentRestaurant.District_TC || '');

      // Build menu context with items
      const menuItems = this.currentMenu.map(item => {
        const itemName = this.currentLang === 'TC'
          ? (item.Name_TC || item.Name_EN || 'Unknown')
          : (item.Name_EN || item.Name_TC || 'Unknown');

        const itemDescription = this.currentLang === 'TC'
          ? (item.Description_TC || item.Description_EN || '')
          : (item.Description_EN || item.Description_TC || '');

        const priceText = item.Price ? `$${item.Price}` : '';

        return `- ${itemName}${priceText ? ' (' + priceText + ')' : ''}${itemDescription ? ': ' + itemDescription : ''}`;
      }).join('\n');

      // Add context to the message
      contextMessage = `[CONTEXT: User is currently viewing ${restaurantName}${restaurantDistrict ? ' in ' + restaurantDistrict : ''}. 

Menu items available:
${menuItems}

END OF CONTEXT]

User question: ${messageToSend}`;
    }

    // Get AI response
    this.geminiService.chat(contextMessage, true).pipe(takeUntil(this.destroy$)).subscribe({
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

  /// Send suggestion
  sendSuggestion(suggestion: any): void {
    const lang = (this.languageService as any)._lang.value || 'EN';
    const message = lang === 'TC' ? suggestion.tc : suggestion.en;
    this.sendMessage(message);
  }

  /// Clear chat history
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

  /// Scroll chat to bottom
  private scrollToBottom(): void {
    const messageList = document.querySelector('.gemini-messages');
    if (messageList) {
      messageList.scrollTop = messageList.scrollHeight;
    }
  }

  /// Format timestamp based on language
  formatTime(timestamp: Date): string {
    const locale = this.currentLang === 'TC' ? 'zh-HK' : 'en-UK';
    return timestamp.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }

  /// Convert markdown-like formatting to HTML
  /// Supports line breaks, bold text, headers, and bullet points
  formatMarkdown(content: string): SafeHtml {
    if (!content) return this.sanitizer.bypassSecurityTrustHtml('');
    let formatted = content;
    // Convert ## headers to bold text
    formatted = formatted.replace(/^## (.+)$/gm, '<strong>$1</strong>');
    formatted = formatted.replace(/^### (.+)$/gm, '<strong>$1</strong>');
    // Convert **bold** to <strong>
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Convert bullet points (* or -) to proper list items
    formatted = formatted.replace(/^[\*\-] (.+)$/gm, '• $1');
    // Convert double line breaks to paragraphs
    formatted = formatted.replace(/\n\n/g, '<br/><br/>');
    // Convert single line breaks to <br/>
    formatted = formatted.replace(/\n/g, '<br/>');
    // Convert numbered lists
    formatted = formatted.replace(/^\d+\.\s+(.+)$/gm, (match, p1) => {
      return match.replace(p1, p1);
    });
    // Bypass security to allow HTML rendering
    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }
}