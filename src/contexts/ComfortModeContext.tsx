import { createContext, useContext, useEffect, useState } from "react";

type ComfortMode = "default" | "comfort";

interface ComfortModeContextValue {
  mode: ComfortMode;
  setMode: (m: ComfortMode) => void;
  toggle: () => void;
}

const ComfortModeContext = createContext<ComfortModeContextValue | undefined>(undefined);

const STORAGE_KEY = "roborank-comfort-mode";

/**
 * App-wide "comfort mode" — bumps base font size + line-height so the UI is
 * easier to read at a glance, especially on mobile. Persists in localStorage
 * and toggles a class on <html> that index.css hooks into.
 */
export function ComfortModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ComfortMode>(() => {
    if (typeof window === "undefined") return "default";
    return (localStorage.getItem(STORAGE_KEY) as ComfortMode) || "default";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (mode === "comfort") {
      root.classList.add("comfort-mode");
    } else {
      root.classList.remove("comfort-mode");
    }
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const setMode = (m: ComfortMode) => setModeState(m);
  const toggle = () => setModeState((m) => (m === "comfort" ? "default" : "comfort"));

  return (
    <ComfortModeContext.Provider value={{ mode, setMode, toggle }}>
      {children}
    </ComfortModeContext.Provider>
  );
}

export function useComfortMode() {
  const ctx = useContext(ComfortModeContext);
  if (!ctx) throw new Error("useComfortMode must be used within ComfortModeProvider");
  return ctx;
}
