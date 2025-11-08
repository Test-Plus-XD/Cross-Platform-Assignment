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
export class LoginPage implements OnInit {
  loginForm!: FormGroup; // Use definite assignment operator since form is created in ngOnInit

  constructor(private formBuilder: FormBuilder, private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    // Initialise form with validators
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  async onLogin(): Promise<void> {
    if (this.loginForm.invalid) {
      return;
    }
    // Extract values from form
    const { email, password } = this.loginForm.value;
    try {
      await this.authService.loginWithEmail(email, password);
      await this.router.navigate(['/home']);
    } catch (error: any) {
      console.error('Login error:', error);
    }
  }

  async onGoogleLogin(): Promise<void> {
    try {
      await this.authService.loginWithGoogle();
      await this.router.navigate(['/home']);
    } catch (error: any) {
      console.error('Google login error:', error);
    }
  }
}