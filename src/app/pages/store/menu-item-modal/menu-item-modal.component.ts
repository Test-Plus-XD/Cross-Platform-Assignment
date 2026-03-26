// Modal for adding a new menu item or editing an existing one.
// Pass menuItem via componentProps to enter edit mode; omit it for add mode.
// Dismisses with { saved: true } after a successful create or update.
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { ToastController, LoadingController, ModalController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MenuItem } from '../../../services/restaurants.service';
import { StoreFeatureService } from '../../../services/store-feature.service';
import { MenuItemFieldLabels } from '../../../constants/restaurant-constants';

@Component({
  selector: 'app-menu-item-modal',
  templateUrl: './menu-item-modal.component.html',
  styleUrls: ['./menu-item-modal.component.scss'],
  standalone: false
})
export class MenuItemModalComponent implements OnInit, OnDestroy {
  // Required: the restaurant whose menu this item belongs to
  @Input() restaurantId!: string;
  // Optional: when provided the modal operates in edit mode instead of add mode
  @Input() menuItem?: MenuItem;

  // Reactive language stream
  lang$ = this.feature.language.lang$;
  currentLanguage: 'EN' | 'TC' = 'EN';

  // Field labels from centralized constants (bilingual)
  menuItemFieldLabels = MenuItemFieldLabels;

  // Editable form model — mirrors the MenuItem data shape
  editedMenuItem: Partial<MenuItem> = {
    Name_EN: '',
    Name_TC: '',
    Description_EN: '',
    Description_TC: '',
    price: null,
    imageUrl: null
  };

  // Image selection state
  selectedImage: File | null = null;
  imagePreview: string | null = null;
  isUploadingImage = false;

  // RxJS teardown
  private destroy$ = new Subject<void>();

  // Bilingual UI strings for this modal
  translations = {
    addMenuItem:  { EN: 'Add Menu Item',  TC: '新增菜單項目' },
    editMenuItem: { EN: 'Edit Menu Item', TC: '編輯菜單項目' },
    saveChanges:  { EN: 'Save Changes',   TC: '儲存變更' },
    cancel:       { EN: 'Cancel',         TC: '取消' },
    saving:       { EN: 'Saving...',      TC: '儲存中...' },
    updateSuccess:{ EN: 'Updated successfully', TC: '更新成功' },
    createSuccess:{ EN: 'Created successfully', TC: '建立成功' },
    updateFailed: { EN: 'Update failed',  TC: '更新失敗' },
  };

  constructor(
    private readonly feature: StoreFeatureService,
    private readonly modalController: ModalController,
    private readonly toastController: ToastController,
    private readonly loadingController: LoadingController
  ) {}

  ngOnInit(): void {
    // Keep snapshot in sync for template expressions that cannot use async pipe
    this.lang$.pipe(takeUntil(this.destroy$)).subscribe(lang => {
      this.currentLanguage = lang;
    });

    // In edit mode, pre-populate the form with the existing item's values
    if (this.menuItem) {
      this.editedMenuItem = {
        Name_EN:        this.menuItem.Name_EN        || '',
        Name_TC:        this.menuItem.Name_TC        || '',
        Description_EN: this.menuItem.Description_EN || '',
        Description_TC: this.menuItem.Description_TC || '',
        price:          this.menuItem.price,
        imageUrl:       this.menuItem.imageUrl       || null
      };
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // True when this modal was opened with an existing menu item (edit mode)
  get isEditing(): boolean {
    return !!this.menuItem?.id;
  }

  // Dismiss without saving
  dismiss(): void {
    this.modalController.dismiss({ saved: false });
  }

  // Retrieve the field label for a given menu item field in the active language.
  getFieldLabel(fieldName: string, lang: 'EN' | 'TC'): string {
    const labels = this.menuItemFieldLabels as any;
    return labels?.[fieldName]?.[lang] || fieldName;
  }

  // Trigger the hidden file-input element
  clickImageUploadButton(): void {
    const input = document.getElementById('menu-item-modal-image-input') as HTMLInputElement;
    input?.click();
  }

  // Validate and preview the selected image file.
  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Only accept image types
    if (!file.type.startsWith('image/')) {
      this.showToast('Please select a valid image file', 'warning');
      return;
    }
    // 10 MB limit
    if (file.size > 10 * 1024 * 1024) {
      this.showToast('Image size must be less than 10MB', 'warning');
      return;
    }

    this.selectedImage = file;

    // Generate a local data-URL so the user sees a preview before saving
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  // Clear the staged image without uploading
  clearImageSelection(): void {
    this.selectedImage = null;
    this.imagePreview = null;
    const input = document.getElementById('menu-item-modal-image-input') as HTMLInputElement;
    if (input) input.value = '';
  }

  // Save the menu item (create or update) then upload the image if one was staged.
  async save(): Promise<void> {
    if (!this.restaurantId) return;

    const lang = this.currentLanguage;

    // At least one name must be provided
    if (!this.editedMenuItem.Name_EN && !this.editedMenuItem.Name_TC) {
      await this.showToast(lang === 'TC' ? '請輸入名稱' : 'Please enter a name', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: this.translations.saving[lang],
      spinner: null,
      cssClass: 'eclipse-loading'
    });
    await loading.present();

    try {
      // Build clean payload — trim whitespace, pass null for empty strings
      const payload: Partial<MenuItem> = {
        Name_EN:        this.editedMenuItem.Name_EN?.trim()        || null,
        Name_TC:        this.editedMenuItem.Name_TC?.trim()        || null,
        Description_EN: this.editedMenuItem.Description_EN?.trim() || null,
        Description_TC: this.editedMenuItem.Description_TC?.trim() || null,
        price:          this.editedMenuItem.price
      };

      let menuItemId: string;

      if (this.isEditing && this.menuItem?.id) {
        // Update path — PATCH the existing item
        await this.feature.restaurants
          .updateMenuItem(this.restaurantId, this.menuItem.id, payload)
          .toPromise();
        menuItemId = this.menuItem.id;
      } else {
        // Create path — POST a new item and capture the returned ID for image upload
        const createResponse = await this.feature.restaurants
          .createMenuItem(this.restaurantId, payload)
          .toPromise();
        if (!createResponse?.id) throw new Error('Failed to create menu item');
        menuItemId = createResponse.id;
      }

      // If the user staged an image, upload it now that we have a valid item ID
      if (this.selectedImage && menuItemId) {
        const token = await this.feature.auth.getIdToken();
        if (token) {
          await this.feature.restaurants
            .uploadMenuItemImage(this.restaurantId, menuItemId, this.selectedImage, token)
            .toPromise();
        }
      }

      const successMsg = this.isEditing
        ? this.translations.updateSuccess[lang]
        : this.translations.createSuccess[lang];
      await this.showToast(successMsg, 'success');

      // Signal the parent to refresh its menu list
      this.modalController.dismiss({ saved: true });

    } catch (error: any) {
      console.error('MenuItemModal: save error:', error);
      await this.showToast(error.message || this.translations.updateFailed[lang], 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  // Display a brief bottom toast notification.
  private async showToast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 3000, position: 'bottom', color });
    await toast.present();
  }
}
