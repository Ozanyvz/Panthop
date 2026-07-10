import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.simpleonetap.panthop',
  appName: 'Panthop',
  webDir: 'dist',
  backgroundColor: '#0c241a',
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
  ios: {
    contentInset: 'never',
    scrollEnabled: false,
  },
};

export default config;
