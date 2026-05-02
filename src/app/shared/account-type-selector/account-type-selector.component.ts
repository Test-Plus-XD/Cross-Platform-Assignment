// AccountTypeSelectorComponent - blocking setup modal that asks a newly registered
// user to choose their account type ("Diner" or "Restaurant Owner").
//
// Shown once when:  isLoggedIn === true  &&  currentProfile.type is null/empty
//
// canDismiss is false until a type is selected and saved, ensuring every user
// completes the step before using the app.
import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, inject } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { UserProfile, UserService } from '../../services/user.service';
import { AppStateService } from '../../services/app-state.service';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-account-type-selector',
  templateUrl: './account-type-selector.component.html',
  styleUrls: ['./account-type-selector.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountTypeSelectorComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  private readonly toastController = inject(ToastController);
  private readonly userService = inject(UserService);
  private readonly appState = inject(AppStateService);
  private readonly languageService = inject(LanguageService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Current setup step shown in the blocking onboarding modal.
  currentStep: 1 | 2 = 1;

  // Total setup steps used for the progress indicator.
  readonly totalSteps = 2;

  // Currently selected account type from the first setup step.
  selectedType: 'Diner' | 'Restaurant' | null = null;

  // Basic profile fields collected after the account type has been selected.
  displayName = '';
  phoneNumber = '';
  bio = '';
  preferredLanguage: 'EN' | 'TC' = this.languageService.getCurrentLanguage();
  preferredTheme: 'light' | 'dark' = 'light';
  notificationsEnabled = true;

  // Whether the final API save is in flight, used to disable the save button.
  isSaving = false;

  // Language snapshot for synchronous use in methods
  get isTC(): boolean {
    return this.languageService.getCurrentLanguage() === 'TC';
  }


  ngOnInit(): void {
    this.displayName = this.resolveInitialDisplayName();
    this.cdr.markForCheck();
  }

  // Called when the user taps a type card and advances to the setup step.
  selectType(type: 'Diner' | 'Restaurant'): void {
    this.selectedType = type;
    this.currentStep = 2;
    if (!this.displayName.trim()) this.displayName = this.resolveInitialDisplayName();
    this.cdr.markForCheck();
  }

  // Returns to account type selection so the user can correct a mistaken choice.
  previousStep(): void {
    if (this.isSaving) return;
    this.currentStep = 1;
    this.cdr.markForCheck();
  }

  // Normalises ion-input values into strings for the simple setup fields.
  updateTextField(fieldName: 'displayName' | 'phoneNumber' | 'bio', event: CustomEvent): void {
    this[fieldName] = String(event.detail?.value ?? '');
    this.cdr.markForCheck();
  }

  // Stores preference selectors without requiring template-driven forms in AppModule.
  updateLanguage(event: CustomEvent): void {
    this.preferredLanguage = event.detail?.value === 'TC' ? 'TC' : 'EN';
    this.cdr.markForCheck();
  }

  // Stores the preferred theme from the setup select control.
  updateTheme(event: CustomEvent): void {
    this.preferredTheme = event.detail?.value === 'dark' ? 'dark' : 'light';
    this.cdr.markForCheck();
  }

  // Stores the notification preference from the setup toggle.
  updateNotifications(event: CustomEvent): void {
    this.notificationsEnabled = !!event.detail?.checked;
    this.cdr.markForCheck();
  }

  // Called when the user taps Save. The modal cannot be dismissed any other way.
  async confirm(): Promise<void> {
    if (!this.selectedType || this.isSaving) return;

    const uid = this.appState.appState.uid;
    if (!uid) {
      console.error('[AccountTypeSelector] No UID available');
      return;
    }

    this.isSaving = true;
    this.cdr.markForCheck();

    try {
      const profileUpdates = this.buildProfileUpdates();
      await this.saveProfileUpdates(uid, profileUpdates);
      console.log('[AccountTypeSelector] Account setup saved:', this.selectedType);
      const didDismiss = await this.modalController.dismiss({ type: this.selectedType, updated: true }, 'confirm');
      if (!didDismiss) throw new Error('Account setup modal dismissal was blocked.');
    } catch (err) {
      console.error('[AccountTypeSelector] Failed to save setup:', err);
      const msg = this.getErrorMessage(err);
      const toast = await this.toastController.create({
        message: msg,
        duration: 3000,
        position: 'bottom',
        color: 'danger'
      });
      await toast.present();
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }


  // Resolves the best display name candidate, prioritising OAuth/profile values over blanks.
  private resolveInitialDisplayName(): string {
    return (
      this.userService.currentProfile?.displayName?.trim()
      || this.appState.appState.displayName?.trim()
      || this.appState.appState.email?.split('@')[0]?.trim()
      || ''
    );
  }

  // Builds the profile payload from setup fields, preserving optional empty fields as null.
  private buildProfileUpdates(): Partial<UserProfile> {
    const trimmedDisplayName = this.displayName.trim();
    const trimmedPhoneNumber = this.phoneNumber.trim();
    const trimmedBio = this.bio.trim();

    return {
      type: this.selectedType,
      displayName: trimmedDisplayName || this.appState.appState.displayName || this.appState.appState.email || null,
      phoneNumber: trimmedPhoneNumber || null,
      bio: trimmedBio || null,
      preferences: {
        language: this.preferredLanguage,
        theme: this.preferredTheme,
        notifications: this.notificationsEnabled
      }
    };
  }

  // Saves setup with a timeout and creates the profile if the auth/profile race left it missing.
  private async saveProfileUpdates(uid: string, profileUpdates: Partial<UserProfile>): Promise<void> {
    try {
      await firstValueFrom(
        this.userService.updateUserProfile(uid, profileUpdates).pipe(timeout({ first: 15000 }))
      );
    } catch (updateError) {
      if (!this.isMissingProfileError(updateError)) throw updateError;

      await firstValueFrom(
        this.userService.createUserProfile({
          uid,
          email: this.appState.appState.email,
          emailVerified: false,
          loginCount: 0,
          ...profileUpdates
        }).pipe(timeout({ first: 15000 }))
      );
    }
  }

  // Detects the specific API error thrown when a newly authenticated profile is not created yet.
  private isMissingProfileError(error: unknown): boolean {
    return error instanceof Error && error.message.toLowerCase().includes('profile not found');
  }

  // Returns a translated save error, including timeout wording for stalled requests.
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return this.isTC ? '儲存時間過長，請檢查網絡後重試。' : 'Saving took too long. Please check your connection and try again.';
    }

    return this.isTC ? '儲存失敗，請重試。' : 'Failed to save. Please try again.';
  }
}
