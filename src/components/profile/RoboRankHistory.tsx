import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Loader2 } from "lucide-react";
import {
  SEASON_LIST,
  getTeamRankings,
  getTeamSkillsScore,
  calculateRoboRank,
} from "@/lib/robotevents";
import { cn } from "@/lib/utils";

interface RoboRankHistoryProps {
  teamId: number | null | undefined;
  className?: string;
}

interface HistoryPoint {
  season: string;
  year: string;
  roboRank: number | null;
}

async function fetchHistory(teamId: number): Promise<HistoryPoint[]> {
  const points: HistoryPoint[] = [];
  for (const s of SEASON_LIST) {
    try {
      const [rankings, skills] = await Promise.all([
        getTeamRankings(teamId, s.key),
        getTeamSkillsScore(teamId, s.key),
      ]);
      if (!rankings || rankings.length === 0) {
        points.push({ season: s.name, year: s.year, roboRank: null });
        continue;
      }
      const rr = calculateRoboRank(rankings, skills);
      points.push({ season: s.name, year: s.year, roboRank: rr || null });
    } catch {
      points.push({ season: s.name, year: s.year, roboRank: null });
    }
  }
  return points.reverse();
}

export function RoboRankHistory({ teamId, className }: RoboRankHistoryProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["roboRankHistory", teamId],
    queryFn: () => fetchHistory(teamId!),
    enabled: !!teamId,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const validPoints = (data || []).filter((p) => p.roboRank !== null);

  return (
    <div className={cn("rounded-xl border border-border/50 card-gradient p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="font-display font-semibold text-sm">RoboRank History</h3>
        </div>
        {validPoints.length > 0 && (
          <span className="text-xs text-muted-foreground">{validPoints.length} seasons</span>
        )}
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-[200px]">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : validPoints.length < 2 ? (
        <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground text-center px-4">
          Not enough season history yet to plot a trend.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 12, bottom: 5, left: -12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="season"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(v: any) => (v === null ? "No data" : `${v} RR`)}
            />
            <Line
              type="monotone"
              dataKey="roboRank"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
