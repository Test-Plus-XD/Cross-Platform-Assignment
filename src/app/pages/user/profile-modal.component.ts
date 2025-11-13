import { Component, OnInit, Input } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService, UserProfile } from '../../services/user.service';
import { LanguageService } from '../../services/language.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-profile-modal',
  templateUrl: './profile-modal.component.html',
  styleUrls: ['./profile-modal.component.scss'],
  standalone: false
})
export class ProfileModalComponent implements OnInit {
  // Input property to receive existing profile data
  @Input() profile: UserProfile | null = null;
  // Input property to determine if this is first-time setup
  @Input() isFirstTime: boolean = false;
  
  // Form group for profile editing
  public profileForm!: FormGroup;
  // Current step in the onboarding flow
  public currentStep: number = 1;
  // Total number of steps
  public readonly totalSteps: number = 3;
  // Flag to track submission state
  public isSubmitting: boolean = false;
  // Language observable for bilingual content
  public lang$ = this.languageService.lang$;
  
  // Translations for all text content
  public translations = {
    completeProfile: { EN: 'Complete Your Profile', TC: '完善您的個人資料' },
    editProfile: { EN: 'Edit Profile', TC: '編輯個人資料' },
    step: { EN: 'Step', TC: '步驟' },
    of: { EN: 'of', TC: '/' },
    userType: { EN: 'Account Type', TC: '帳戶類型' },
    selectType: { EN: 'Please select your account type', TC: '請選擇您的帳戶類型' },
    diner: { EN: 'Diner', TC: '食客' },
    dinerDesc: { EN: 'I want to discover and review restaurants', TC: '我想探索和評論餐廳' },
    restaurant: { EN: 'Restaurant', TC: '商戶' },
    restaurantDesc: { EN: 'I own or manage a restaurant', TC: '我擁有或管理餐廳' },
    basicInfo: { EN: 'Basic Information', TC: '基本資料' },
    displayName: { EN: 'Display Name', TC: '顯示名稱' },
    displayNamePlaceholder: { EN: 'Enter your name', TC: '輸入您的名稱' },
    phoneNumber: { EN: 'Phone Number', TC: '電話號碼' },
    phoneNumberPlaceholder: { EN: 'Enter your phone number', TC: '輸入您的電話號碼' },
    bio: { EN: 'Bio', TC: '簡介' },
    bioPlaceholder: { EN: 'Tell us about yourself...', TC: '告訴我們關於您的資訊...' },
    preferences: { EN: 'Preferences', TC: '偏好設定' },
    language: { EN: 'Language', TC: '語言' },
    theme: { EN: 'Theme', TC: '主題' },
    light: { EN: 'Light', TC: '淺色' },
    dark: { EN: 'Dark', TC: '深色' },
    notifications: { EN: 'Notifications', TC: '通知' },
    enableNotifications: { EN: 'Enable notifications', TC: '啟用通知' },
    previous: { EN: 'Previous', TC: '上一步' },
    next: { EN: 'Next', TC: '下一步' },
    skip: { EN: 'Skip', TC: '跳過' },
    save: { EN: 'Save', TC: '儲存' },
    cancel: { EN: 'Cancel', TC: '取消' },
    required: { EN: 'This field is required', TC: '此欄位為必填' },
    invalidPhone: { EN: 'Invalid phone number format', TC: '電話號碼格式無效' },
    successMessage: { EN: 'Profile updated successfully', TC: '個人資料更新成功' },
    errorMessage: { EN: 'Failed to update profile', TC: '更新個人資料失敗' }
  };

  constructor(
    private readonly modalController: ModalController,
    private readonly formBuilder: FormBuilder,
    private readonly userService: UserService,
    private readonly languageService: LanguageService,
    private readonly toastController: ToastController
  ) {}

  ngOnInit(): void {
    // Initialise the form with existing profile data or defaults
    this.initialiseForm();
    
    // If this is first-time setup and no type is selected, start at step 1
    // Otherwise, if editing, skip to step 2 (basic info)
    if (!this.isFirstTime && this.profile?.type) {
      this.currentStep = 2;
    }
  }

  // Initialise the reactive form with validators
  private initialiseForm(): void {
    this.profileForm = this.formBuilder.group({
      type: [this.profile?.type || null, Validators.required],
      displayName: [this.profile?.displayName || '', Validators.required],
      phoneNumber: [this.profile?.phoneNumber || '', [Validators.pattern(/^\+?[0-9\s\-()]+$/)]],
      bio: [this.profile?.bio || '', [Validators.maxLength(500)]],
      preferences: this.formBuilder.group({
        language: [this.profile?.preferences?.language || 'EN'],
        theme: [this.profile?.preferences?.theme || 'light'],
        notifications: [this.profile?.preferences?.notifications ?? true]
      })
    });
  }

  // Select user type and move to next step
  public selectUserType(type: 'Diner' | 'Restaurant'): void {
    this.profileForm.patchValue({ type: type });
    this.nextStep();
  }

  // Navigate to next step
  public nextStep(): void {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  // Navigate to previous step
  public previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  // Skip current step (only for non-required fields)
  public skipStep(): void {
    this.nextStep();
  }

  // Close modal without saving
  public async closeModal(): Promise<void> {
    await this.modalController.dismiss(null);
  }

  // Save profile and close modal
  public async saveProfile(): Promise<void> {
    // Validate form before submission
    if (this.profileForm.invalid) {
      await this.showToast(
        this.getCurrentTranslation(this.translations.errorMessage),
        'warning'
      );
      return;
    }

    this.isSubmitting = true;

    try {
      const formValue = this.profileForm.value;
      const updatedProfile: Partial<UserProfile> = {
        type: formValue.type,
        displayName: formValue.displayName,
        phoneNumber: formValue.phoneNumber || null,
        bio: formValue.bio || null,
        preferences: formValue.preferences
      };

      // Update profile via user service
      if (this.profile?.uid) {
        await firstValueFrom(
          this.userService.updateUserProfile(this.profile.uid, updatedProfile)
        );
        
        await this.showToast(
          this.getCurrentTranslation(this.translations.successMessage),
          'success'
        );
        
        // Close modal and return updated profile data
        await this.modalController.dismiss({ updated: true, profile: updatedProfile });
      }
    } catch (error) {
      console.error('ProfileModalComponent: Error saving profile', error);
      await this.showToast(
        this.getCurrentTranslation(this.translations.errorMessage),
        'danger'
      );
    } finally {
      this.isSubmitting = false;
    }
  }

  // Helper method to get current translation
  private getCurrentTranslation(translationObject: { EN: string; TC: string }): string {
    const currentLang = ((this.languageService as any)._lang.value || 'EN') as 'EN' | 'TC';
    return translationObject[currentLang];
  }

  // Show toast message
  private async showToast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000,
      position: 'bottom',
      color: color
    });
    await toast.present();
  }

  // Check if current step is valid
  public get isCurrentStepValid(): boolean {
    switch (this.currentStep) {
      case 1:
        return this.profileForm.get('type')?.valid || false;
      case 2:
        return this.profileForm.get('displayName')?.valid || false;
      case 3:
        return true; // Preferences are all optional
      default:
        return false;
    }
  }

  // Get progress percentage for progress bar
  public get progressPercentage(): number {
    return (this.currentStep / this.totalSteps) * 100;
  }
}