import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'Cross Platform Assignment',
  webDir: 'www',
  server: {
    // Use https scheme so Firebase Auth redirect flow works inside the WebView
    androidScheme: 'https',
    // Allow navigation to OAuth and Firebase domains for in-app browser tabs
    allowNavigation: [
      'accounts.google.com',
      '*.firebaseapp.com',
      '*.googleapis.com'
    ]
  }
};

export default config;
