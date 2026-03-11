import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useRef, useEffect, useState, useCallback } from "react";

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

        const rTeams = red?.teams?.map((t) => t.team?.name).filter(Boolean).join(" & ");
        const bTeams = blue?.teams?.map((t) => t.team?.name).filter(Boolean).join(" & ");
        if (rTeams) redTeams = rTeams;
        if (bTeams) blueTeams = bTeams;
      });

      const winner = redWins >= 2 ? "red" : blueWins >= 2 ? "blue" : "tbd";
      return { instance, redTeams, blueTeams, redWins, blueWins, scores, winner };
    });
}

function BracketSeriesCard({ series, delay, cardRef }: { series: SeriesResult; delay: number; cardRef?: React.RefObject<HTMLDivElement> }) {
  const redWon = series.winner === "red";
  const blueWon = series.winner === "blue";

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="rounded-lg border border-border/50 overflow-hidden bg-card w-full min-w-[220px]"
    >
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

interface ConnectorLine {
  x1: number; y1: number;
  x2: number; y2: number;
}

export function EliminationBracket({ rounds }: { rounds: BracketRound[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<ConnectorLine[]>([]);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const seriesByRound = rounds.map((round) => ({
    round: round.round,
    series: groupMatchesBySeries(round.matches),
  }));

  const setCardRef = useCallback((key: string) => (el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(key, el);
    else cardRefs.current.delete(key);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newLines: ConnectorLine[] = [];

      for (let ri = 0; ri < seriesByRound.length - 1; ri++) {
        const currentSeries = seriesByRound[ri].series;
        const nextSeries = seriesByRound[ri + 1].series;
        const currentRound = seriesByRound[ri].round;
        const nextRound = seriesByRound[ri + 1].round;

        // Connect pairs: series 0,1 → 0; series 2,3 → 1; etc.
        for (let si = 0; si < currentSeries.length; si++) {
          const targetIdx = Math.floor(si / 2);
          if (targetIdx >= nextSeries.length) continue;

          const sourceKey = `${currentRound}-${currentSeries[si].instance}`;
          const targetKey = `${nextRound}-${nextSeries[targetIdx].instance}`;

          const sourceEl = cardRefs.current.get(sourceKey);
          const targetEl = cardRefs.current.get(targetKey);

          if (sourceEl && targetEl) {
            const sRect = sourceEl.getBoundingClientRect();
            const tRect = targetEl.getBoundingClientRect();

            newLines.push({
              x1: sRect.right - containerRect.left,
              y1: sRect.top + sRect.height / 2 - containerRect.top,
              x2: tRect.left - containerRect.left,
              y2: tRect.top + tRect.height / 2 - containerRect.top,
            });
          }
        }
      }

      setLines(newLines);
    }, 600); // Wait for animations

    return () => clearTimeout(timer);
  }, [seriesByRound.length]);

  if (rounds.length === 0) return null;

  return (
    <div ref={containerRef} className="relative flex gap-8 overflow-x-auto pb-4">
      {/* SVG connector lines */}
      <svg className="absolute inset-0 pointer-events-none z-0" style={{ width: '100%', height: '100%' }}>
        {lines.map((line, i) => {
          const midX = (line.x1 + line.x2) / 2;
          return (
            <path
              key={i}
              d={`M ${line.x1} ${line.y1} C ${midX} ${line.y1}, ${midX} ${line.y2}, ${line.x2} ${line.y2}`}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="1.5"
              strokeOpacity="0.5"
              className="transition-all duration-300"
            />
          );
        })}
      </svg>

      {seriesByRound.map(({ round, series }, ri) => (
        <div key={round} className="flex flex-col gap-2 min-w-[240px] relative z-10">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center mb-1">
            {roundLabel(round)}
            <span className="ml-1.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {series.length}
            </span>
          </div>
          <div className="flex flex-col gap-3 justify-around flex-1">
            {series.map((s, si) => (
              <BracketSeriesCard
                key={`${round}-${s.instance}`}
                series={s}
                delay={ri * 0.1 + si * 0.03}
                cardRef={{ current: null } as any}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Hidden ref layer for measuring positions */}
      <div className="absolute inset-0 pointer-events-none z-0 flex gap-8">
        {seriesByRound.map(({ round, series }, ri) => (
          <div key={`ref-${round}`} className="flex flex-col gap-2 min-w-[240px]">
            <div className="text-xs mb-1 invisible">placeholder</div>
            <div className="flex flex-col gap-3 justify-around flex-1">
              {series.map((s) => (
                <div
                  key={`ref-${round}-${s.instance}`}
                  ref={setCardRef(`${round}-${s.instance}`)}
                  className="min-w-[220px] h-[60px]"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
