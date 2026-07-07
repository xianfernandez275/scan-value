import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.colecscan.app',
  appName: 'ColecScan',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
