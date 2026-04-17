// QrScannerModalComponent — scans QR codes encoding pourrice://menu/{restaurantId}
// deep links and navigates to the corresponding restaurant page.
//
// Platform strategy:
//   Native (iOS / Android):  @capacitor-mlkit/barcode-scanning startScan() with
//                             transparent WebView so the native camera shows through.
//   Web (PWA / browser):     getUserMedia() + BarcodeDetector API (Chrome / Edge 83+).
//                             Falls back to an error message if BarcodeDetector is absent.
//
// On a successful scan the modal dismisses itself and navigates to /restaurant/:id.
import { Component, OnInit, OnDestroy, Input, ViewChild, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, ToastController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import {
  BarcodeScanner,
  BarcodeFormat,
  BarcodesScannedEvent,
} from '@capacitor-mlkit/barcode-scanning';
import { RestaurantsService } from '../../services/restaurants.service';
import { ThemeService } from '../../services/theme.service';
import jsQR from 'jsqr';

// BarcodeDetector is a browser API not yet in the TS lib — declare it locally
declare const BarcodeDetector: {
  new (options: { formats: string[] }): {
    detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
  };
  getSupportedFormats(): Promise<string[]>;
};

@Component({
  selector: 'app-qr-scanner-modal',
  templateUrl: './qr-scanner-modal.component.html',
  styleUrls: ['./qr-scanner-modal.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrScannerModalComponent implements OnInit, OnDestroy {
  private static readonly MAX_IMAGE_DECODE_DIMENSION = 1600;

  private readonly modalController = inject(ModalController);
  private readonly toastController = inject(ToastController);
  private readonly router = inject(Router);
  private readonly restaurantsService = inject(RestaurantsService);
  private readonly themeService = inject(ThemeService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() lang: 'EN' | 'TC' = 'EN';

  @ViewChild('videoEl') videoEl?: ElementRef<HTMLVideoElement>;

  // True when running in a Capacitor native shell (iOS / Android)
  readonly isNative = Capacitor.isNativePlatform();
  isUnsupportedWebMode = false;
  isNativeCameraFallback = false;

  // Web scanner state
  hasBarcodeDetector = false;
  isDecodingImage = false;
  private isImageScanInProgress = false;
  private isLiveScanPaused = false;
  private webStream: MediaStream | null = null;
  private webDetector: InstanceType<typeof BarcodeDetector> | null = null;
  private scanInterval: ReturnType<typeof setInterval> | null = null;

  // Shared state
  isProcessing = false;
  torchEnabled = false;
  private isDismissed = false;
  private isDestroyed = false;
  private nativeListener: { remove: () => Promise<void> } | null = null;
  private hasTemporaryLightThemeOverride = false;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {}

  async ngOnInit(): Promise<void> {
    if (this.isNative) {
      await this.startNativeScanner();
    } else {
      await this.startWebScanner();
    }
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.cleanup();
  }

  // ── Native scanner ────────────────────────────────────────────────────────

  private async startNativeScanner(): Promise<void> {
    try {
      this.isNativeCameraFallback = false;
      const { supported } = await BarcodeScanner.isSupported();
      if (!supported) {
        this.isNativeCameraFallback = true;
        this.cdr.markForCheck();
        await this.showToast(
          this.lang === 'TC'
            ? '此裝置不支援 QR 掃描'
            : 'QR scanning is not supported on this device',
          'warning',
        );
        return;
      }

      await BarcodeScanner.requestPermissions();

      // Make WebView transparent so the native camera shows through.
      // .barcode-scanner-active hides all non-modal elements (see src/style/global.scss).
      document.documentElement.classList.add('barcode-scanner-active');

      this.nativeListener = await BarcodeScanner.addListener(
        'barcodesScanned',
        (event: BarcodesScannedEvent) => {
          if (this.isImageScanInProgress || this.isLiveScanPaused) {
            return;
          }
          const scannedValue = event.barcodes[0]?.rawValue;
          if (scannedValue) {
            this.handleScannedValue(scannedValue);
          }
        },
      );

      await BarcodeScanner.startScan({ formats: [BarcodeFormat.QrCode] });
      this.applyTemporaryLightThemeOverride();
    } catch (err) {
      console.error('[QrScanner] native start error', err);
      this.cleanup();
      this.isNativeCameraFallback = true;
      this.cdr.markForCheck();
      await this.showToast(
        this.lang === 'TC' ? '無法啟動相機' : 'Failed to start camera',
        'danger',
      );
    }
  }

  async toggleTorch(): Promise<void> {
    try {
      await BarcodeScanner.toggleTorch();
      this.torchEnabled = !this.torchEnabled;
      this.cdr.markForCheck();
    } catch {
      // Some devices do not support torch — silently ignore
    }
  }

  // ── Web scanner ───────────────────────────────────────────────────────────

  private async startWebScanner(): Promise<void> {
    // Check BarcodeDetector availability (Chrome / Edge 83+)
    if (typeof BarcodeDetector === 'undefined') {
      this.hasBarcodeDetector = false;
      this.isUnsupportedWebMode = true;
      this.cdr.markForCheck();
      return;
    }

    try {
      const formats = await BarcodeDetector.getSupportedFormats();
      if (!formats.includes('qr_code')) {
        this.hasBarcodeDetector = false;
        this.isUnsupportedWebMode = true;
        this.cdr.markForCheck();
        return;
      }
      this.hasBarcodeDetector = true;
      this.isUnsupportedWebMode = false;
      this.cdr.markForCheck();

      this.webDetector = new BarcodeDetector({ formats: ['qr_code'] });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      });
      this.webStream = stream;

      // Wait one tick for the template to render the <video> element
      setTimeout(() => {
        if (this.videoEl?.nativeElement) {
          this.videoEl.nativeElement.srcObject = stream;
          this.videoEl.nativeElement.play().then(() => {
            this.applyTemporaryLightThemeOverride();
            this.scanInterval = setInterval(() => this.detectFromVideo(), 400);
          }).catch((error) => {
            console.error('[QrScanner] web video play error', error);
            this.cleanup();
            this.hasBarcodeDetector = false;
            this.isUnsupportedWebMode = true;
            this.cdr.markForCheck();
          });
        }
      }, 100);
    } catch (err) {
      console.error('[QrScanner] web start error', err);
      this.hasBarcodeDetector = false;
      this.isUnsupportedWebMode = true;
      this.cdr.markForCheck();
    }
  }

  private async detectFromVideo(): Promise<void> {
    if (
      !this.webDetector ||
      !this.videoEl?.nativeElement ||
      this.isProcessing ||
      this.isImageScanInProgress ||
      this.isLiveScanPaused
    ) return;
    const video = this.videoEl.nativeElement;
    if (video.readyState < video.HAVE_ENOUGH_DATA) return;

    try {
      const results = await this.webDetector.detect(video);
      if (results.length > 0) {
        this.handleScannedValue(results[0].rawValue);
      }
    } catch {
      // Detect errors are transient (e.g. empty frame) — ignore
    }
  }

  // ── Shared scan handler ───────────────────────────────────────────────────

  async onImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file || this.isImageScanInProgress || this.isProcessing) return;

    this.isImageScanInProgress = true;
    this.isLiveScanPaused = true;
    this.isDecodingImage = true;
    this.cdr.markForCheck();

    try {
      const raw = await this.decodeQrFromImage(file);
      if (!raw) {
        throw new Error(
          this.lang === 'TC'
            ? '圖片中找不到可讀取的二維碼'
            : 'No readable QR code found in the image',
        );
      }
      this.isDecodingImage = false;
      this.cdr.markForCheck();

      if (this.isDismissed || this.isDestroyed) {
        return;
      }

      await this.handleScannedValue(raw);
    } catch (err: unknown) {
      if (this.isDismissed || this.isDestroyed) {
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      await this.showToast(msg, 'danger');
    } finally {
      this.isImageScanInProgress = false;
      this.isLiveScanPaused = false;
      this.isDecodingImage = false;
      if (input) {
        input.value = '';
      }
      this.cdr.markForCheck();
    }
  }

  private decodeQrFromImage(file: File): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);

      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDimension = QrScannerModalComponent.MAX_IMAGE_DECODE_DIMENSION;
          const scale = Math.min(
            1,
            maxDimension / Math.max(image.naturalWidth, image.naturalHeight),
          );
          const scaledWidth = Math.max(1, Math.floor(image.naturalWidth * scale));
          const scaledHeight = Math.max(1, Math.floor(image.naturalHeight * scale));

          canvas.width = scaledWidth;
          canvas.height = scaledHeight;
          const context = canvas.getContext('2d');
          if (!context) {
            reject(
              new Error(
                this.lang === 'TC' ? '無法讀取圖片內容' : 'Failed to read image',
              ),
            );
            return;
          }

          context.drawImage(image, 0, 0, scaledWidth, scaledHeight);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const qrResult = jsQR(imageData.data, imageData.width, imageData.height);
          resolve(qrResult?.data ?? null);
        } catch (err) {
          reject(err);
        } finally {
          URL.revokeObjectURL(url);
        }
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(
          new Error(
            this.lang === 'TC'
              ? '無法載入圖片，請重試'
              : 'Unable to load image, please try again',
          ),
        );
      };

      image.src = url;
    });
  }

  private async handleScannedValue(raw: string): Promise<void> {
    if (this.isProcessing || !raw || this.isDismissed || this.isDestroyed) return;
    this.isProcessing = true;
    this.cdr.markForCheck();

    try {
      // Validate format: pourrice://menu/{restaurantId}
      const url = new URL(raw);
      const isValid =
        url.protocol === 'pourrice:' &&
        url.hostname === 'menu' &&
        url.pathname.length > 1; // pathname is "/{restaurantId}"

      if (!isValid) {
        throw new Error(
          this.lang === 'TC' ? '此二維碼格式不正確' : 'Invalid QR code format',
        );
      }

      // Extract restaurantId — pathname is "/{restaurantId}"
      const restaurantId = url.pathname.replace(/^\//, '');

      // Verify the restaurant exists before navigating
      const restaurant = await this.restaurantsService
        .getRestaurantById(restaurantId)
        .toPromise();

      if (!restaurant) {
        throw new Error(
          this.lang === 'TC' ? '找不到此餐廳' : 'Restaurant not found',
        );
      }

      // Stop scanning before navigating
      this.cleanup();

      // Dismiss modal then navigate so the route change happens outside the modal
      this.isDismissed = true;
      await this.modalController.dismiss({ restaurantId });
      await this.router.navigate(['/restaurant', restaurantId]);
    } catch (err: unknown) {
      if (this.isDismissed || this.isDestroyed) return;
      const msg = err instanceof Error ? err.message : String(err);
      await this.showToast(msg, 'danger');
      this.isProcessing = false;
      this.cdr.markForCheck();
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  private cleanup(): void {
    this.clearTemporaryLightThemeOverride();

    // Native teardown
    if (this.isNative) {
      document.documentElement.classList.remove('barcode-scanner-active');
      BarcodeScanner.stopScan().catch(() => {});
      this.nativeListener?.remove().catch(() => {});
      this.nativeListener = null;
    }

    // Web teardown
    if (this.scanInterval !== null) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    if (this.webStream) {
      this.webStream.getTracks().forEach(t => t.stop());
      this.webStream = null;
    }
    this.webDetector = null;
  }

  dismissModal(): void {
    this.isDismissed = true;
    this.cleanup();
    this.modalController.dismiss();
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top',
    });
    await toast.present();
  }

  // Applies a temporary light-theme override whilst the live camera view is active.
  private applyTemporaryLightThemeOverride(): void {
    if (this.hasTemporaryLightThemeOverride) return;

    this.themeService.setTemporaryThemeOverride(false);
    this.hasTemporaryLightThemeOverride = true;
  }

  // Restores the saved theme once the live camera session ends or falls back.
  private clearTemporaryLightThemeOverride(): void {
    if (!this.hasTemporaryLightThemeOverride) return;

    this.themeService.clearTemporaryThemeOverride();
    this.hasTemporaryLightThemeOverride = false;
  }
}