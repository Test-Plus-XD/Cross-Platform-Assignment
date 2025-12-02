import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { UserService, UserProfile } from '../../services/user.service';
import { LanguageService } from '../../services/language.service';
import { PlatformService } from '../../services/platform.service';
import { AlertController, LoadingController, ModalController, ToastController } from '@ionic/angular';
import { Subscription, combineLatest, Observable } from 'rxjs';
import { ProfileModalComponent } from './profile-modal.component';

@Component({
  selector: 'app-user',
  templateUrl: './user.page.html',
  styleUrls: ['./user.page.scss'],
  standalone: false,
})
export class UserPage implements OnInit, OnDestroy {
  // Current user authentication data is stored
  public user: User | null = null;
  // Current user profile data from Firestore is stored
  public profile: any = null;
  // Loading state is tracked
  public isLoading: boolean = true;
  // Editing state is tracked
  public isEditing: boolean = false;
  // Default placeholder image
  public readonly defaultPhoto: string = './User.png';
  // Language and platform observables are exposed
  public lang$ = this.languageService.lang$;
  public isMobile$: Observable<boolean>;
  // Edited values are stored during editing mode
  public editedDisplayName: string = '';
  public editedPhoneNumber: string = '';
  public editedBio: string = '';
  public editedType: string | null = null;
  public editedPreferences: { language: 'EN' | 'TC'; theme: 'light' | 'dark'; notifications: boolean } = { language: 'EN', theme: 'light', notifications: false };
  // Comprehensive translations are provided
  public translations = {
    profile: { EN: 'Profile', TC: '個人資料' },
    verified: { EN: 'Verified', TC: '已驗證' },
    notVerified: { EN: 'Not Verified', TC: '未驗證' },
    loadingProfile: { EN: 'Loading profile...', TC: '正在載入個人資料...' },
    accountType: { EN: 'Account Type', TC: '帳戶類型' },
    diner: { EN: 'Diner', TC: '食客' },
    restaurant: { EN: 'Restaurant', TC: '商戶' },
    bio: { EN: 'Bio', TC: '簡介' },
    noBio: { EN: 'No bio yet', TC: '尚未填寫簡介' },
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
    saveChanges: { EN: 'Save Changes', TC: '儲存變更' },
    saving: { EN: 'Saving...', TC: '儲存中...' },
    logout: { EN: 'Logout', TC: '登出' },
    confirmLogout: { EN: 'Confirm Logout', TC: '確認登出' },
    confirmLogoutMessage: { EN: 'Are you sure you want to log out?', TC: '您確定要登出嗎？' },
    cancel: { EN: 'Cancel', TC: '取消' },
    loggingOut: { EN: 'Logging out...', TC: '正在登出...' },
    deleteAccount: { EN: 'Delete Account', TC: '刪除帳戶' },
    confirmDelete: { EN: 'Delete Account', TC: '刪除帳戶' },
    confirmDeleteMessage: { EN: 'Are you sure you want to delete your account? This action cannot be undone.', TC: '您確定要刪除帳戶嗎?此操作無法撤銷。' },
    delete: { EN: 'Delete', TC: '刪除' },
    deletingMessage: { EN: 'Deleting your account', TC: '正在刪除您的帳戶' },
    personalInfo: { EN: 'Personal Information', TC: '個人資料' },
    accountStatus: { EN: 'Account Status', TC: '帳戶狀態' },
    displayName: { EN: 'Display Name', TC: '顯示名稱' },
    phoneNumber: { EN: 'Phone Number', TC: '電話號碼' },
    selectType: { EN: 'Select Account Type', TC: '選擇帳戶類型' },
    selectLanguage: { EN: 'Select Language', TC: '選擇語言' },
    selectTheme: { EN: 'Select Theme', TC: '選擇主題' },
    english: { EN: 'English', TC: 'English' },
    traditionalChinese: { EN: 'Traditional Chinese', TC: '繁體中文' },
    enableNotifications: { EN: 'Enable Notifications', TC: '啟用通知' },
    createdAt: { EN: 'Created', TC: '建立日期' },
    modifiedAt: { EN: 'Modified', TC: '修改日期' },
    daysActive: { EN: 'Days Active', TC: '帳戶天數' },
    actions: { EN: 'Actions', TC: '操作' },
    profileUpdated: { EN: 'Profile updated successfully', TC: '個人資料更新成功' },
    updateFailed: { EN: 'Failed to update profile', TC: '更新個人資料失敗' },
    typeRequired: { EN: 'Please select account type', TC: '請選擇帳戶類型' },
    invalidData: { EN: 'Invalid data', TC: '資料無效' },
  };
  // Subscriptions are tracked for cleanup
  private subscriptions: Subscription[] = [];
  // Flag to ensure modal is only shown once per page entry is maintained
  private hasShownProfilePrompt = false;

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly languageService: LanguageService,
    private readonly platformService: PlatformService,
    private readonly router: Router,
    private readonly alertController: AlertController,
    private readonly loadingController: LoadingController,
    private readonly modalController: ModalController,
    private readonly toastController: ToastController
  ) {
    this.isMobile$ = this.platformService.isMobile$;
  }

  // Component lifecycle hook is called when component is initialised
  ngOnInit(): void {
    // Combined subscription to both authentication and profile data is created
    const combinedSubscription = combineLatest([
      this.authService.currentUser$,
      this.userService.currentProfile$
    ]).subscribe(([user, profile]) => {
      this.user = user;
      this.profile = profile;
      this.isLoading = false;
      // Redirect to login page is performed if no user is logged in
      if (!user) { this.router.navigate(['/login']); return; }
      // Ensure edited fields reflect loaded profile
      this.editedDisplayName = this.profile?.displayName || '';
      this.editedPhoneNumber = this.profile?.phoneNumber || '';
      this.editedBio = this.profile?.bio || '';
      this.editedType = this.profile?.type || null;
      this.editedPreferences = {
        language: this.profile?.preferences?.language || this.editedPreferences.language,
        theme: this.profile?.preferences?.theme || this.editedPreferences.theme,
        notifications: typeof this.profile?.preferences?.notifications === 'boolean'
          ? this.profile.preferences.notifications
          : this.editedPreferences.notifications
      };
    });
    this.subscriptions.push(combinedSubscription);
  }

  // Format a modifiedAt value (supports Firestore Timestamp with toDate(), Date, string)
  formatModifiedAt(value: any): string {
    if (!value) return 'N/A';
    try {
      // If Firestore Timestamp object that has toDate()
      if (typeof value?.toDate === 'function') {
        const date = value.toDate();
        return date instanceof Date ? date.toLocaleString() : new Date(date).toLocaleString();
      }
      // If already a Date instance
      if (value instanceof Date) return value.toLocaleString();
      // Try parsing strings / numbers
      const date = new Date(value);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleString();
    } catch {
      return 'N/A';
    }
  }

  // Flag is reset when leaving view so prompt can appear again on next entry
  public ionViewDidLeave(): void { this.hasShownProfilePrompt = false; }

  // Component cleanup is performed when component is destroyed
  ngOnDestroy(): void { this.subscriptions.forEach(subscription => subscription.unsubscribe()); }

  // Ionic page lifecycle hook is called when view is about to enter and become active
  /// COMMENTED OUT: Profile modal callback is disabled to use inline editing instead
  /*
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
  */
  // Profile editing modal is opened
  // COMMENTED OUT: Modal usage is replaced with inline editing
  /*
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
  */

  // Edit mode is started with current user data
  public startEditing(): void {
    if (!this.profile) return;
    this.editedDisplayName = this.profile.displayName || '';
    this.editedPhoneNumber = this.profile.phoneNumber || '';
    this.editedBio = this.profile.bio || '';
    this.editedType = this.profile.type || '';
    this.editedPreferences = {
      language: this.profile.preferences?.language || 'EN',
      theme: this.profile.preferences?.theme || 'light',
      notifications: this.profile.preferences?.notifications ?? true
    };
    this.isEditing = true;
  }

  // Editing is cancelled and temporary values are discarded
  public cancelEditing(): void {
    this.isEditing = false;
    this.editedDisplayName = this.profile?.displayName || '';
    this.editedPhoneNumber = this.profile?.phoneNumber || '';
    this.editedBio = this.profile?.bio || '';
    this.editedType = this.profile?.type || null;
    this.editedPreferences = {
      language: this.profile?.preferences?.language || this.editedPreferences.language,
      theme: this.profile?.preferences?.theme || this.editedPreferences.theme,
      notifications: typeof this.profile?.preferences?.notifications === 'boolean'
        ? this.profile.preferences.notifications
        : this.editedPreferences.notifications
    };
  }

  // All edited fields are saved
  public async saveChanges(): Promise<void> {
    if (!this.user?.uid) return;
    // Type validation is performed
    if (!this.editedType || this.editedType.trim() === '') {
      await this.showToast(this.getCurrentTranslation(this.translations.typeRequired), 'warning');
      return;
    }
    // Loading indicator is displayed
    const loading = await this.loadingController.create({ message: this.getCurrentTranslation(this.translations.saving), spinner: 'crescent' });
    await loading.present();
    try {
      // Updates object is prepared with all changed fields
      const updates: Partial<UserProfile> = {
        displayName: this.editedDisplayName.trim() || this.profile?.displayName,
        phoneNumber: this.editedPhoneNumber.trim() || null,
        bio: this.editedBio.trim() || null,
        type: this.editedType,
        preferences: this.editedPreferences
      };
      // Profile is updated via user service
      await this.userService.updateUserProfile(this.user.uid, updates).toPromise();
      // Success message is displayed
      await this.showToast(this.getCurrentTranslation(this.translations.profileUpdated), 'success');
      // Edit mode is exited
      this.isEditing = false;
      // Fresh profile data is reloaded
      this.userService.getUserProfile(this.user.uid).subscribe();
    } catch (error) {
      console.error('UserPage: Error saving changes:', error);
      await this.showToast(this.getCurrentTranslation(this.translations.updateFailed), 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // Type selection alert is shown
  public async showTypeSelector(): Promise<void> {
    const lang = this.getCurrentLanguage();
    const alert = await this.alertController.create({
      header: this.translations.selectType[lang],
      inputs: [
        { type: 'radio', label: this.translations.diner[lang], value: 'Diner', checked: this.editedType === 'Diner' },
        { type: 'radio', label: this.translations.restaurant[lang], value: 'Restaurant', checked: this.editedType === 'Restaurant' }
      ],
      buttons: [
        { text: this.translations.cancel[lang], role: 'cancel' },
        { text: 'OK', handler: (value: string) => { this.editedType = value; } }
      ]
    });
    await alert.present();
  }

  // Preferences editor alert is shown
  public async showPreferencesEditor(): Promise<void> {
    const lang = this.getCurrentLanguage();
    const alert = await this.alertController.create({
      header: this.translations.preferences[lang],
      inputs: [
        { type: 'radio', label: this.translations.english[lang], value: 'EN', checked: this.editedPreferences.language === 'EN' },
        { type: 'radio', label: this.translations.traditionalChinese[lang], value: 'TC', checked: this.editedPreferences.language === 'TC' }
      ],
      buttons: [
        { text: this.translations.cancel[lang], role: 'cancel' },
        { text: 'OK', handler: (selectedLanguage: string) => { this.editedPreferences.language = selectedLanguage as 'EN' | 'TC'; } }
      ]
    });
    await alert.present();
  }

  // Theme selector alert is shown
  public async showThemeSelector(): Promise<void> {
    const lang = this.getCurrentLanguage();
    const alert = await this.alertController.create({
      header: this.translations.selectTheme[lang],
      inputs: [
        { type: 'radio', label: this.translations.light[lang], value: 'light', checked: this.editedPreferences.theme === 'light' },
        { type: 'radio', label: this.translations.dark[lang], value: 'dark', checked: this.editedPreferences.theme === 'dark' }
      ],
      buttons: [
        { text: this.translations.cancel[lang], role: 'cancel' },
        { text: 'OK', handler: (selectedTheme: string) => { this.editedPreferences.theme = selectedTheme as 'light' | 'dark'; } }
      ]
    });
    await alert.present();
  }

  // Notifications toggle is handled
  public toggleNotifications(): void { this.editedPreferences.notifications = !this.editedPreferences.notifications; }

  // Logout is handled
  public async onLogout(): Promise<void> {
    const lang = this.getCurrentLanguage();
    const alert = await this.alertController.create({
      header: this.translations.confirmLogout[lang],
      message: this.translations.confirmLogoutMessage[lang],
      buttons: [
        { text: this.translations.cancel[lang], role: 'cancel' },
        {
          text: this.translations.logout[lang],
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({ message: this.translations.loggingOut[lang], spinner: null });
            await loading.present();
            try { await this.authService.logout(); } catch (error) { console.error('UserPage: Logout error:', error); } finally { await loading.dismiss(); }
          }
        }
      ]
    });
    await alert.present();
  }

  // Account deletion is handled
  public async onDeleteAccount(): Promise<void> {
    const lang = this.getCurrentLanguage();
    const alert = await this.alertController.create({
      header: this.translations.confirmDelete[lang],
      message: this.translations.confirmDeleteMessage[lang],
      buttons: [
        { text: this.translations.cancel[lang], role: 'cancel' },
        {
          text: this.translations.delete[lang],
          role: 'destructive',
          handler: async () => {
            if (!this.user?.uid) return;
            const loadingMessage = this.translations.deletingMessage[lang] || 'Deleting your account...';
            const loading = await this.loadingController.create({ message: loadingMessage, spinner: null });
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

  // Current language value is retrieved as helper method
  public getCurrentLanguage(): 'EN' | 'TC' {
    const currentLang = (this.languageService as any)._lang?.value;
    return (currentLang === 'TC') ? 'TC' : 'EN';
  }

  // Current translation is retrieved as helper method
  public getCurrentTranslation(translationObject: { EN: string; TC: string }): string {
    const currentLang = this.getCurrentLanguage();
    return translationObject[currentLang];
  }

  // Toast message is shown
  private async showToast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const toast = await this.toastController.create({ message: message, duration: 3000, position: 'bottom', color: color });
    await toast.present();
  }

  // Display photo URL is retrieved
  public get photoURL(): string { return this.profile?.photoURL || this.user?.photoURL || this.defaultPhoto; }

  // Display name is retrieved
  public get displayName(): string {
    if (this.isEditing && this.editedDisplayName) return this.editedDisplayName;
    return this.profile?.displayName || this.user?.displayName || this.user?.email || 'User';
  }

  // User type display is retrieved
  public get userTypeDisplay(): string {
    if (!this.profile?.type) return '';
    const lang = this.getCurrentLanguage();
    return this.profile.type === 'Diner' ? this.translations.diner[lang] : this.translations.restaurant[lang];
  }

  // Formatted member since date is retrieved
  public get memberSince(): string {
    if (!this.profile?.createdAt) return 'Unknown';
    try {
      const date = this.profile.createdAt.toDate?.() || new Date(this.profile.createdAt);
      return date.toLocaleDateString();
    } catch { return 'Unknown'; }
  }

  // Formatted last login date is retrieved
  public get lastLogin(): string {
    if (!this.profile?.lastLoginAt) return 'Never';
    try { const date = new Date(this.profile.lastLoginAt); return date.toLocaleString(); } catch { return 'Unknown'; }
  }

  // Days active calculation is retrieved
  public get daysActive(): number {
    if (!this.profile?.createdAt) return 0;
    try {
      const createdDate = this.profile.createdAt.toDate?.() || new Date(this.profile.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch { return 0; }
  }
}