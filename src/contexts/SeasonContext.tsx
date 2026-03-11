import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { SeasonKey } from "@/lib/robotevents";

interface SeasonContextType {
  season: SeasonKey;
  setSeason: (s: SeasonKey) => void;
}

const SeasonContext = createContext<SeasonContextType>({
  season: "current",
  setSeason: () => {},
});

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [season, setSeason] = useState<SeasonKey>(() => {
    return (localStorage.getItem("roborank-season") as SeasonKey) || "current";
  });

  useEffect(() => {
    localStorage.setItem("roborank-season", season);
  }, [season]);

  return (
    <SeasonContext.Provider value={{ season, setSeason }}>
      {children}
    </SeasonContext.Provider>
  );
}

export function useSeason() {
  return useContext(SeasonContext);
}
