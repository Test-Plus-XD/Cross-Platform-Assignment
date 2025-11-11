import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {
  public email: string = '';
  public password: string = '';
  public isLoginMode: boolean = true;
  public errorMessage: string | null = null;

  constructor(private authService: AuthService) { }

  public async onSubmitEmail(): Promise<void> {
    this.errorMessage = null;
    try {
      if (this.isLoginMode) {
        await this.authService.loginWithEmail(this.email, this.password);
      } else {
        await this.authService.registerWithEmail(this.email, this.password);
      }
      // Upon success navigate elsewhere (e.g., home/dashboard)
    } catch (err: any) {
      this.errorMessage = err.message || 'Unknown error';
    }
  }

  public async onGoogleSignIn(): Promise<void> {
    this.errorMessage = null;
    try {
      await this.authService.signInWithGoogle();
      // Navigate on success
    } catch (err: any) {
      this.errorMessage = err.message || 'Google sign-in error';
    }
  }
}