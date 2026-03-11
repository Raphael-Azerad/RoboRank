import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Target, ChevronDown, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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

export function MatchRow({ match, teamNumber }: { match: any; teamNumber: string }) {
  const myAlliance = match.alliances?.find((a: any) =>
    a.teams?.some((t: any) => t.team?.name === teamNumber),
  );
  const oppAlliance = match.alliances?.find((a: any) => a.color !== myAlliance?.color);
  const myScore = myAlliance?.score ?? 0;
  const oppScore = oppAlliance?.score ?? 0;
  const won = myScore > oppScore;
  const tied = myScore === oppScore && myScore > 0;

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-card/50 rounded-md border border-border/20">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate text-foreground">{match.name || `${roundLabel(match.round)} ${match.matchnum}`}</div>
        <div className="text-[10px] text-muted-foreground">{match.division?.name}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn("text-sm stat-number tabular-nums", won ? "text-[hsl(var(--success))]" : tied ? "text-muted-foreground" : "text-destructive")}>{myScore}</span>
        <span className="text-[10px] text-muted-foreground">vs</span>
        <span className="text-sm stat-number tabular-nums text-muted-foreground">{oppScore}</span>
        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md", won ? "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]" : tied ? "bg-muted text-muted-foreground" : "bg-destructive/15 text-destructive")}>
          {won ? "W" : tied ? "T" : "L"}
        </span>
      </div>
    </div>
  );
}

export function WinMatchRow({ match, teamNumber }: { match: any; teamNumber: string }) {
  const myAlliance = match.alliances?.find((a: any) =>
    a.teams?.some((t: any) => t.team?.name === teamNumber),
  );
  const oppAlliance = match.alliances?.find((a: any) => a.color !== myAlliance?.color);
  const myScore = myAlliance?.score ?? 0;
  const oppScore = oppAlliance?.score ?? 0;

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-card/50 rounded-md border border-border/20">
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate text-foreground">{match.event?.name || "Unknown Event"}</div>
        <div className="text-[10px] text-muted-foreground">{match.name || `${roundLabel(match.round)} ${match.matchnum}`} · {match.division?.name}</div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm stat-number tabular-nums text-[hsl(var(--success))]">{myScore}</span>
        <span className="text-[10px] text-muted-foreground">vs</span>
        <span className="text-sm stat-number tabular-nums text-muted-foreground">{oppScore}</span>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]">W</span>
      </div>
    </div>
  );
}

export function EventMatchGroup({ event, teamNumber }: { event: { eventName: string; eventId?: number; date: string; matches: any[] }; teamNumber: string }) {
  const [open, setOpen] = useState(false);
  const quals = event.matches.filter((m: any) => m.round === 2);
  const elims = event.matches.filter((m: any) => m.round >= 3);

  return (
    <div className="rounded-lg border border-border/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors text-left"
      >
        <Target className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium truncate block">{event.eventName}</span>
          {event.date && <span className="text-[10px] text-muted-foreground">{event.date}</span>}
        </div>
        <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          {event.matches.length}
        </span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && (
        <div className="border-t border-border/30 px-3 py-3 space-y-3">
          {quals.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
                Qualifications · {quals.length}
              </div>
              <div className="space-y-1">
                {quals.sort((a: any, b: any) => a.matchnum - b.matchnum).map((m: any) => (
                  <MatchRow key={m.id} match={m} teamNumber={teamNumber} />
                ))}
              </div>
            </div>
          )}
          {elims.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
                Eliminations · {elims.length}
              </div>
              <div className="space-y-1">
                {elims.sort((a: any, b: any) => a.round !== b.round ? a.round - b.round : a.matchnum - b.matchnum).map((m: any) => (
                  <MatchRow key={m.id} match={m} teamNumber={teamNumber} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MatchesGroupedByEvent {
  eventName: string;
  eventId?: number;
  date: string;
  matches: any[];
}

export function groupMatchesByEvent(matches: any[]): MatchesGroupedByEvent[] {
  const eventMap = new Map<string, MatchesGroupedByEvent>();
  matches.forEach((m: any) => {
    const eventName = m.event?.name || "Unknown Event";
    const eventId = m.event?.id;
    const key = eventId ? String(eventId) : eventName;
    if (!eventMap.has(key)) {
      const dateSource = m.started || m.scheduled || m.event?.start || null;
      eventMap.set(key, {
        eventName,
        eventId,
        date: dateSource ? new Date(dateSource).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "",
        matches: [],
      });
    }
    eventMap.get(key)!.matches.push(m);
  });
  return Array.from(eventMap.values()).sort((a, b) => {
    const aTime = a.matches[0]?.started ? new Date(a.matches[0].started).getTime() : 0;
    const bTime = b.matches[0]?.started ? new Date(b.matches[0].started).getTime() : 0;
    return bTime - aTime;
  });
}

export function filterWonMatches(matches: any[], teamNumber: string) {
  return [...matches]
    .filter((m: any) => {
      const myAlliance = m.alliances?.find((a: any) =>
        a.teams?.some((t: any) => t.team?.name === teamNumber),
      );
      const oppAlliance = m.alliances?.find((a: any) => a.color !== myAlliance?.color);
      return (myAlliance?.score ?? 0) > (oppAlliance?.score ?? 0);
    })
    .sort((a: any, b: any) => {
      const aTime = a.started ? new Date(a.started).getTime() : 0;
      const bTime = b.started ? new Date(b.started).getTime() : 0;
      return bTime - aTime;
    });
}

export function MatchesPlayedModal({
  open,
  onOpenChange,
  teamNumber,
  seasonLabel,
  matchesByEvent,
  totalMatchCount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamNumber: string;
  seasonLabel: string;
  matchesByEvent: MatchesGroupedByEvent[];
  totalMatchCount: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{teamNumber} — All Matches</DialogTitle>
          <DialogDescription>
            {seasonLabel} · {totalMatchCount} total matches · {matchesByEvent.length} events
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          <div className="space-y-2">
            {matchesByEvent.length > 0 ? (
              matchesByEvent.map((ev, idx) => (
                <EventMatchGroup key={idx} event={ev} teamNumber={teamNumber} />
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">No matches found.</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function WinsModal({
  open,
  onOpenChange,
  teamNumber,
  seasonLabel,
  wonMatches,
  totalMatchCount,
  winRate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamNumber: string;
  seasonLabel: string;
  wonMatches: any[];
  totalMatchCount: number;
  winRate: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{teamNumber} — Wins</DialogTitle>
          <DialogDescription>
            {seasonLabel} · {wonMatches.length} wins out of {totalMatchCount} matches ({winRate}%)
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
          <div className="space-y-1">
            {wonMatches.length > 0 ? (
              wonMatches.map((m: any) => (
                <WinMatchRow key={m.id} match={m} teamNumber={teamNumber} />
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">No wins found.</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
