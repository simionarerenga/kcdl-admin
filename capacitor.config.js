/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: 'com.kcdl.admin',
  appName: 'KCDL Admin',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#edf2f7',   // matches --bg CSS variable
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

/*
  LAUNCHER ICON NOTE — run once after cloning:
  ─────────────────────────────────────────────
  Copy public/icon_bg.png → resources/icon.png  (1024×1024)
  Copy public/icon_bg.png → resources/splash.png (2732×2732, logo centred)

  Then run:
    npx @capacitor/assets generate \
      --iconBackgroundColor '#edf2f7' \
      --iconBackgroundColorDark '#0d1b2e' \
      --splashBackgroundColor '#edf2f7' \
      --splashBackgroundColorDark '#0d1b2e'

  This regenerates Android/iOS resources so the launcher icon shown on the
  device homescreen is identical to the logo displayed on the React splash screen.
*/

module.exports = config;
