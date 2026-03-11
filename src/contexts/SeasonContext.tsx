import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { SeasonKey } from "@/lib/robotevents";

export type GradeLevel = "High School" | "Middle School" | "Both";

interface SeasonContextType {
  season: SeasonKey;
  setSeason: (s: SeasonKey) => void;
  gradeLevel: GradeLevel;
  setGradeLevel: (g: GradeLevel) => void;
}

const SeasonContext = createContext<SeasonContextType>({
  season: "current",
  setSeason: () => {},
  gradeLevel: "Both",
  setGradeLevel: () => {},
});

export function SeasonProvider({ children }: { children: ReactNode }) {
  const [season, setSeason] = useState<SeasonKey>(() => {
    return (localStorage.getItem("roborank-season") as SeasonKey) || "current";
  });

  const [gradeLevel, setGradeLevel] = useState<GradeLevel>(() => {
    return (localStorage.getItem("roborank-grade") as GradeLevel) || "Both";
  });

  useEffect(() => {
    localStorage.setItem("roborank-season", season);
  }, [season]);

  useEffect(() => {
    localStorage.setItem("roborank-grade", gradeLevel);
  }, [gradeLevel]);

  return (
    <SeasonContext.Provider value={{ season, setSeason, gradeLevel, setGradeLevel }}>
      {children}
    </SeasonContext.Provider>
  );
}

export function useSeason() {
  return useContext(SeasonContext);
}
