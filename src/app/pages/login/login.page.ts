import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';
import { ToastController, LoadingController } from '@ionic/angular';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnDestroy {
  // Form fields bound to template
  public email: string = '';
  public password: string = '';
  public displayName: string = '';
  public isLoginMode: boolean = true;
  public errorMessage: string = '';

  // Language observable
  public lang$ = this.languageService.lang$;
  // Brand icon observable that changes with theme
  public brandIcon$ = this.themeService.brandIcon$;
  // Translations
  public translations = {
    displayName: { EN: 'Display Name', TC: '顯示名稱' },
    email: { EN: 'Email', TC: '電郵' },
    password: { EN: 'Password', TC: '密碼' },
    login: { EN: 'Login', TC: '登入' },
    createAccount: { EN: 'Create Account', TC: '建立帳戶' },
    forgetPassword: { EN: 'Forget Password?', TC: '忘記密碼？' },
    dontHaveAccount: { EN: "Don't have an account?", TC: '沒有帳戶？' },
    alreadyHaveAccount: { EN: 'Already have an account?', TC: '已有帳戶？' },
    signup: { EN: 'Sign Up', TC: '註冊' },
    or: { EN: 'OR', TC: '或' },
    continueWithGoogle: { EN: 'Continue with Google', TC: '使用 Google 繼續' },
    loggingIn: { EN: 'Logging in...', TC: '正在登入...' },
    creatingAccount: { EN: 'Creating account...', TC: '建立帳戶中...' },
    welcomeBack: { EN: 'Welcome back!', TC: '歡迎回來！' },
    accountCreated: { EN: 'Account created! Please check your email to verify your account.', TC: '帳戶已建立！請檢查您的電郵以驗證帳戶。' },
    connectingGoogle: { EN: 'Connecting to Google...', TC: '正在連接 Google...' },
    welcome: { EN: 'Welcome!', TC: '歡迎！' },
    googleSignInFailed: { EN: 'Google sign-in failed', TC: 'Google 登入失敗' },
    pleaseEnterBoth: { EN: 'Please enter both email and password', TC: '請輸入電郵和密碼' },
    passwordMinLength: { EN: 'Password must be at least 6 characters', TC: '密碼必須至少需6個字符' },
    pleaseEnterEmail: { EN: 'Please enter your email address first', TC: '請先輸入您的電郵地址' },
    sendingResetEmail: { EN: 'Sending reset email...', TC: '正在發送重設電郵...' },
    resetEmailSent: { EN: 'Password reset email sent! Please check your inbox.', TC: '重設密碼電郵已發送！請檢查您的電郵收件箱。' },
    resetEmailFailed: { EN: 'Failed to send reset email', TC: '發送重設電郵失敗' },
  };

  private authSubscription: Subscription | null = null;

  constructor(
    readonly authService: AuthService,
    readonly languageService: LanguageService,
    readonly themeService: ThemeService,
    readonly router: Router,
    readonly toastController: ToastController,
    readonly loadingController: LoadingController
  ) {
    // Subscribe to auth state changes
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      // If user is already logged in, redirect to user page
      if (user) {
        this.router.navigate(['/user']);
      }
    });
  }

  ngOnDestroy(): void {
    // Clean up subscription
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  // Helper to get current language value
  private getCurrentLanguage(): 'EN' | 'TC' {
    const currentLang = (this.languageService as any)._lang.value;
    return currentLang || 'EN';
  }

  // Handle email/password form submission
  public async onSubmitEmail(): Promise<void> {
    // Validate inputs
    if (!this.email || !this.password) {
      const lang = this.getCurrentLanguage();
      await this.showToast(this.translations.pleaseEnterBoth[lang], 'warning');
      return;
    }

    if (this.password.length < 6) {
      const lang = this.getCurrentLanguage();
      await this.showToast(this.translations.passwordMinLength[lang], 'warning');
      return;
    }

    // Show loading indicator
    const lang = this.getCurrentLanguage();
    const loading = await this.loadingController.create({
      message: this.isLoginMode ? this.translations.loggingIn[lang] : this.translations.creatingAccount[lang],
      spinner: null
    });
    await loading.present();

    try {
      if (this.isLoginMode) {
        // Perform login
        await this.authService.loginWithEmail(this.email, this.password);
        const currentLang = this.getCurrentLanguage();
        await this.showToast(this.translations.welcomeBack[currentLang], 'success');
        await this.router.navigate(['/user']);
      } else {
        // Perform registration
        await this.authService.registerWithEmail(
          this.email,
          this.password,
          this.displayName || undefined
        );
        const currentLang = this.getCurrentLanguage();
        await this.showToast(this.translations.accountCreated[currentLang], 'success');

        // Switch to login mode after successful registration
        this.isLoginMode = true;
        this.clearForm();
      }
    } catch (error: any) {
      // Show user-friendly error message
      await this.showToast(error.message || 'An error occurred', 'danger');
    } finally {
      // Always dismiss loading indicator
      await loading.dismiss();
    }
  }

  // Handle Google sign-in
  public async onGoogleSignIn(): Promise<void> {
    const lang = this.getCurrentLanguage();
    const loading = await this.loadingController.create({
      message: this.translations.connectingGoogle[lang],
      spinner: null
    });
    await loading.present();

    try {
      await this.authService.signInWithGoogle();
      const currentLang = this.getCurrentLanguage();
      await this.showToast(this.translations.welcome[currentLang], 'success');
      await this.router.navigate(['/user']);
    } catch (error: any) {
      // Only show error if user didn't cancel
      if (!error.message.includes('cancelled') && !error.message.includes('closed')) {
        const currentLang = this.getCurrentLanguage();
        await this.showToast(error.message || this.translations.googleSignInFailed[currentLang], 'danger');
      }
    } finally {
      await loading.dismiss();
    }
  }

  // Toggle between login and registration modes
  public toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
    this.clearForm();
  }

  // Handle password reset
  public async forgotPassword(): Promise<void> {
    if (!this.email) {
      const lang = this.getCurrentLanguage();
      await this.showToast(this.translations.pleaseEnterEmail[lang], 'warning');
      return;
    }

    const lang = this.getCurrentLanguage();
    const loading = await this.loadingController.create({
      message: this.translations.sendingResetEmail[lang],
      spinner: null
    });
    await loading.present();

    try {
      await this.authService.sendPasswordResetEmail(this.email);
      const currentLang = this.getCurrentLanguage();
      await this.showToast(this.translations.resetEmailSent[currentLang], 'success');
    } catch (error: any) {
      const currentLang = this.getCurrentLanguage();
      await this.showToast(error.message || this.translations.resetEmailFailed[currentLang], 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // Helper method to display toast messages
  private async showToast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }

  // Clear form fields
  private clearForm(): void {
    this.email = '';
    this.password = '';
    this.displayName = '';
  }
}