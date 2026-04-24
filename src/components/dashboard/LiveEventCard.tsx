import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getTeamByNumber, getTeamEvents } from "@/lib/robotevents";
import { useSeason } from "@/contexts/SeasonContext";
import { Radio, MapPin, Calendar, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const DISMISS_KEY = "live-event-dismissed";

interface Props {
  teamNumber: string;
}

/**
 * Shows a "Live Event" card on the dashboard from 24h before through
 * 24h after a team's event. Clicking jumps straight into Comp Mode on
 * the event page.
 */
export function LiveEventCard({ teamNumber }: Props) {
  const { season } = useSeason();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(DISMISS_KEY);
      if (stored) setDismissedIds(new Set(JSON.parse(stored)));
    } catch {}
  }, []);

  const { data: teamData } = useQuery({
    queryKey: ["liveEventTeam", teamNumber],
    queryFn: () => getTeamByNumber(teamNumber),
    enabled: !!teamNumber,
  });

  const { data: events } = useQuery({
    queryKey: ["liveEventEvents", teamData?.id, season],
    queryFn: () => getTeamEvents(teamData!.id, season),
    enabled: !!teamData?.id,
  });

  // Find an event happening within 24h before -> 24h after
  const liveEvent = (() => {
    if (!events) return null;
    const now = Date.now();
    const window24h = 24 * 60 * 60 * 1000;
    return (
      events.find((e: any) => {
        const start = new Date(e.start).getTime();
        const end = new Date(e.end || e.start).getTime();
        return start - window24h <= now && now <= end + window24h;
      }) || null
    );
  })();

  if (!liveEvent || dismissedIds.has(String(liveEvent.id))) return null;

  const start = new Date(liveEvent.start);
  const end = new Date(liveEvent.end || liveEvent.start);
  const now = new Date();
  const isOngoing = now >= start && now <= end;
  const isStartingSoon = now < start;
  const isJustEnded = now > end;

  let statusLabel = "Live now";
  if (isStartingSoon) {
    const hrs = Math.round((start.getTime() - now.getTime()) / (60 * 60 * 1000));
    statusLabel = `Starts in ${hrs}h`;
  } else if (isJustEnded) {
    statusLabel = "Just ended";
  }

  const dismiss = () => {
    const next = new Set(dismissedIds);
    next.add(String(liveEvent.id));
    setDismissedIds(next);
    sessionStorage.setItem(DISMISS_KEY, JSON.stringify(Array.from(next)));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card p-4 md:p-5"
    >
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="relative shrink-0 mt-1">
          <Radio className="h-5 w-5 text-primary" />
          {isOngoing && (
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              {statusLabel}
            </span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground">Comp Mode ready</span>
          </div>
          <h3 className="font-display font-bold text-base mt-0.5 truncate">
            {liveEvent.name}
          </h3>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
            {liveEvent.location?.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {liveEvent.location.city}
                {liveEvent.location.region ? `, ${liveEvent.location.region}` : ""}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {end.toDateString() !== start.toDateString() &&
                ` – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
            </span>
          </div>
          <div className="mt-3">
            <Link to={`/event/${liveEvent.id}?comp=1`}>
              <Button size="sm" variant="hero" className="gap-1.5">
                Open Comp Mode <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
