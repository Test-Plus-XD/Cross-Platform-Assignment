import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { AlertController, LoadingController } from '@ionic/angular';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-user',
  templateUrl: './user.page.html',
  styleUrls: ['./user.page.scss'],
  standalone: false,
})
export class UserPage implements OnInit, OnDestroy {
  // Current user data
  public user: User | null = null;

  // Default placeholder image
  public readonly defaultPhoto: string = 'assets/icon/Placeholder.png';

  // Language observable
  public lang$ = this.languageService.lang$;

  // Translations
  public translations = {
    userID: { EN: 'User ID', TC: '用戶 ID' },
    verified: { EN: 'Verified', TC: '已驗證' },
    notVerified: { EN: 'Not Verified', TC: '未驗證' },
    loadingProfile: { EN: 'Loading profile...', TC: '正在載入個人資料...' },
    confirmLogout: { EN: 'Confirm Logout', TC: '確認登出' },
    confirmLogoutMessage: { EN: 'Are you sure you want to log out?', TC: '您確定要登出嗎？' },
    cancel: { EN: 'Cancel', TC: '取消' },
    logout: { EN: 'Logout', TC: '登出' },
    loggingOut: { EN: 'Logging out...', TC: '正在登出...' },
  };

  // Subscription to auth state
  private authSubscription: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private languageService: LanguageService,
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) { }

  ngOnInit(): void {
    // Subscribe to authentication state changes
    this.authSubscription = this.authService.currentUser$.subscribe((user: User | null) => {
      this.user = user;

      // If no user is logged in, redirect to login page
      if (!user) {
        this.router.navigate(['/login']);
      }
    });
  }

  ngOnDestroy(): void {
    // Clean up subscription to prevent memory leaks
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  // Helper to get current language value
  private getCurrentLanguage(): 'EN' | 'TC' {
    const currentLang = (this.languageService as any)._lang.value;
    return currentLang || 'EN';
  }

  // Handle logout button click
  public async onLogout(): Promise<void> {
    const lang = this.getCurrentLanguage();
    const alert = await this.alertController.create({
      header: this.translations.confirmLogout[lang],
      message: this.translations.confirmLogoutMessage[lang],
      buttons: [
        {
          text: this.translations.cancel[lang],
          role: 'cancel'
        },
        {
          text: this.translations.logout[lang],
          handler: async () => {
            const loading = await this.loadingController.create({
              message: this.translations.loggingOut[lang],
              spinner: 'crescent'
            });
            await loading.present();

            try {
              await this.authService.logout();
            } catch (error) {
              console.error('Logout error:', error);
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // Get the user's display photo URL or return placeholder
  public get photoURL(): string {
    return this.user?.photoURL || this.defaultPhoto;
  }

  // Get the user's display name or return email
  public get displayName(): string {
    return this.user?.displayName || this.user?.email || 'User';
  }
}