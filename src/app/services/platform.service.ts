// Service to detect the current platform (mobile or web)
import { Injectable } from '@angular/core';

export type PlatformType = 'mobile' | 'web';

@Injectable({ providedIn: 'root' })
export class PlatformService {
  private _platform: PlatformType;

  constructor() {
    this._platform = this.detectPlatform();
  }

  // Public getter for other services/components
  get platform(): PlatformType {
    return this._platform;
  }

  // Returns true if mobile, false if web
  get isMobile(): boolean {
    return this._platform === 'mobile';
  }

  get isWeb(): boolean {
    return this._platform === 'web';
  }

  // Detect platform based on environment & user-agent
  private detectPlatform(): PlatformType {
    try {
      // Check if running in a Capacitor or Cordova mobile environment
      const win = window as any;
      if ((win?.Capacitor && win.Capacitor.isNativePlatform?.()) || win?.cordova) {
        return 'mobile';
      }

      // Fallback: user-agent check for mobile devices
      const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
      if (/android|iphone|ipad|ipod|windows phone/i.test(ua)) {
        return 'mobile';
      }

      // Default to web
      return 'web';
    } catch (err) {
      // On any error, assume web
      console.warn('PlatformService.detectPlatform failed, defaulting to web', err);
      return 'web';
    }
  }
}