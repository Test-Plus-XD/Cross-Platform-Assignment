// AccountTypeSelectorComponent — bottom-sheet modal that asks a newly registered
// user to choose their account type ("Diner" or "Restaurant Owner").
//
// Shown once when:  isLoggedIn === true  &&  currentProfile.type is null/empty
//
// canDismiss is false until a type is selected and saved, ensuring every user
// completes the step before using the app.
import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { UserService } from '../../services/user.service';
import { AppStateService } from '../../services/app-state.service';
import { LanguageService } from '../../services/language.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-account-type-selector',
  templateUrl: './account-type-selector.component.html',
  styleUrls: ['./account-type-selector.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountTypeSelectorComponent {
  private readonly modalController = inject(ModalController);
  private readonly toastController = inject(ToastController);
  private readonly userService = inject(UserService);
  private readonly appState = inject(AppStateService);
  private readonly languageService = inject(LanguageService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Currently highlighted selection before the user taps Confirm
  selectedType: 'Diner' | 'Restaurant' | null = null;

  // Whether the API call is in flight — used to disable the confirm button
  isSaving = false;

  // Language snapshot for synchronous use in methods
  get isTC(): boolean {
    return this.languageService.getCurrentLanguage() === 'TC';
  }

  // Called when the user taps a type card — highlights the selection
  selectType(type: 'Diner' | 'Restaurant'): void {
    this.selectedType = type;
    this.cdr.markForCheck();
  }

  // Called when the user taps Confirm — saves the type via UserService and
  // dismisses the modal.  The modal cannot be dismissed any other way because
  // canDismiss is set to false on presentation.
  async confirm(): Promise<void> {
    if (!this.selectedType || this.isSaving) return;

    const uid = this.appState.appState.uid;
    if (!uid) {
      console.error('[AccountTypeSelector] No UID available');
      return;
    }

    this.isSaving = true;
    this.cdr.markForCheck();

    // Persist the chosen type to the backend
    this.userService.updateUserProfile(uid, { type: this.selectedType }).pipe(take(1)).subscribe({
      next: async () => {
        console.log('[AccountTypeSelector] Type saved:', this.selectedType);
        // Dismiss with the chosen type so the caller can react if needed
        await this.modalController.dismiss({ type: this.selectedType }, 'confirm');
      },
      error: async (err) => {
        console.error('[AccountTypeSelector] Failed to save type:', err);
        const msg = this.isTC ? '儲存失敗，請重試' : 'Failed to save. Please try again.';
        const toast = await this.toastController.create({
          message: msg, duration: 3000, position: 'bottom', color: 'danger'
        });
        await toast.present();
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }
}
