import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useRef, useEffect, useState, useCallback, useMemo } from "react";

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

interface LineCoord { x1: number; y1: number; x2: number; y2: number }

function roundLabel(round: number): string {
  switch (round) {
    case 3:
      return "Round of 16";
    case 4:
      return "Quarterfinals";
    case 5:
      return "Semifinals";
    case 6:
      return "Finals";
    default:
      return `Round ${round}`;
  }
}

function expectedSeriesCount(round: number): number {
  switch (round) {
    case 3:
      return 8;
    case 4:
      return 4;
    case 5:
      return 2;
    case 6:
      return 1;
    default:
      return 0;
  }
}

function groupMatchesBySeries(matches: BracketMatch[]): SeriesResult[] {
  const seriesMap = new Map<number, BracketMatch[]>();

  matches.forEach((match) => {
    if (!seriesMap.has(match.instance)) seriesMap.set(match.instance, []);
    seriesMap.get(match.instance)!.push(match);
  });

  return Array.from(seriesMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([instance, seriesMatches]) => {
      const sorted = [...seriesMatches].sort((a, b) => a.matchnum - b.matchnum);
      let redWins = 0;
      let blueWins = 0;
      const scores: { red: number; blue: number }[] = [];
      let redTeams = "TBD";
      let blueTeams = "TBD";

      sorted.forEach((match) => {
        const red = match.alliances?.find((a) => a.color === "red");
        const blue = match.alliances?.find((a) => a.color === "blue");
        const redScore = red?.score ?? 0;
        const blueScore = blue?.score ?? 0;

        scores.push({ red: redScore, blue: blueScore });

        if (redScore > blueScore) redWins += 1;
        else if (blueScore > redScore) blueWins += 1;

        const redAlliance = red?.teams?.map((t) => t.team?.name).filter(Boolean).join(" & ");
        const blueAlliance = blue?.teams?.map((t) => t.team?.name).filter(Boolean).join(" & ");

        if (redAlliance) redTeams = redAlliance;
        if (blueAlliance) blueTeams = blueAlliance;
      });

      return {
        instance,
        redTeams,
        blueTeams,
        redWins,
        blueWins,
        scores,
        winner: redWins >= 2 ? "red" : blueWins >= 2 ? "blue" : "tbd",
      };
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
          {series.scores.map((score, i) => (
            <span
              key={i}
              className={cn(
                "text-[10px] px-1 rounded",
                score.red > score.blue ? "bg-destructive/20 text-foreground font-semibold" : "text-muted-foreground",
              )}
            >
              {score.red}
            </span>
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
          {series.scores.map((score, i) => (
            <span
              key={i}
              className={cn(
                "text-[10px] px-1 rounded",
                score.blue > score.red ? "bg-[hsl(var(--chart-2))]/20 text-foreground font-semibold" : "text-muted-foreground",
              )}
            >
              {score.blue}
            </span>
          ))}
          <span className={cn("stat-number ml-1 text-xs", blueWon ? "text-foreground" : "text-muted-foreground")}>({series.blueWins})</span>
        </div>
      </div>
    </motion.div>
  );
}

function PlaceholderSeriesCard({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="rounded-lg border border-border/30 border-dashed overflow-hidden bg-card/50 w-full"
    >
      <div className="flex items-center justify-center px-3 py-2 text-xs text-muted-foreground/60">TBD</div>
      <div className="h-px bg-border/20" />
      <div className="flex items-center justify-center px-3 py-2 text-xs text-muted-foreground/60">TBD</div>
    </motion.div>
  );
}

export function EliminationBracket({
  rounds,
  showPlaceholders = true,
}: {
  rounds: BracketRound[];
  showPlaceholders?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const [lines, setLines] = useState<LineCoord[]>([]);

  const seriesByRound = useMemo(() => {
    const baseRounds = rounds
      .map((round) => ({
        round: round.round,
        realCount: groupMatchesBySeries(round.matches).length,
        series: groupMatchesBySeries(round.matches),
      }))
      .sort((a, b) => a.round - b.round);

    if (!showPlaceholders) return baseRounds;

    return baseRounds.map((roundData) => {
      const targetCount = expectedSeriesCount(roundData.round);
      if (targetCount <= 0 || roundData.series.length >= targetCount) return roundData;

      const padded = [...roundData.series];
      while (padded.length < targetCount) {
        padded.push({
          instance: -(padded.length + 1),
          redTeams: "TBD",
          blueTeams: "TBD",
          redWins: 0,
          blueWins: 0,
          scores: [],
          winner: "tbd",
        });
      }

      return {
        ...roundData,
        series: padded,
      };
    });
  }, [rounds, showPlaceholders]);

  const registerCard = useCallback((key: string, el: HTMLDivElement | null) => {
    if (el) cardRefsMap.current.set(key, el);
    else cardRefsMap.current.delete(key);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const nextLines: LineCoord[] = [];

      for (let roundIndex = 0; roundIndex < seriesByRound.length - 1; roundIndex += 1) {
        const currentRound = seriesByRound[roundIndex];
        const nextRound = seriesByRound[roundIndex + 1];

        for (let seriesIndex = 0; seriesIndex < currentRound.series.length; seriesIndex += 1) {
          const targetIndex = Math.floor(seriesIndex / 2);
          if (targetIndex >= nextRound.series.length) continue;

          const sourceCard = cardRefsMap.current.get(`${currentRound.round}-${seriesIndex}`);
          const targetCard = cardRefsMap.current.get(`${nextRound.round}-${targetIndex}`);

          if (!sourceCard || !targetCard) continue;

          const sourceRect = sourceCard.getBoundingClientRect();
          const targetRect = targetCard.getBoundingClientRect();

          nextLines.push({
            x1: sourceRect.right - containerRect.left,
            y1: sourceRect.top + sourceRect.height / 2 - containerRect.top,
            x2: targetRect.left - containerRect.left,
            y2: targetRect.top + targetRect.height / 2 - containerRect.top,
          });
        }
      }

      setLines(nextLines);
    }, 350);

    return () => clearTimeout(timer);
  }, [seriesByRound]);

  if (seriesByRound.length === 0) return null;

  return (
    <div ref={containerRef} className="relative flex gap-8 overflow-x-auto pb-4">
      {lines.length > 0 && (
        <svg className="absolute inset-0 pointer-events-none z-0 overflow-visible" width="100%" height="100%">
          {lines.map((line, i) => {
            const midX = (line.x1 + line.x2) / 2;
            return (
              <motion.path
                key={i}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: i * 0.03 }}
                d={`M ${line.x1} ${line.y1} C ${midX} ${line.y1}, ${midX} ${line.y2}, ${line.x2} ${line.y2}`}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="1.5"
                strokeOpacity="0.6"
              />
            );
          })}
        </svg>
      )}

      {seriesByRound.map((roundData, roundIndex) => (
        <div key={roundData.round} className="flex flex-col gap-2 min-w-[240px] relative z-10">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center mb-1">
            {roundLabel(roundData.round)}
            <span className="ml-1.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{roundData.realCount}</span>
          </div>

          <div className="flex flex-col gap-3 justify-around flex-1">
            {roundData.series.map((series, seriesIndex) => (
              <div key={`${roundData.round}-${seriesIndex}`} ref={(el) => registerCard(`${roundData.round}-${seriesIndex}`, el)}>
                {series.instance > 0 ? (
                  <BracketSeriesCard series={series} delay={roundIndex * 0.1 + seriesIndex * 0.03} />
                ) : (
                  <PlaceholderSeriesCard delay={roundIndex * 0.1 + seriesIndex * 0.03} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
