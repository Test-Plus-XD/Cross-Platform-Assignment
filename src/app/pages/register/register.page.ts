import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false,
})
export class RegisterPage implements OnInit {
  registerForm!: FormGroup; // Use definite assignment operator

  constructor(private formBuilder: FormBuilder, private authService: AuthService) { }

  ngOnInit(): void {
    // Initialise registration form
    this.registerForm = this.formBuilder.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async onRegister(): Promise<void> {
    if (this.registerForm.invalid) {
      return;
    }
    const { name, email, password } = this.registerForm.value;
    try {
      await this.authService.registerWithEmail(email, password, name);
      // Navigate or inform user of success
    } catch (error: any) {
      console.error('Registration error:', error);
    }
  }
}