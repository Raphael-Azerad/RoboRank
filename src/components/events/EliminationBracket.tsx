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
      let redWins = 0, blueWins = 0;
      const scores: { red: number; blue: number }[] = [];
      let redTeams = "TBD", blueTeams = "TBD";

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

      return { instance, redTeams, blueTeams, redWins, blueWins, scores, winner: redWins >= 2 ? "red" as const : blueWins >= 2 ? "blue" as const : "tbd" as const };
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
      className="rounded-lg border border-border/50 overflow-hidden bg-card w-full"
    >
      <div className={cn("flex items-center justify-between px-3 py-2 text-xs gap-2", redWon ? "bg-destructive/10" : "bg-card")}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
          <span className={cn("truncate", redWon ? "font-semibold text-foreground" : "text-muted-foreground")}>{series.redTeams}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {series.scores.map((s, i) => (
            <span key={i} className={cn("text-[10px] px-1 rounded", s.red > s.blue ? "bg-destructive/20 text-foreground font-semibold" : "text-muted-foreground")}>{s.red}</span>
          ))}
          <span className={cn("stat-number ml-1 text-xs", redWon ? "text-foreground" : "text-muted-foreground")}>({series.redWins})</span>
        </div>
      </div>
      <div className="h-px bg-border/30" />
      <div className={cn("flex items-center justify-between px-3 py-2 text-xs gap-2", blueWon ? "bg-[hsl(var(--chart-2))]/10" : "bg-card")}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-[hsl(var(--chart-2))] shrink-0" />
          <span className={cn("truncate", blueWon ? "font-semibold text-foreground" : "text-muted-foreground")}>{series.blueTeams}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {series.scores.map((s, i) => (
            <span key={i} className={cn("text-[10px] px-1 rounded", s.blue > s.red ? "bg-[hsl(var(--chart-2))]/20 text-foreground font-semibold" : "text-muted-foreground")}>{s.blue}</span>
          ))}
          <span className={cn("stat-number ml-1 text-xs", blueWon ? "text-foreground" : "text-muted-foreground")}>({series.blueWins})</span>
        </div>
      </div>
    </motion.div>
  );
}

interface LineCoord { x1: number; y1: number; x2: number; y2: number }

export function EliminationBracket({ rounds }: { rounds: BracketRound[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const [lines, setLines] = useState<LineCoord[]>([]);

  const seriesByRound = rounds.map((round) => ({
    round: round.round,
    series: groupMatchesBySeries(round.matches),
  }));

  const registerCard = useCallback((key: string, el: HTMLDivElement | null) => {
    if (el) cardRefsMap.current.set(key, el);
    else cardRefsMap.current.delete(key);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      const cRect = containerRef.current.getBoundingClientRect();
      const newLines: LineCoord[] = [];

      for (let ri = 0; ri < seriesByRound.length - 1; ri++) {
        const curr = seriesByRound[ri];
        const next = seriesByRound[ri + 1];

        for (let si = 0; si < curr.series.length; si++) {
          const targetIdx = Math.floor(si / 2);
          if (targetIdx >= next.series.length) continue;

          const srcEl = cardRefsMap.current.get(`${curr.round}-${curr.series[si].instance}`);
          const tgtEl = cardRefsMap.current.get(`${next.round}-${next.series[targetIdx].instance}`);

          if (srcEl && tgtEl) {
            const sR = srcEl.getBoundingClientRect();
            const tR = tgtEl.getBoundingClientRect();
            newLines.push({
              x1: sR.right - cRect.left,
              y1: sR.top + sR.height / 2 - cRect.top,
              x2: tR.left - cRect.left,
              y2: tR.top + tR.height / 2 - cRect.top,
            });
          }
        }
      }
      setLines(newLines);
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds]);

  if (rounds.length === 0) return null;

  return (
    <div ref={containerRef} className="relative flex gap-8 overflow-x-auto pb-4">
      {/* SVG connectors */}
      {lines.length > 0 && (
        <svg className="absolute inset-0 pointer-events-none z-0 overflow-visible" width="100%" height="100%">
          {lines.map((l, i) => {
            const midX = (l.x1 + l.x2) / 2;
            return (
              <motion.path
                key={i}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                d={`M ${l.x1} ${l.y1} C ${midX} ${l.y1}, ${midX} ${l.y2}, ${l.x2} ${l.y2}`}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="1.5"
                strokeOpacity="0.6"
              />
            );
          })}
        </svg>
      )}

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
              <div key={`${round}-${s.instance}`} ref={(el) => registerCard(`${round}-${s.instance}`, el)}>
                <BracketSeriesCard series={s} delay={ri * 0.1 + si * 0.03} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
