import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.cross_platform_assignment',
  appName: 'PourRice',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  }
};

export default config;
