import { CapacitorConfig } from '@capacitor/cli';

const config = {
  appId: 'com.kcdl.admin',
  appName: 'KCDL Admin',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  plugins: {
    SplashScreen: { launchShowDuration: 0 },
  },
};

export default config;
