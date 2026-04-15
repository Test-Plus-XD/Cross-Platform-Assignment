/// <reference types="@capacitor-firebase/messaging" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.cross_platform_assignment',
  appName: 'PourRice',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    FirebaseMessaging: {
      presentationOptions: ['badge', 'sound']
    },
    SplashScreen: {
      launchShowDuration: 0,
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;
