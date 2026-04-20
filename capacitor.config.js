/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: 'com.kcdl.admin',
  appName: 'KCDL Admin',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  plugins: {
    SplashScreen: { launchShowDuration: 0 },
  },
};

module.exports = config;
