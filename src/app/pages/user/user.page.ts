import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
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

  // Subscription to auth state
  private authSubscription: Subscription | null = null;

  constructor(
    private authService: AuthService,
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

  // Handle logout button click
  public async onLogout(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Confirm Logout',
      message: 'Are you sure you want to log out?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Logout',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Logging out...',
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