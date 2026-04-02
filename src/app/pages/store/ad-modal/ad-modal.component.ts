// Ad creation modal for restaurant owners to compose and submit an advertisement
// Presented by StorePage after a successful Stripe checkout payment
import { Component, Input, OnInit, inject } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { AdvertisementsService, CreateAdvertisementRequest } from '../../../services/advertisements.service';
import { GeminiService } from '../../../services/gemini.service';
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
  private readonly modalController = inject(ModalController);
  private readonly toastController = inject(ToastController);
  private readonly advertisementsService = inject(AdvertisementsService);
  private readonly geminiService = inject(GeminiService);
  private readonly dataService = inject(DataService);
  private readonly languageService = inject(LanguageService);

  /** Stripe Checkout Session ID — passed from StorePage after redirect */
  @Input() sessionId: string = '';
  /** Restaurant ID — pre-filled from the owner's store context */
  @Input() restaurantId: string = '';
  /** Restaurant details — passed from StorePage for AI content generation */
  @Input() restaurantName: string = '';
  @Input() restaurantDistrict: string = '';
  @Input() restaurantKeywords: string[] = [];

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

  // AI message input — optional context the owner provides before generating
  adMessage: string = '';

  // UI state
  isSubmitting: boolean = false;
  isGenerating: boolean = false;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {
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

  /** Generate bilingual ad content using Gemini AI and populate form fields */
  async generateWithAI(): Promise<void> {
    if (!this.restaurantName) {
      const toast = await this.toastController.create({
        message: 'Restaurant details not available for AI generation.',
        duration: 3000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    this.isGenerating = true;

    this.geminiService.generateAdvertisement(
      this.restaurantId,
      this.restaurantName,
      this.restaurantDistrict,
      this.restaurantKeywords,
      this.adMessage
    ).subscribe({
      next: (result) => {
        this.titleEN = result.Title_EN || '';
        this.titleTC = result.Title_TC || '';
        this.contentEN = result.Content_EN || '';
        this.contentTC = result.Content_TC || '';
        this.isGenerating = false;
      },
      error: async (err) => {
        console.error('AdModalComponent: AI generation failed', err);
        const toast = await this.toastController.create({
          message: 'Failed to generate content. Please try again or write manually.',
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
        this.isGenerating = false;
      }
    });
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
