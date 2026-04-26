/**
 * Dashboard layout mode — lightweight preset switcher.
 * Stored in localStorage so it persists per device.
 */
import { useEffect, useState, useCallback } from "react";

export type DashboardMode = "default" | "at-event";

const STORAGE_KEY = "roborank-dashboard-mode";

function readMode(): DashboardMode {
  if (typeof window === "undefined") return "default";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "at-event" ? "at-event" : "default";
}

export function useDashboardMode() {
  const [mode, setModeState] = useState<DashboardMode>(readMode);

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setModeState(readMode());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setMode = useCallback((next: DashboardMode) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setModeState(next);
  }, []);

  return { mode, setMode };
}
