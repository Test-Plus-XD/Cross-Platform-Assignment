// Modal for bulk-importing menu items from a document (PDF, image, JSON, or text)
// via the DocuPipe extraction API.  The flow is:
//   1. User selects a file
//   2. File is POST-ed to /API/DocuPipe/extract-menu (server handles polling)
//   3. Extracted items are shown in an editable review table
//   4. User can remove rows or edit fields, then saves all items to the DB
// Dismisses with { imported: true } when items are saved.
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { ToastController, LoadingController, ModalController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MenuItem } from '../../../services/restaurants.service';
import { StoreFeatureService } from '../../../services/store-feature.service';
import { MenuItemFieldLabels } from '../../../constants/restaurant-constants';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-bulk-menu-import-modal',
  templateUrl: './bulk-menu-import-modal.component.html',
  styleUrls: ['./bulk-menu-import-modal.component.scss'],
  standalone: false
})
export class BulkMenuImportModalComponent implements OnInit, OnDestroy {
  // The restaurant that extracted items will be saved to
  @Input() restaurantId!: string;

  // Reactive language stream
  lang$ = this.feature.language.lang$;
  currentLanguage: 'EN' | 'TC' = 'EN';

  // Bilingual field labels from constants
  menuItemFieldLabels = MenuItemFieldLabels;

  // Upload and processing state
  isImportingMenu = false;
  isPollingDocuPipe = false;

  // The document file the user has chosen
  selectedMenuDocument: File | null = null;

  // Extracted item list — editable before the final save
  extractedMenuItems: Partial<MenuItem>[] = [];

  // Whether the review/edit table is shown (after successful extraction)
  showExtractedItemsReview = false;

  // RxJS teardown
  private destroy$ = new Subject<void>();

  // Bilingual labels for this modal
  translations = {
    title:        { EN: 'Bulk Import Menu', TC: '批量匯入菜單' },
    cancel:       { EN: 'Cancel',           TC: '取消' },
    saveAll:      { EN: 'Save All',         TC: '儲存全部' },
  };

  constructor(
    private readonly feature: StoreFeatureService,
    private readonly modalController: ModalController,
    private readonly toastController: ToastController,
    private readonly loadingController: LoadingController
  ) {}

  ngOnInit(): void {
    // Keep language snapshot current for template bindings
    this.lang$.pipe(takeUntil(this.destroy$)).subscribe(lang => {
      this.currentLanguage = lang;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Dismiss the modal without importing anything
  dismiss(): void {
    this.modalController.dismiss({ imported: false });
  }

  // Get the localised label for a menu item field (Name_EN, price, etc.)
  getFieldLabel(fieldName: string, lang: 'EN' | 'TC'): string {
    const labels = this.menuItemFieldLabels as any;
    return labels?.[fieldName]?.[lang] || fieldName;
  }

  // Trigger the hidden file-input element programmatically
  clickDocumentUploadButton(): void {
    const input = document.getElementById('bulk-import-file-input') as HTMLInputElement;
    input?.click();
  }

  // Capture the chosen document file and validate type + size.
  onDocumentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Accept PDF, common image types, plain text and JSON
    const validTypes = [
      'application/pdf',
      'image/jpeg', 'image/png', 'image/webp',
      'text/plain', 'application/json'
    ];
    if (!validTypes.includes(file.type)) {
      this.showToast('Please select a PDF, image, or text file', 'warning');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.showToast('File size must be less than 10MB', 'warning');
      return;
    }

    this.selectedMenuDocument = file;
    console.log('BulkMenuImportModal: document selected:', file.name);
  }

  // Upload the selected document to the DocuPipe endpoint and process the response.
  // The server handles all polling internally and returns extracted items in one call.
  async uploadMenuDocument(): Promise<void> {
    if (!this.selectedMenuDocument || !this.restaurantId) return;

    const lang = this.currentLanguage;
    this.isImportingMenu = true;

    const uploadMsg = lang === 'TC' ? '上傳文件中...' : 'Uploading document...';
    const loading = await this.loadingController.create({
      message: `<img src="assets/icon/Eclipse.gif" style="width:48px;height:48px;display:block;margin:0 auto 8px" alt="" />${uploadMsg}`,
      spinner: null
    });
    await loading.present();

    try {
      const token = await this.feature.auth.getIdToken();
      if (!token) {
        throw new Error(lang === 'TC' ? '無法獲取身份驗證令牌' : 'Failed to get authentication token');
      }

      // Construct multipart form body
      const formData = new FormData();
      formData.append('file', this.selectedMenuDocument);

      // Single unified endpoint — server handles DocuPipe job creation and polling
      const response = await fetch(`${environment.apiUrl}/API/DocuPipe/extract-menu`, {
        method: 'POST',
        headers: {
          'x-api-passcode': 'PourRice',
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      const extractedData = await response.json();
      console.log('BulkMenuImportModal: extraction complete, raw data:', extractedData);

      // Parse the server response into a normalised MenuItem array
      this.extractedMenuItems = this.parseDocuPipeMenuItems(extractedData);

      await loading.dismiss();

      if (this.extractedMenuItems.length === 0) {
        await this.showToast(
          lang === 'TC' ? '未能提取到菜單項目' : 'No menu items extracted',
          'warning'
        );
      } else {
        await this.showToast(
          lang === 'TC'
            ? `成功提取 ${this.extractedMenuItems.length} 個菜單項目`
            : `Successfully extracted ${this.extractedMenuItems.length} menu items`,
          'success'
        );
        // Show the review table so the user can inspect and edit before saving
        this.showExtractedItemsReview = true;
      }

      this.isImportingMenu = false;

    } catch (error: any) {
      console.error('BulkMenuImportModal: upload error:', error);
      await loading.dismiss();
      await this.showToast(
        error.message || (lang === 'TC' ? '文件上傳失敗' : 'Document upload failed'),
        'danger'
      );
      this.isImportingMenu = false;
    }
  }

  // Normalise the DocuPipe API response to an array of Partial<MenuItem>.
  // Handles the current { menu_items: [...] } format and the legacy workflow response format.
  private parseDocuPipeMenuItems(data: any): Partial<MenuItem>[] {
    const items: Partial<MenuItem>[] = [];

    // Primary format: server wraps items under a menu_items key
    if (data.menu_items && Array.isArray(data.menu_items)) {
      for (const item of data.menu_items) {
        items.push({
          Name_EN:        item.Name_EN        || null,
          Name_TC:        item.Name_TC        || null,
          Description_EN: item.Description_EN || null,
          Description_TC: item.Description_TC || null,
          price:          this.parsePrice(item.price),
          imageUrl:       item.image          || null
        });
      }
      return items;
    }

    // Legacy format: data nested inside workflowResponse or result
    const workflowData = data.workflowResponse?.data || data.result?.data;
    if (workflowData && Array.isArray(workflowData)) {
      for (const item of workflowData) {
        items.push({
          Name_EN:        item.name_en || item.name || item.Name_EN || null,
          Name_TC:        item.name_tc || item.Name_TC              || null,
          Description_EN: item.description_en || item.description || item.Description_EN || null,
          Description_TC: item.description_tc || item.Description_TC || null,
          price:          this.parsePrice(item.price),
          imageUrl:       item.image || item.imageUrl               || null
        });
      }
      return items;
    }

    // Fallback: parse plain text — look for lines containing a price token
    const text = data.result?.text || '';
    for (const line of text.split('\n').filter((l: string) => l.trim())) {
      const priceMatch = line.match(/\$?(\d+(?:\.\d{2})?)/);
      if (priceMatch) {
        const name = line.replace(priceMatch[0], '').trim();
        if (name) {
          items.push({
            Name_EN: name, Name_TC: null,
            Description_EN: null, Description_TC: null,
            price: parseFloat(priceMatch[1]), imageUrl: null
          });
        }
      }
    }
    return items;
  }

  // Convert a price value (string or number) to a number, returning null on failure.
  private parsePrice(value: any): number | null {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return null;
    const parsed = parseFloat(value.replace(/[^0-9.]/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  // Remove an extracted item row from the review table before saving.
  removeExtractedItem(index: number): void {
    this.extractedMenuItems.splice(index, 1);
  }

  // Reset the import flow and close the review table.
  cancelImport(): void {
    this.showExtractedItemsReview = false;
    this.extractedMenuItems = [];
    this.selectedMenuDocument = null;
    this.isImportingMenu = false;
    const input = document.getElementById('bulk-import-file-input') as HTMLInputElement;
    if (input) input.value = '';
  }

  // Save every item in the review table to the Firestore menu sub-collection.
  // Items are created sequentially; partial failures are reported but don't abort the batch.
  async saveExtractedMenuItems(): Promise<void> {
    if (!this.restaurantId || this.extractedMenuItems.length === 0) return;

    const lang = this.currentLanguage;
    const saveMsg = lang === 'TC' ? '儲存菜單項目中...' : 'Saving menu items...';
    const loading = await this.loadingController.create({
      message: `<img src="assets/icon/Eclipse.gif" style="width:48px;height:48px;display:block;margin:0 auto 8px" alt="" />${saveMsg}`,
      spinner: null
    });
    await loading.present();

    try {
      let successCount = 0;
      let failCount = 0;

      for (const item of this.extractedMenuItems) {
        try {
          await this.feature.restaurants.createMenuItem(this.restaurantId, item).toPromise();
          successCount++;
        } catch (error) {
          console.error('BulkMenuImportModal: failed to save item:', item, error);
          failCount++;
        }
      }

      await loading.dismiss();

      if (successCount > 0) {
        const failSuffix = failCount > 0
          ? (lang === 'TC' ? `，${failCount} 個失敗` : `, ${failCount} failed`)
          : '';
        await this.showToast(
          lang === 'TC'
            ? `成功儲存 ${successCount} 個項目${failSuffix}`
            : `Saved ${successCount} items${failSuffix}`,
          failCount > 0 ? 'warning' : 'success'
        );
      } else {
        await this.showToast(lang === 'TC' ? '儲存失敗' : 'Failed to save items', 'danger');
      }

      // Signal parent to reload menu list and close this modal
      this.modalController.dismiss({ imported: successCount > 0 });

    } catch (error: any) {
      console.error('BulkMenuImportModal: batch save error:', error);
      await loading.dismiss();
      await this.showToast(error.message || (lang === 'TC' ? '儲存失敗' : 'Save failed'), 'danger');
    }
  }


  // Show a brief bottom toast.
  private async showToast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 3000, position: 'bottom', color });
    await toast.present();
  }
}
