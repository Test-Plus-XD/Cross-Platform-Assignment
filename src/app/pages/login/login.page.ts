import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
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

  private authSubscription: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private loadingController: LoadingController
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

  // Handle email/password form submission
  public async onSubmitEmail(): Promise<void> {
    // Validate inputs
    if (!this.email || !this.password) {
      await this.showToast('Please enter both email and password', 'warning');
      return;
    }

    if (this.password.length < 6) {
      await this.showToast('Password must be at least 6 characters', 'warning');
      return;
    }

    // Show loading indicator
    const loading = await this.loadingController.create({
      message: this.isLoginMode ? 'Logging in...' : 'Creating account...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      if (this.isLoginMode) {
        // Perform login
        await this.authService.loginWithEmail(this.email, this.password);
        await this.showToast('Welcome back!', 'success');
        await this.router.navigate(['/user']);
      } else {
        // Perform registration
        await this.authService.registerWithEmail(
          this.email,
          this.password,
          this.displayName || undefined
        );
        await this.showToast('Account created! Please check your email to verify your account.', 'success');

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
    const loading = await this.loadingController.create({
      message: 'Connecting to Google...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.authService.signInWithGoogle();
      await this.showToast('Welcome!', 'success');
      await this.router.navigate(['/user']);
    } catch (error: any) {
      // Only show error if user didn't cancel
      if (!error.message.includes('cancelled') && !error.message.includes('closed')) {
        await this.showToast(error.message || 'Google sign-in failed', 'danger');
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
      await this.showToast('Please enter your email address first', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Sending reset email...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.authService.sendPasswordResetEmail(this.email);
      await this.showToast('Password reset email sent! Please check your inbox.', 'success');
    } catch (error: any) {
      await this.showToast(error.message || 'Failed to send reset email', 'danger');
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