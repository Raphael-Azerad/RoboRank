import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface BracketMatch {
  id: number;
  round: number;
  instance: number;
  matchnum: number;
  name?: string;
  alliances?: {
    color: string;
    score: number;
    teams: { team: { name: string } }[];
  }[];
}

interface BracketRound {
  round: number;
  label: string;
  matches: BracketMatch[];
}

interface SeriesResult {
  instance: number;
  redTeams: string;
  blueTeams: string;
  redWins: number;
  blueWins: number;
  scores: { red: number; blue: number }[];
  winner: "red" | "blue" | "tbd";
}

function roundLabel(round: number): string {
  switch (round) {
    case 3: return "R16";
    case 4: return "Quarterfinals";
    case 5: return "Semifinals";
    case 6: return "Finals";
    default: return `Round ${round}`;
  }
}

/** Group matches by instance (series) within a round for best-of-3 display */
function groupMatchesBySeries(matches: BracketMatch[]): SeriesResult[] {
  const seriesMap = new Map<number, BracketMatch[]>();
  matches.forEach((m) => {
    if (!seriesMap.has(m.instance)) seriesMap.set(m.instance, []);
    seriesMap.get(m.instance)!.push(m);
  });

  return Array.from(seriesMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([instance, seriesMatches]) => {
      seriesMatches.sort((a, b) => a.matchnum - b.matchnum);
      let redWins = 0;
      let blueWins = 0;
      const scores: { red: number; blue: number }[] = [];
      let redTeams = "TBD";
      let blueTeams = "TBD";

      seriesMatches.forEach((m) => {
        const red = m.alliances?.find((a) => a.color === "red");
        const blue = m.alliances?.find((a) => a.color === "blue");
        const rScore = red?.score ?? 0;
        const bScore = blue?.score ?? 0;
        scores.push({ red: rScore, blue: bScore });
        if (rScore > bScore) redWins++;
        else if (bScore > rScore) blueWins++;

        // Get team names from first match that has them
        const rTeams = red?.teams?.map((t) => t.team?.name).filter(Boolean).join(" & ");
        const bTeams = blue?.teams?.map((t) => t.team?.name).filter(Boolean).join(" & ");
        if (rTeams) redTeams = rTeams;
        if (bTeams) blueTeams = bTeams;
      });

      const winner = redWins >= 2 ? "red" : blueWins >= 2 ? "blue" : "tbd";
      return { instance, redTeams, blueTeams, redWins, blueWins, scores, winner };
    });
}

function BracketSeriesCard({ series, delay }: { series: SeriesResult; delay: number }) {
  const redWon = series.winner === "red";
  const blueWon = series.winner === "blue";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="rounded-lg border border-border/50 overflow-hidden bg-card w-full min-w-[220px]"
    >
      {/* Red alliance */}
      <div className={cn(
        "flex items-center justify-between px-3 py-2 text-xs gap-2",
        redWon ? "bg-destructive/10" : "bg-card"
      )}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
          <span className={cn("truncate", redWon ? "font-semibold text-foreground" : "text-muted-foreground")}>{series.redTeams}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {series.scores.map((s, i) => (
            <span key={i} className={cn(
              "text-[10px] px-1 rounded",
              s.red > s.blue ? "bg-destructive/20 text-foreground font-semibold" : "text-muted-foreground"
            )}>{s.red}</span>
          ))}
          <span className={cn("stat-number ml-1 text-xs", redWon ? "text-foreground" : "text-muted-foreground")}>
            ({series.redWins})
          </span>
        </div>
      </div>
      <div className="h-px bg-border/30" />
      {/* Blue alliance */}
      <div className={cn(
        "flex items-center justify-between px-3 py-2 text-xs gap-2",
        blueWon ? "bg-[hsl(var(--chart-2))]/10" : "bg-card"
      )}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-[hsl(var(--chart-2))] shrink-0" />
          <span className={cn("truncate", blueWon ? "font-semibold text-foreground" : "text-muted-foreground")}>{series.blueTeams}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {series.scores.map((s, i) => (
            <span key={i} className={cn(
              "text-[10px] px-1 rounded",
              s.blue > s.red ? "bg-[hsl(var(--chart-2))]/20 text-foreground font-semibold" : "text-muted-foreground"
            )}>{s.blue}</span>
          ))}
          <span className={cn("stat-number ml-1 text-xs", blueWon ? "text-foreground" : "text-muted-foreground")}>
            ({series.blueWins})
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export function EliminationBracket({ rounds }: { rounds: BracketRound[] }) {
  if (rounds.length === 0) return null;

  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {rounds.map((round, ri) => {
        const series = groupMatchesBySeries(round.matches);
        return (
          <div key={round.round} className="flex flex-col gap-2 min-w-[240px]">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center mb-1">
              {roundLabel(round.round)}
              <span className="ml-1.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                {series.length} {series.length === 1 ? "series" : "series"}
              </span>
            </div>
            <div className="flex flex-col gap-3 justify-around flex-1">
              {series.map((s, si) => (
                <BracketSeriesCard key={`${round.round}-${s.instance}`} series={s} delay={ri * 0.1 + si * 0.03} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
