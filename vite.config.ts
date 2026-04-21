import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      // CRITICAL: never run the service worker during development — it
      // causes stale content + navigation interference inside the
      // Lovable preview iframe.
      devOptions: { enabled: false },
      manifest: false, // we ship our own /public/manifest.webmanifest
      includeAssets: [
        "icon-192.png",
        "icon-512.png",
        "icon-maskable-512.png",
        "apple-touch-icon.png",
        "manifest.webmanifest",
      ],
      workbox: {
        // Don't intercept OAuth callbacks or any backend function paths.
        navigateFallbackDenylist: [/^\/~oauth/, /^\/functions\//],
        // Cache the app shell + static assets, but always go to the
        // network for the RobotEvents proxy and Supabase API.
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/functions/") ||
              url.hostname.endsWith("supabase.co"),
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
