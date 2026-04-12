import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'Cross Platform Assignment',
  webDir: 'www',
  server: {
    // Use https scheme so Firebase Auth redirect flow works inside the WebView
    androidScheme: 'https',
    // Allow navigation to the specific hosts required for Google OAuth + Firebase Auth
    allowNavigation: [
      'accounts.google.com',
      'cross-platform-assignmen-b97cc.firebaseapp.com'
    ]
  }
};

export default config;
