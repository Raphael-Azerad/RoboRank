import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Loader2, ArrowUpRight, Flame } from "lucide-react";
import { motion } from "framer-motion";
import {
  getWorldSkillsRankings,
  getTeamRankings,
  SEASONS,
  type SeasonKey,
} from "@/lib/robotevents";
import { useSeason } from "@/contexts/SeasonContext";
import type { GradeLevel } from "@/contexts/SeasonContext";
import { cn } from "@/lib/utils";

interface TrendingTeam {
  teamId: number;
  teamNumber: string;
  teamName: string;
  region: string;
  delta: number; // percentile points gained at last event vs season average
  latestEventName: string;
  latestEventId: number | null;
  latestPercentile: number;
  seasonAvgPercentile: number;
  eventsCount: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * "Trending" signal: each team's most-recent event ranking percentile
 * compared to their season average. Big positive delta = breakout
 * performance recently. Lightweight, no historical snapshot required.
 */
async function buildTrendingPool(
  season: SeasonKey,
  gradeLevel: GradeLevel,
): Promise<TrendingTeam[]> {
  const fetchGrades: string[] =
    gradeLevel === "Both" ? ["High School", "Middle School"] : [gradeLevel];

  const skillsResults = await Promise.all(
    fetchGrades.map((g) => getWorldSkillsRankings(season, g).then((raw) => ({ raw, grade: g }))),
  );

  const teamMap = new Map<number, { id: number; number: string; name: string; region: string; combined: number }>();
  skillsResults.forEach(({ raw }) => {
    const arr = Array.isArray(raw) ? raw : [];
    arr.forEach((entry: any) => {
      const id = entry?.team?.id;
      const number = entry?.team?.team || entry?.team?.number;
      if (!id || !number) return;
      const combined = Number(entry?.scores?.score || 0);
      const existing = teamMap.get(id);
      if (!existing || combined > existing.combined) {
        teamMap.set(id, {
          id,
          number,
          name: entry?.team?.teamName || entry?.team?.team_name || "",
          region: entry?.team?.eventRegion || "",
          combined,
        });
      }
    });
  });

  // Cap at top 200 by skills for speed
  const candidates = Array.from(teamMap.values())
    .sort((a, b) => b.combined - a.combined)
    .slice(0, 200);

  const results: TrendingTeam[] = [];

  for (let i = 0; i < candidates.length; i += 25) {
    const batch = candidates.slice(i, i + 25);
    await Promise.all(
      batch.map(async (team) => {
        try {
          const rankings = await getTeamRankings(team.id, season);
          if (!rankings || rankings.length < 2) return;

          // Compute percentile per event (1 - (rank-1)/fieldSize)
          const withPercentile = rankings
            .filter((r: any) => r.rank > 0)
            .map((r: any) => {
              const fieldSize = Math.max(r.rank, 24);
              const pct = Math.max(0, (1 - (r.rank - 1) / fieldSize) * 100);
              return { r, pct };
            });

          if (withPercentile.length < 2) return;

          // Latest event = highest event id (events are sequential by start date in RobotEvents)
          const sortedByEventId = [...withPercentile].sort(
            (a, b) => (b.r.event?.id ?? 0) - (a.r.event?.id ?? 0),
          );
          const latest = sortedByEventId[0];

          // Season avg = average of all OTHER events
          const others = sortedByEventId.slice(1);
          const seasonAvg = others.reduce((s, x) => s + x.pct, 0) / others.length;
          const delta = latest.pct - seasonAvg;

          // Only show real breakouts (positive deltas of meaningful size)
          if (delta < 8) return;

          results.push({
            teamId: team.id,
            teamNumber: team.number,
            teamName: team.name,
            region: team.region,
            delta: Math.round(delta * 10) / 10,
            latestEventName: latest.r.event?.name || "Recent event",
            latestEventId: latest.r.event?.id ?? null,
            latestPercentile: Math.round(latest.pct),
            seasonAvgPercentile: Math.round(seasonAvg),
            eventsCount: withPercentile.length,
          });
        } catch {
          // ignore
        }
      }),
    );
    if (i + 25 < candidates.length) await sleep(50);
  }

  return results.sort((a, b) => b.delta - a.delta).slice(0, 8);
}

export function TrendingTeamsWidget() {
  const navigate = useNavigate();
  const { season, gradeLevel } = useSeason();
  const seasonInfo = SEASONS[season];
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["trendingTeams", season, gradeLevel],
    queryFn: () => buildTrendingPool(season, gradeLevel),
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
  });

  const visible = expanded ? (data ?? []) : (data ?? []).slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-xl border border-border/50 card-gradient overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-primary" />
          <h3 className="font-display font-semibold text-base">Trending Teams</h3>
        </div>
        <span className="text-[11px] text-muted-foreground">{seasonInfo.name}</span>
      </div>

      <div className="px-5 py-3 text-[11px] text-muted-foreground border-b border-border/20">
        Teams whose latest event performance jumped well above their season average. Updated every 6 hours.
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 px-5 py-8 text-sm text-muted-foreground justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Scanning recent events...
        </div>
      )}

      {!isLoading && (!data || data.length === 0) && (
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          No breakout performances yet this week.
        </div>
      )}

      {!isLoading && visible.length > 0 && (
        <div className="divide-y divide-border/20">
          {visible.map((team, i) => (
            <button
              key={team.teamId}
              onClick={() => navigate(`/team/${team.teamNumber}`)}
              className="w-full grid grid-cols-12 gap-2 px-5 py-3 items-center hover:bg-accent/30 transition-colors text-left"
            >
              <div className="col-span-1 stat-number text-xs text-muted-foreground">{i + 1}</div>
              <div className="col-span-5 min-w-0">
                <div className="font-display font-semibold text-sm truncate">{team.teamNumber}</div>
                <div className="text-[11px] text-muted-foreground truncate">{team.latestEventName}</div>
              </div>
              <div className="col-span-3 text-center">
                <div className={cn("inline-flex items-center gap-0.5 stat-number text-sm", "text-success")}>
                  <ArrowUpRight className="h-3.5 w-3.5" />+{team.delta}
                </div>
                <div className="text-[10px] text-muted-foreground">percentile</div>
              </div>
              <div className="col-span-3 text-right text-[11px] text-muted-foreground hidden sm:block truncate">
                {team.latestPercentile}% vs {team.seasonAvgPercentile}%
              </div>
            </button>
          ))}
        </div>
      )}

      {!isLoading && data && data.length > 5 && (
        <div className="px-5 py-2 border-t border-border/20 text-center">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-primary hover:underline"
          >
            {expanded ? "Show less" : `Show ${data.length - 5} more`}
          </button>
        </div>
      )}
    </motion.div>
  );
}
