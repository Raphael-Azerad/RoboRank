import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

const STORAGE_KEY = "roborank.apiDownBanner.dismissed.v1";

export function ApiDownBanner() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="sticky top-0 z-[60] w-full bg-primary/15 border-b border-primary/30 backdrop-blur-sm">
      <div className="container flex items-start gap-3 py-2.5 px-4 text-xs sm:text-sm">
        <AlertTriangle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 leading-snug">
          <span className="font-semibold text-foreground">Live data is temporarily unavailable.</span>{" "}
          <span className="text-muted-foreground">
            Following the RECF and VEX Robotics split, the RobotEvents API is offline.
            Rankings, events, matches and team data may be missing or stale. You can still
            explore the rest of the app - notes, scouting board, predictor, dashboard and more.
          </span>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss notice"
          className="shrink-0 rounded-md p-1 hover:bg-primary/20 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
