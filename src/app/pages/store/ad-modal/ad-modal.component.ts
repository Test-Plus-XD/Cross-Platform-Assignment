// Ad creation modal for restaurant owners to compose and submit an advertisement
// Presented by StorePage after a successful Stripe checkout payment
import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { AdvertisementsService, CreateAdvertisementRequest } from '../../../services/advertisements.service';
import { DataService } from '../../../services/data.service';
import { LanguageService } from '../../../services/language.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-ad-modal',
  templateUrl: './ad-modal.component.html',
  styleUrls: ['./ad-modal.component.scss'],
  standalone: false
})
export class AdModalComponent implements OnInit {
  /** Stripe Checkout Session ID — passed from StorePage after redirect */
  @Input() sessionId: string = '';
  /** Restaurant ID — pre-filled from the owner's store context */
  @Input() restaurantId: string = '';

  // Language stream for bilingual UI
  lang$: Observable<string>;

  // Form fields — English
  titleEN: string = '';
  contentEN: string = '';

  // Form fields — Traditional Chinese
  titleTC: string = '';
  contentTC: string = '';

  // Image upload — English
  imageFileEN: File | null = null;
  imagePreviewEN: string | null = null;

  // Image upload — Traditional Chinese
  imageFileTC: File | null = null;
  imagePreviewTC: string | null = null;

  // UI state
  isSubmitting: boolean = false;

  constructor(
    private readonly modalController: ModalController,
    private readonly toastController: ToastController,
    private readonly advertisementsService: AdvertisementsService,
    private readonly dataService: DataService,
    private readonly languageService: LanguageService
  ) {
    this.lang$ = this.languageService.lang$;
  }

  ngOnInit(): void { }

  /** Dismiss the modal without creating an advertisement */
  dismiss(): void {
    this.modalController.dismiss({ created: false });
  }

  /** Handle EN image file selection and generate a local preview */
  onImageENSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.imageFileEN = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => { this.imagePreviewEN = e.target?.result as string; };
      reader.readAsDataURL(this.imageFileEN);
    }
  }

  /** Handle TC image file selection and generate a local preview */
  onImageTCSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.imageFileTC = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => { this.imagePreviewTC = e.target?.result as string; };
      reader.readAsDataURL(this.imageFileTC);
    }
  }

  /**
   * Upload a single image to Firebase Storage via the Images API.
   * Returns the public URL of the uploaded image, or null on failure.
   */
  private async uploadImage(file: File): Promise<string | null> {
    try {
      const result = await this.dataService
        .uploadFile<{ imageUrl: string }>('/API/Images/upload?folder=Advertisements', file, 'image')
        .toPromise();
      return result?.imageUrl || null;
    } catch (err) {
      console.error('AdModalComponent: Image upload failed', err);
      return null;
    }
  }

  /**
   * Validate, apply language fallback, upload images, and submit the advertisement.
   * Language fallback: if either language's fields are null/empty, copy from the other language.
   */
  async submit(): Promise<void> {
    // Require at least one language to have a title
    if (!this.titleEN.trim() && !this.titleTC.trim()) {
      const toast = await this.toastController.create({
        message: 'Please enter at least one title (English or Traditional Chinese).',
        duration: 3000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    this.isSubmitting = true;

    try {
      // Upload images if provided
      let imageUrlEN: string | null = null;
      let imageUrlTC: string | null = null;

      if (this.imageFileEN) {
        imageUrlEN = await this.uploadImage(this.imageFileEN);
      }
      if (this.imageFileTC) {
        imageUrlTC = await this.uploadImage(this.imageFileTC);
      }

      // Apply language fallback — copy from the other language when a field is empty
      const finalTitleEN = this.titleEN.trim() || this.titleTC.trim() || null;
      const finalTitleTC = this.titleTC.trim() || this.titleEN.trim() || null;
      const finalContentEN = this.contentEN.trim() || this.contentTC.trim() || null;
      const finalContentTC = this.contentTC.trim() || this.contentEN.trim() || null;
      const finalImageEN = imageUrlEN || imageUrlTC || null;
      const finalImageTC = imageUrlTC || imageUrlEN || null;

      const payload: CreateAdvertisementRequest = {
        restaurantId: this.restaurantId,
        Title_EN: finalTitleEN,
        Title_TC: finalTitleTC,
        Content_EN: finalContentEN,
        Content_TC: finalContentTC,
        Image_EN: finalImageEN,
        Image_TC: finalImageTC
      };

      await this.advertisementsService.createAdvertisement(payload).toPromise();

      const toast = await this.toastController.create({
        message: 'Advertisement published successfully!',
        duration: 2500,
        color: 'success'
      });
      await toast.present();

      this.modalController.dismiss({ created: true });
    } catch (err) {
      console.error('AdModalComponent: Failed to create advertisement', err);
      const toast = await this.toastController.create({
        message: 'Failed to publish advertisement. Please try again.',
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    } finally {
      this.isSubmitting = false;
    }
  }
}
