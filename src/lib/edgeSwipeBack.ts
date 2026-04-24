import { hapticTap } from "@/lib/native";

/**
 * iOS-style edge swipe-back gesture. Listen for touchstart near the left edge,
 * track horizontal travel, and trigger window.history.back() on release if the
 * user has swiped past a threshold. No-op when there's no history to go back to.
 *
 * Mounted globally from main.tsx for native shells.
 */
export function installEdgeSwipeBack(): void {
  const EDGE_PX = 24;
  const TRIGGER_PX = 80;
  const TRIGGER_VELOCITY = 0.4; // px/ms

  let startX = 0;
  let startY = 0;
  let startT = 0;
  let tracking = false;
  let triggered = false;

  const onStart = (e: TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    if (t.clientX > EDGE_PX) return;
    if (window.history.length <= 1) return;
    startX = t.clientX;
    startY = t.clientY;
    startT = performance.now();
    tracking = true;
    triggered = false;
  };

  const onMove = (e: TouchEvent) => {
    if (!tracking) return;
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    // Cancel if the user is mostly scrolling vertically.
    if (Math.abs(dy) > Math.abs(dx) + 8) {
      tracking = false;
      return;
    }
    if (!triggered && dx > 24) {
      hapticTap();
      triggered = true;
    }
  };

  const onEnd = (e: TouchEvent) => {
    if (!tracking) return;
    tracking = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX;
    const dt = Math.max(1, performance.now() - startT);
    const v = dx / dt;
    if (dx > TRIGGER_PX || v > TRIGGER_VELOCITY) {
      window.history.back();
    }
  };

  document.addEventListener("touchstart", onStart, { passive: true });
  document.addEventListener("touchmove", onMove, { passive: true });
  document.addEventListener("touchend", onEnd, { passive: true });
}
