import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, Clock, MapPin as Field, ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface LiveMatchHUDProps {
  matches: any[] | undefined;
  myTeamNumber: string | null;
  eventName: string;
  isLive: boolean;
  lastUpdated?: Date | null;
}

function roundLabel(round: number): string {
  switch (round) {
    case 1: return "Practice";
    case 2: return "Qual";
    case 3: return "R16";
    case 4: return "QF";
    case 5: return "SF";
    case 6: return "Final";
    default: return `R${round}`;
  }
}

function formatCountdown(ms: number): { text: string; urgent: boolean } {
  if (ms <= 0) return { text: "On now", urgent: true };
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return { text: `${h}h ${m}m`, urgent: false };
  if (m >= 5) return { text: `${m}m`, urgent: false };
  if (m > 0) return { text: `${m}m ${s.toString().padStart(2, "0")}s`, urgent: true };
  return { text: `${s}s`, urgent: true };
}

export function LiveMatchHUD({ matches, myTeamNumber, eventName, isLive, lastUpdated }: LiveMatchHUDProps) {
  const [now, setNow] = useState(() => Date.now());
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Find my team's matches and split into upcoming / current / past
  const myMatches = useMemo(() => {
    if (!matches || !myTeamNumber) return [];
    return matches
      .filter((m: any) =>
        m.alliances?.some((a: any) =>
          a.teams?.some((t: any) => t.team?.name === myTeamNumber)
        )
      )
      .sort((a: any, b: any) => {
        const ta = new Date(a.started || a.scheduled || 0).getTime();
        const tb = new Date(b.started || b.scheduled || 0).getTime();
        return ta - tb;
      });
  }, [matches, myTeamNumber]);

  const { nextMatch, onDeck, lastResult } = useMemo(() => {
    let next: any = null;
    let onDeck: any = null;
    let last: any = null;
    for (const m of myMatches) {
      const hasScore = m.alliances?.some((a: any) => (a.score ?? 0) > 0);
      if (hasScore) {
        last = m; // last completed
      } else if (!next) {
        next = m;
      } else if (!onDeck) {
        onDeck = m;
      }
    }
    // walk again to get truly the most recent completed
    for (let i = myMatches.length - 1; i >= 0; i--) {
      const m = myMatches[i];
      const hasScore = m.alliances?.some((a: any) => (a.score ?? 0) > 0);
      if (hasScore) { last = m; break; }
    }
    return { nextMatch: next, onDeck, lastResult: last };
  }, [myMatches, now]);

  if (!myTeamNumber || !nextMatch) return null;

  const sched = new Date(nextMatch.scheduled || nextMatch.started || 0).getTime();
  const diff = sched - now;
  const countdown = formatCountdown(diff);

  const red = nextMatch.alliances?.find((a: any) => a.color === "red");
  const blue = nextMatch.alliances?.find((a: any) => a.color === "blue");
  const onRed = red?.teams?.some((t: any) => t.team?.name === myTeamNumber);
  const myAllianceTeams = (onRed ? red : blue)?.teams?.map((t: any) => t.team?.name).filter(Boolean) || [];
  const partner = myAllianceTeams.find((n: string) => n !== myTeamNumber);
  const oppTeams = (onRed ? blue : red)?.teams?.map((t: any) => t.team?.name).filter(Boolean) || [];
  const myColor = onRed ? "destructive" : "chart-2";
  const oppColor = onRed ? "chart-2" : "destructive";

  const lastRed = lastResult?.alliances?.find((a: any) => a.color === "red");
  const lastBlue = lastResult?.alliances?.find((a: any) => a.color === "blue");
  const lastOnRed = lastRed?.teams?.some((t: any) => t.team?.name === myTeamNumber);
  const myLastScore = (lastOnRed ? lastRed?.score : lastBlue?.score) ?? 0;
  const oppLastScore = (lastOnRed ? lastBlue?.score : lastRed?.score) ?? 0;
  const lastWon = myLastScore > oppLastScore;
  const lastTied = myLastScore === oppLastScore;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "sticky top-2 z-30 rounded-2xl overflow-hidden",
        "border border-primary/40 bg-gradient-to-br from-primary/15 via-card/95 to-card/95 backdrop-blur-md",
        "shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.4)]"
      )}
    >
      {/* Header strip */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center gap-2 px-4 py-2 border-b border-border/30 bg-card/40 hover:bg-card/60 transition-colors"
      >
        <div className="relative">
          <Radio className="h-3.5 w-3.5 text-primary" />
          {isLive && (
            <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          )}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
          {isLive ? "Live event" : "Match queue"}
        </span>
        <span className="text-xs text-muted-foreground truncate hidden sm:inline">
          · Team {myTeamNumber}
        </span>
        {lastUpdated && (
          <span className="text-[10px] text-muted-foreground ml-auto mr-1 tabular-nums">
            updated {Math.max(0, Math.floor((now - lastUpdated.getTime()) / 1000))}s ago
          </span>
        )}
        {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="px-4 py-3 space-y-3">
              {/* Countdown row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className={cn("h-4 w-4", countdown.urgent ? "text-primary animate-pulse" : "text-muted-foreground")} />
                  <div>
                    <div className={cn("font-display font-bold tabular-nums leading-none", countdown.urgent ? "text-2xl text-primary" : "text-xl")}>
                      {countdown.text}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                      {nextMatch.name || `${roundLabel(nextMatch.round)} ${nextMatch.matchnum}`}
                      {nextMatch.field && (
                        <span className="ml-1.5 inline-flex items-center gap-1">
                          <Field className="h-2.5 w-2.5" /> {nextMatch.field}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {onDeck && (
                  <div className="text-right text-[10px] text-muted-foreground">
                    <div className="uppercase tracking-wider">Then</div>
                    <div className="font-medium">
                      {onDeck.name || `${roundLabel(onDeck.round)} ${onDeck.matchnum}`}
                    </div>
                  </div>
                )}
              </div>

              {/* Alliance vs alliance */}
              <div className="flex items-center gap-2 text-sm">
                <div className={cn(
                  "flex-1 rounded-lg border px-3 py-2",
                  onRed
                    ? "border-destructive/40 bg-destructive/10"
                    : "border-[hsl(var(--chart-2))]/40 bg-[hsl(var(--chart-2))]/10"
                )}>
                  <div className="text-[9px] uppercase tracking-wider opacity-70 mb-0.5">Your alliance</div>
                  <div className="font-display font-bold tabular-nums">
                    <span className={cn("text-base", `text-[hsl(var(--${myColor}))]`)}>{myTeamNumber}</span>
                    {partner && <span className="text-foreground/80"> & {partner}</span>}
                  </div>
                </div>
                <span className="text-xs font-bold text-muted-foreground">VS</span>
                <div className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-right",
                  onRed
                    ? "border-[hsl(var(--chart-2))]/40 bg-[hsl(var(--chart-2))]/10"
                    : "border-destructive/40 bg-destructive/10"
                )}>
                  <div className="text-[9px] uppercase tracking-wider opacity-70 mb-0.5">Opponents</div>
                  <div className={cn("font-display font-bold tabular-nums text-sm", `text-[hsl(var(--${oppColor}))]`)}>
                    {oppTeams.join(" & ") || "TBD"}
                  </div>
                </div>
              </div>

              {/* Last result */}
              {lastResult && (
                <div className="flex items-center gap-2 text-xs px-1">
                  <Trophy className={cn("h-3 w-3", lastWon ? "text-[hsl(var(--success))]" : lastTied ? "text-muted-foreground" : "text-destructive")} />
                  <span className="text-muted-foreground">Last:</span>
                  <span className={cn("font-bold tabular-nums", lastWon ? "text-[hsl(var(--success))]" : lastTied ? "text-foreground" : "text-destructive")}>
                    {lastWon ? "WON" : lastTied ? "TIE" : "LOST"} {myLastScore}–{oppLastScore}
                  </span>
                  <span className="text-muted-foreground">
                    · {lastResult.name || `${roundLabel(lastResult.round)} ${lastResult.matchnum}`}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
