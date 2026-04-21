/**
 * Service worker registration with strict guards.
 *
 * The Lovable preview iframe + cross-origin preview hosts MUST NOT register
 * a service worker — doing so causes stale content and breaks navigation.
 * In those environments we proactively unregister anything that snuck in.
 *
 * In production (the published / custom-domain build) the service worker
 * is registered automatically by vite-plugin-pwa via the virtual module.
 */

const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true; // cross-origin block → treat as iframe
  }
})();

const host = window.location.hostname;
const isPreviewHost =
  host.includes("id-preview--") ||
  host.includes("lovableproject.com") ||
  host.endsWith(".lovable.app") === false && host.includes("lovable");

// Treat *.lovable.app as a real published host (allow SW), but the editor
// preview (id-preview--*.lovable.app) is still caught by the first check.

const shouldRegister = !isInIframe && !host.startsWith("id-preview--");

if (!shouldRegister) {
  // Defensively unregister anything already installed — fixes "stale app"
  // bugs when editing the same project across preview + production.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
  }
} else {
  // Lazy-load the virtual module so we don't pull workbox runtime on
  // preview/iframe sessions where it's never used.
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {
      /* virtual module unavailable in dev — fine */
    });
}

export {};
