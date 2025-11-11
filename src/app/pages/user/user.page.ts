import { Component, OnInit } from '@angular/core';
import { LanguageService } from '../../services/language.service';
import { AuthService } from '../../services/auth.service';
import { User } from 'firebase/auth';

@Component({
  selector: 'app-user',
  templateUrl: './user.page.html',
  styleUrls: ['./user.page.scss'],
  standalone: false,
})
export class UserPage {
  lang$ = this.lang.lang$;
  user: User | null = null;
  defaultPhoto = 'assets/img/default-profile.png';

  constructor(
    readonly lang: LanguageService,
    private authService: AuthService
  ) { }

  async ngOnInit(): Promise<void> {
    this.user = await this.authService.currentUser();
    // Optionally subscribe to user changes via onAuthStateChanged
  }

  async onLogout(): Promise<void> {
    await this.authService.logout();
    // Navigate back to login page
  }
}