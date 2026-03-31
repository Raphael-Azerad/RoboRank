import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTeamByNumber, getTeamMatches, getTeamEvents, SEASONS, SEASON_LIST, type SeasonKey } from "@/lib/robotevents";
import { useSeason } from "@/contexts/SeasonContext";
import { Users, Loader2, Trophy, X as XIcon, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface AllianceEntry {
  eventName: string;
  eventId?: number;
  matchName: string;
  partners: string[];
  result: "win" | "loss" | "tie";
  myScore: number;
  oppScore: number;
  round: string; // "Qualification" or "Elimination"
}

function extractAlliances(matches: any[], teamNumber: string): AllianceEntry[] {
  const entries: AllianceEntry[] = [];

  matches.forEach((m: any) => {
    const myAlliance = m.alliances?.find((a: any) =>
      a.teams?.some((t: any) => t.team?.name === teamNumber)
    );
    const oppAlliance = m.alliances?.find((a: any) => a.color !== myAlliance?.color);
    if (!myAlliance || !oppAlliance) return;

    const partners = myAlliance.teams
      ?.filter((t: any) => t.team?.name && t.team.name !== teamNumber)
      .map((t: any) => t.team.name) || [];

    if (partners.length === 0) return;

    const myScore = myAlliance.score ?? 0;
    const oppScore = oppAlliance.score ?? 0;
    const result: "win" | "loss" | "tie" =
      myScore > oppScore ? "win" : myScore < oppScore ? "loss" : "tie";

    const roundName = m.round === 2 ? "Qualification" : m.round >= 3 ? "Elimination" : "Practice";
    if (roundName === "Practice") return;

    entries.push({
      eventName: m.event?.name || "Unknown Event",
      eventId: m.event?.id,
      matchName: m.name || `Match ${m.matchnum}`,
      partners,
      result,
      myScore,
      oppScore,
      round: roundName,
    });
  });

  return entries;
}

export function AlliancesTab({ teamNumber }: { teamNumber: string | null }) {
  const { season } = useSeason();
  const [filterSeason, setFilterSeason] = useState<SeasonKey>(season);
  const [filterRound, setFilterRound] = useState<"all" | "Qualification" | "Elimination">("all");

  const { data: teamData } = useQuery({
    queryKey: ["teamProfile", teamNumber],
    queryFn: () => getTeamByNumber(teamNumber!),
    enabled: !!teamNumber,
  });

  const teamId = teamData?.id || null;

  const { data: matches, isLoading } = useQuery({
    queryKey: ["allianceMatches", teamId, filterSeason],
    queryFn: () => getTeamMatches(teamId!, filterSeason),
    enabled: !!teamId,
  });

  const alliances = useMemo(() => {
    if (!matches || !teamNumber) return [];
    return extractAlliances(matches, teamNumber);
  }, [matches, teamNumber]);

  const filtered = useMemo(() => {
    if (filterRound === "all") return alliances;
    return alliances.filter((a) => a.round === filterRound);
  }, [alliances, filterRound]);

  // Group by event
  const groupedByEvent = useMemo(() => {
    const map = new Map<string, AllianceEntry[]>();
    filtered.forEach((a) => {
      const key = a.eventName;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    return Array.from(map.entries());
  }, [filtered]);

  // Unique partners summary
  const uniquePartners = useMemo(() => {
    const set = new Set<string>();
    alliances.forEach((a) => a.partners.forEach((p) => set.add(p)));
    return set.size;
  }, [alliances]);

  if (!teamNumber) {
    return (
      <div className="rounded-xl border border-border/50 card-gradient p-8 text-center text-sm text-muted-foreground">
        Join or follow a team to see alliance history.
      </div>
    );
  }

  const seasonInfo = SEASONS[filterSeason];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-xl border border-border/50 card-gradient p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Filters</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SEASON_LIST.map((s) => (
            <Button
              key={s.key}
              variant={filterSeason === s.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterSeason(s.key)}
              className="text-xs"
            >
              {s.name}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          {(["all", "Qualification", "Elimination"] as const).map((r) => (
            <Button
              key={r}
              variant={filterRound === r ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterRound(r)}
              className="text-xs"
            >
              {r === "all" ? "All Rounds" : r}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border/50 card-gradient p-4 text-center">
          <p className="text-2xl font-display font-bold text-primary">{filtered.length}</p>
          <p className="text-xs text-muted-foreground">Matches</p>
        </div>
        <div className="rounded-xl border border-border/50 card-gradient p-4 text-center">
          <p className="text-2xl font-display font-bold text-[hsl(var(--success))]">
            {filtered.filter((a) => a.result === "win").length}
          </p>
          <p className="text-xs text-muted-foreground">Wins</p>
        </div>
        <div className="rounded-xl border border-border/50 card-gradient p-4 text-center">
          <p className="text-2xl font-display font-bold">{uniquePartners}</p>
          <p className="text-xs text-muted-foreground">Partners</p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Alliance list by event */}
      {!isLoading && groupedByEvent.length === 0 && (
        <div className="rounded-xl border border-border/50 card-gradient p-8 text-center text-sm text-muted-foreground">
          No alliance data for {seasonInfo.name} ({seasonInfo.year}).
        </div>
      )}

      {groupedByEvent.map(([eventName, entries]) => (
        <div key={eventName} className="rounded-xl border border-border/50 card-gradient overflow-hidden">
          <div className="px-4 py-3 bg-muted/30 border-b border-border/30">
            <h4 className="text-sm font-display font-semibold truncate">{eventName}</h4>
            <p className="text-xs text-muted-foreground">
              {entries.length} match{entries.length !== 1 ? "es" : ""} ·{" "}
              {entries.filter((e) => e.result === "win").length}W-
              {entries.filter((e) => e.result === "loss").length}L
            </p>
          </div>
          <div className="divide-y divide-border/20">
            {entries.map((entry, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3 text-sm hover:bg-muted/20 transition-colors">
                <div className={cn(
                  "w-1.5 h-8 rounded-full shrink-0",
                  entry.result === "win" ? "bg-[hsl(var(--success))]" :
                  entry.result === "loss" ? "bg-destructive" : "bg-muted-foreground"
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{entry.matchName}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full",
                      entry.round === "Elimination" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {entry.round === "Elimination" ? "Elim" : "Qual"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                    <div className="flex flex-wrap gap-1">
                      {entry.partners.map((p) => (
                        <Link
                          key={p}
                          to={`/team/${p}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          {p}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={cn(
                    "text-sm font-semibold",
                    entry.result === "win" ? "text-[hsl(var(--success))]" :
                    entry.result === "loss" ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {entry.myScore}
                  </span>
                  <span className="text-muted-foreground mx-1">-</span>
                  <span className="text-sm text-muted-foreground">{entry.oppScore}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
