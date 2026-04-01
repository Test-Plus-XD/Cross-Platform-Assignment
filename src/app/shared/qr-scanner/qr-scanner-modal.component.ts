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
import {
  Component, OnInit, OnDestroy, Input,
  ViewChild, ElementRef, ChangeDetectionStrategy, ChangeDetectorRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { ModalController, ToastController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import {
  BarcodeScanner,
  BarcodeFormat,
  BarcodeScannedEvent,
} from '@capacitor-mlkit/barcode-scanning';
import { RestaurantsService } from '../../services/restaurants.service';

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
  @Input() lang: 'EN' | 'TC' = 'EN';

  @ViewChild('videoEl') videoEl?: ElementRef<HTMLVideoElement>;

  // True when running in a Capacitor native shell (iOS / Android)
  readonly isNative = Capacitor.isNativePlatform();

  // Web scanner state
  hasBarcodeDetector = false;
  private webStream: MediaStream | null = null;
  private webDetector: InstanceType<typeof BarcodeDetector> | null = null;
  private scanInterval: ReturnType<typeof setInterval> | null = null;

  // Shared state
  isProcessing = false;
  torchEnabled = false;
  private nativeListener: { remove: () => Promise<void> } | null = null;

  constructor(
    private readonly modalController: ModalController,
    private readonly toastController: ToastController,
    private readonly router: Router,
    private readonly restaurantsService: RestaurantsService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    if (this.isNative) {
      await this.startNativeScanner();
    } else {
      await this.startWebScanner();
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  // ── Native scanner ────────────────────────────────────────────────────────

  private async startNativeScanner(): Promise<void> {
    try {
      const { supported } = await BarcodeScanner.isSupported();
      if (!supported) {
        await this.showToast(
          this.lang === 'TC'
            ? '此裝置不支援 QR 掃描'
            : 'QR scanning is not supported on this device',
          'warning',
        );
        this.dismissModal();
        return;
      }

      await BarcodeScanner.requestPermissions();

      // Make WebView transparent so the native camera shows through.
      // .barcode-scanner-active hides all non-modal elements (see global.scss).
      document.documentElement.classList.add('barcode-scanner-active');

      this.nativeListener = await BarcodeScanner.addListener(
        'barcodeScanned',
        (event: BarcodeScannedEvent) => this.handleScannedValue(event.barcode.rawValue),
      );

      await BarcodeScanner.startScan({ formats: [BarcodeFormat.QrCode] });
    } catch (err) {
      console.error('[QrScanner] native start error', err);
      await this.showToast(
        this.lang === 'TC' ? '無法啟動相機' : 'Failed to start camera',
        'danger',
      );
      this.dismissModal();
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
      this.cdr.markForCheck();
      return;
    }

    try {
      const formats = await BarcodeDetector.getSupportedFormats();
      if (!formats.includes('qr_code')) {
        this.hasBarcodeDetector = false;
        this.cdr.markForCheck();
        return;
      }
      this.hasBarcodeDetector = true;
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
            this.scanInterval = setInterval(() => this.detectFromVideo(), 400);
          });
        }
      }, 100);
    } catch (err) {
      console.error('[QrScanner] web start error', err);
      this.hasBarcodeDetector = false;
      this.cdr.markForCheck();
    }
  }

  private async detectFromVideo(): Promise<void> {
    if (!this.webDetector || !this.videoEl?.nativeElement || this.isProcessing) return;
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

  private async handleScannedValue(raw: string): Promise<void> {
    if (this.isProcessing || !raw) return;
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
      await this.modalController.dismiss({ restaurantId });
      await this.router.navigate(['/restaurant', restaurantId]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.showToast(msg, 'danger');
      this.isProcessing = false;
      this.cdr.markForCheck();
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  private cleanup(): void {
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
}
