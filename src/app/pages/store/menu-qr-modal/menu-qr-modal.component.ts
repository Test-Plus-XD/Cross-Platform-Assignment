// MenuQrModalComponent — generates a QR code encoding the restaurant menu deep link.
// Uses the 'qrcode' npm package (already in package.json) to draw onto a <canvas>.
// Deep-link format: pourrice://menu/{restaurantId}
// Features: display QR, expand full-screen view, download as PNG.
import { Component, Input, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { ModalController } from '@ionic/angular';
import QRCode from 'qrcode';

@Component({
  selector: 'app-menu-qr-modal',
  templateUrl: './menu-qr-modal.component.html',
  styleUrls: ['./menu-qr-modal.component.scss'],
  standalone: false,
})
export class MenuQrModalComponent implements AfterViewInit {
  @Input() restaurantId!: string;
  @Input() restaurantName!: string;
  @Input() lang: 'EN' | 'TC' = 'EN';

  @ViewChild('qrCanvas') qrCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('qrCanvasExpanded') qrCanvasExpanded!: ElementRef<HTMLCanvasElement>;

  isExpanded = false;
  isExporting = false;

  get deepLinkUrl(): string {
    return `pourrice://menu/${this.restaurantId}`;
  }

  constructor(private readonly modalController: ModalController) {}

  ngAfterViewInit(): void {
    this.renderQr(this.qrCanvas, 200);
  }

  expandQr(): void {
    this.isExpanded = true;
    // Allow Angular to render the expanded canvas before drawing
    setTimeout(() => this.renderQr(this.qrCanvasExpanded, 300), 50);
  }

  closeExpanded(): void {
    this.isExpanded = false;
  }

  async downloadQr(): Promise<void> {
    this.isExporting = true;
    try {
      // Generate a high-res data URL for download
      const dataUrl = await QRCode.toDataURL(this.deepLinkUrl, {
        width: 600,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: { dark: '#000000', light: '#ffffff' },
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `pourrice_menu_qr_${this.restaurantId}.png`;
      link.click();
    } catch (err) {
      console.error('[MenuQrModal] download failed', err);
    } finally {
      this.isExporting = false;
    }
  }

  dismiss(): void {
    this.modalController.dismiss();
  }

  // Renders the QR code onto the given canvas reference at the specified size.
  private async renderQr(ref: ElementRef<HTMLCanvasElement>, size: number): Promise<void> {
    if (!ref?.nativeElement) return;
    await QRCode.toCanvas(ref.nativeElement, this.deepLinkUrl, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#000000', light: '#ffffff' },
    });
  }
}
