import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { UserService, UserProfile } from '../../services/user.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: false,
})
export class ChatPage implements OnInit, OnDestroy {
  // Language stream
  lang$ = this.languageService.lang$;

  // User profile
  userProfile: UserProfile | null = null;
  isLoading = true;

  // Cleanup
  private destroy$ = new Subject<void>();

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly languageService: LanguageService
  ) {}

  ngOnInit() {
    this.loadUserProfile();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load current user profile to determine user type
   */
  private loadUserProfile(): void {
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (!user) {
        this.isLoading = false;
        this.userProfile = null;
        return;
      }

      // Get user profile
      this.userService.getUserProfile(user.uid).pipe(takeUntil(this.destroy$)).subscribe({
        next: (profile: UserProfile | null) => {
          this.userProfile = profile;
          this.isLoading = false;
          console.log('ChatPage: User profile loaded:', profile?.type);
        },
        error: (err) => {
          console.error('ChatPage: Error loading user profile', err);
          this.isLoading = false;
          this.userProfile = null;
        }
      });
    });
  }

  /**
   * Check if user is a diner (customer)
   */
  isDiner(): boolean {
    return this.userProfile?.type?.toLowerCase() === 'diner';
  }

  /**
   * Check if user is a restaurant owner
   */
  isRestaurant(): boolean {
    return this.userProfile?.type?.toLowerCase() === 'restaurant';
  }
}
