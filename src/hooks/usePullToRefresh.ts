import { useEffect, useRef, useState } from "react";
import { hapticTap, hapticSuccess } from "@/lib/native";

interface Options {
  onRefresh: () => void | Promise<unknown>;
  /** Distance in px the user must drag past before release triggers a refresh. */
  threshold?: number;
  /** Maximum visual pull distance (rubber-band cap). */
  maxPull?: number;
  /** Disable the gesture entirely (e.g. desktop). */
  disabled?: boolean;
}

/**
 * Native-style pull-to-refresh. Attach the returned ref to a scroll container
 * (or rely on document scroll if you pass no ref). Returns the live pull
 * distance and a `refreshing` flag so you can render a spinner.
 *
 * Only activates when the container is scrolled to the very top.
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 70,
  maxPull = 120,
  disabled = false,
}: Options) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const armed = useRef(false);
  const hapticFired = useRef(false);

  useEffect(() => {
    if (disabled) return;
    const target = containerRef.current ?? document.scrollingElement ?? document.documentElement;
    if (!target) return;

    const getScrollTop = () =>
      containerRef.current
        ? containerRef.current.scrollTop
        : window.scrollY || document.documentElement.scrollTop || 0;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      if (getScrollTop() > 0) return;
      startY.current = e.touches[0].clientY;
      armed.current = true;
      hapticFired.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!armed.current || startY.current === null || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        setPull(0);
        return;
      }
      // Rubber-band easing
      const eased = Math.min(maxPull, delta * 0.55);
      setPull(eased);
      if (eased > threshold && !hapticFired.current) {
        hapticTap();
        hapticFired.current = true;
      }
      // Prevent native overscroll once we've taken over
      if (delta > 8 && e.cancelable) e.preventDefault();
    };

    const onTouchEnd = async () => {
      if (!armed.current || refreshing) {
        setPull(0);
        armed.current = false;
        return;
      }
      armed.current = false;
      const shouldRefresh = pull > threshold;
      if (shouldRefresh) {
        setRefreshing(true);
        setPull(threshold);
        try {
          await onRefresh();
          hapticSuccess();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
      startY.current = null;
    };

    const opts: AddEventListenerOptions = { passive: false };
    target.addEventListener("touchstart", onTouchStart as EventListener, { passive: true });
    target.addEventListener("touchmove", onTouchMove as EventListener, opts);
    target.addEventListener("touchend", onTouchEnd as EventListener, { passive: true });
    target.addEventListener("touchcancel", onTouchEnd as EventListener, { passive: true });

    return () => {
      target.removeEventListener("touchstart", onTouchStart as EventListener);
      target.removeEventListener("touchmove", onTouchMove as EventListener);
      target.removeEventListener("touchend", onTouchEnd as EventListener);
      target.removeEventListener("touchcancel", onTouchEnd as EventListener);
    };
  }, [disabled, refreshing, pull, threshold, maxPull, onRefresh]);

  return { containerRef, pull, refreshing, threshold };
}
