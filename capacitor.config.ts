import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.azerad.roborankscouter",
  appName: "RoboRank Scouter",
  webDir: "dist",
  server: {
    url: "https://67947d7f-ea74-423c-831a-bddd9b1760dd.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#0b0f1a",
  },
  android: {
    backgroundColor: "#0b0f1a",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0b0f1a",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0b0f1a",
    },
    Keyboard: {
      resize: "native",
      style: "DARK",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
