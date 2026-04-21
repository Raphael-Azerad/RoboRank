import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./pwa";
import { Capacitor } from "@capacitor/core";
import { initNative, wireAndroidBackButton } from "./lib/native";

// Tag <html> so CSS can target the native shell specifically.
if (Capacitor.isNativePlatform()) {
  document.documentElement.classList.add("capacitor-native");
  document.documentElement.classList.add(`platform-${Capacitor.getPlatform()}`);
  initNative();
  wireAndroidBackButton();
}

createRoot(document.getElementById("root")!).render(<App />);
