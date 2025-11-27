import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { UserService, UserProfile } from '../../services/user.service';
import { LanguageService } from '../../services/language.service';
import { AlertController, LoadingController, ModalController, ToastController } from '@ionic/angular';
import { Subscription, combineLatest } from 'rxjs';
import { ProfileModalComponent } from './profile-modal.component';

@Component({
  selector: 'app-user',
  templateUrl: './user.page.html',
  styleUrls: ['./user.page.scss'],
  standalone: false,
})
export class UserPage implements OnInit, OnDestroy {
  // Current user authentication data
  public user: User | null = null;
  // Current user profile data from Firestore
  public profile: UserProfile | null = null;
  // Loading state
  public isLoading: boolean = true;
  // Default placeholder image
  public readonly defaultPhoto: string = 'assets/icon/Placeholder.png';
  // Language observable for bilingual content
  public lang$ = this.languageService.lang$;

  // Comprehensive translations
  public translations = {
    profile: { EN: 'Profile', TC: '個人資料' },
    verified: { EN: 'Verified', TC: '已驗證' },
    notVerified: { EN: 'Not Verified', TC: '未驗證' },
    loadingProfile: { EN: 'Loading profile...', TC: '正在載入個人資料...' },
    accountType: { EN: 'Account Type', TC: '帳戶類型' },
    diner: { EN: 'Diner', TC: '食客' },
    restaurant: { EN: 'Restaurant', TC: '商戶' },
    bio: { EN: 'Bio', TC: '簡介' },
    noBio: { EN: 'No bio yet', TC: '尚未填写简介' },
    contactInfo: { EN: 'Contact Information', TC: '聯絡資訊' },
    email: { EN: 'Email', TC: '電子郵件' },
    phone: { EN: 'Phone', TC: '電話' },
    noPhone: { EN: 'Not provided', TC: '未提供' },
    statistics: { EN: 'Statistics', TC: '統計資訊' },
    memberSince: { EN: 'Member Since', TC: '註冊日期' },
    totalLogins: { EN: 'Total Logins', TC: '登入次數' },
    lastLogin: { EN: 'Last Login', TC: '最後登入' },
    preferences: { EN: 'Preferences', TC: '偏好設定' },
    language: { EN: 'Language', TC: '語言' },
    theme: { EN: 'Theme', TC: '主題' },
    light: { EN: 'Light', TC: '淺色' },
    dark: { EN: 'Dark', TC: '深色' },
    notifications: { EN: 'Notifications', TC: '通知' },
    enabled: { EN: 'Enabled', TC: '已啟用' },
    disabled: { EN: 'Disabled', TC: '已停用' },
    editProfile: { EN: 'Edit Profile', TC: '編輯個人資料' },
    logout: { EN: 'Logout', TC: '登出' },
    confirmLogout: { EN: 'Confirm Logout', TC: '確認登出' },
    confirmLogoutMessage: { EN: 'Are you sure you want to log out?', TC: '您確定要登出嗎？' },
    cancel: { EN: 'Cancel', TC: '取消' },
    loggingOut: { EN: 'Logging out...', TC: '正在登出...' },
    deleteAccount: { EN: 'Delete Account', TC: '刪除帳戶' },
    confirmDelete: { EN: 'Delete Account', TC: '刪除帳戶' },
    confirmDeleteMessage: { EN: 'Are you sure you want to delete your account? This action cannot be undone.', TC: '您確定要刪除帳戶嗎？此操作無法撤銷。' },
    delete: { EN: 'Delete', TC: '刪除' },
    deletingMessage: { EN: 'Deleting your account', TC: '正在刪除您的帳戶' }
  };

  // Subscriptions for cleanup
  private subscriptions: Subscription[] = [];

  // Flag to ensure we only show the mandatory modal once per page enter
  private hasShownProfilePrompt = false;

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly languageService: LanguageService,
    private readonly router: Router,
    private readonly alertController: AlertController,
    private readonly loadingController: LoadingController,
    private readonly modalController: ModalController,
    private readonly toastController: ToastController
  ) { }

  ngOnInit(): void {
    // Subscribe to both authentication and profile data
    const combinedSubscription = combineLatest([
      this.authService.currentUser$,
      this.userService.currentProfile$
    ]).subscribe(([user, profile]) => {
      this.user = user;
      this.profile = profile;
      this.isLoading = false;

      // If no user is logged in, redirect to login page
      if (!user) {
        this.router.navigate(['/login']);
        return;
      }
    });

    this.subscriptions.push(combinedSubscription);
  }

  // Ionic page lifecycle: called when the view is about to enter and become active
  public async ionViewWillEnter(): Promise<void> {
    // Only check once per navigation to avoid repeated prompts
    if (this.hasShownProfilePrompt) return;

    if (!this.user) {
      // No user to check
      console.debug('UserPage: ionViewWillEnter() - no user');
      return;
    }

    // Fetch latest profile from API to ensure we have up-to-date info
    this.userService.getUserProfile(this.user.uid).subscribe((profile) => {
      this.profile = profile;
      
      console.debug('UserPage: Profile fetched on page enter', {
        uid: this.user?.uid,
        hasProfile: !!profile,
        hasType: !!profile?.type,
        type: profile?.type
      });

      // Only show modal if profile is missing OR profile has no type set
      // If profile exists AND has a type, user has already completed setup
      if (!this.profile || !this.profile.type) {
        console.debug('UserPage: Profile incomplete - opening modal', {
          reason: !this.profile ? 'no profile' : 'no type'
        });
        this.hasShownProfilePrompt = true;
        this.openProfileModal(true);
      } else {
        console.debug('UserPage: Profile complete - not opening modal');
      }
    }, (err) => {
      console.error('UserPage: Error fetching profile on enter', err);
    });
  }

  // Reset flag when leaving the view so the prompt can appear again on next enter
  public ionViewDidLeave(): void {
    this.hasShownProfilePrompt = false;
  }

  ngOnDestroy(): void {
    // Clean up all subscriptions to prevent memory leaks
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  // Open profile editing modal
  public async openProfileModal(isFirstTime: boolean = false): Promise<void> {
    const modal = await this.modalController.create({
      component: ProfileModalComponent,
      componentProps: {
        profile: this.profile,
        isFirstTime: isFirstTime
      },
      backdropDismiss: !isFirstTime, // Prevent dismissal on first-time setup
      cssClass: 'profile-modal'
    });

    await modal.present();

    // Handle modal dismissal
    const { data } = await modal.onWillDismiss();
    if (data?.updated && this.user?.uid) {
      // Reload profile from service to get fresh data
      this.userService.getUserProfile(this.user.uid).subscribe();
    }
  }

  // Handle logout
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
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: this.translations.loggingOut[lang],
              spinner: null
            });
            await loading.present();

            try {
              await this.authService.logout();
            } catch (error) {
              console.error('UserPage: Logout error:', error);
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // Handle account deletion
  public async onDeleteAccount(): Promise<void> {
    const lang = this.getCurrentLanguage();
    const alert = await this.alertController.create({
      header: this.translations.confirmDelete[lang],
      message: this.translations.confirmDeleteMessage[lang],
      buttons: [
        {
          text: this.translations.cancel[lang],
          role: 'cancel'
        },
        {
          text: this.translations.delete[lang],
          role: 'destructive',
          handler: async () => {
            if (!this.user?.uid) return;

            const loadingMessage = this.translations.deletingMessage[lang] || 'Deleting your account...'; // Fallback message
            const loading = await this.loadingController.create({
              message: loadingMessage,
              spinner: null
            });
            await loading.present();

            try {
              await this.userService.deleteUserProfile(this.user.uid).toPromise();
              await this.authService.logout();
            } catch (error: any) {
              console.error('UserPage: Error deleting account:', error);
              await this.showToast(error.message || 'Failed to delete account', 'danger');
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // Helper to get current language value
  private getCurrentLanguage(): 'EN' | 'TC' {
    const currentLang = (this.languageService as any)._lang.value;
    return currentLang || 'EN';
  }

  // Show toast message
  private async showToast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }

  // Get display photo URL
  public get photoURL(): string {
    return this.profile?.photoURL || this.user?.photoURL || this.defaultPhoto;
  }

  // Get display name
  public get displayName(): string {
    return this.profile?.displayName || this.user?.displayName || this.user?.email || 'User';
  }

  // Get user type display
  public get userTypeDisplay(): string {
    if (!this.profile?.type) return '';
    const lang = this.getCurrentLanguage();
    return this.profile.type === 'Diner'
      ? this.translations.diner[lang]
      : this.translations.restaurant[lang];
  }

  // Get formatted member since date
  public get memberSince(): string {
    if (!this.profile?.createdAt) return 'Unknown';
    try {
      const date = this.profile.createdAt.toDate?.() || new Date(this.profile.createdAt);
      return date.toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  }

  // Get formatted last login date
  public get lastLogin(): string {
    if (!this.profile?.lastLoginAt) return 'Never';
    try {
      const date = new Date(this.profile.lastLoginAt);
      return date.toLocaleString();
    } catch {
      return 'Unknown';
    }
  }
}