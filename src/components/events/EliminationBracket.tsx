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

function roundLabel(round: number): string {
  switch (round) {
    case 3: return "R16";
    case 4: return "Quarterfinals";
    case 5: return "Semifinals";
    case 6: return "Finals";
    default: return `Round ${round}`;
  }
}

function BracketMatchCard({ match, delay }: { match: BracketMatch; delay: number }) {
  const red = match.alliances?.find((a) => a.color === "red");
  const blue = match.alliances?.find((a) => a.color === "blue");
  const redScore = red?.score ?? 0;
  const blueScore = blue?.score ?? 0;
  const redWon = redScore > blueScore;
  const blueWon = blueScore > redScore;
  const redTeams = red?.teams?.map((t) => t.team?.name).filter(Boolean).join(" & ") || "TBD";
  const blueTeams = blue?.teams?.map((t) => t.team?.name).filter(Boolean).join(" & ") || "TBD";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="rounded-lg border border-border/50 overflow-hidden bg-card w-full min-w-[200px]"
    >
      <div className={cn(
        "flex items-center justify-between px-3 py-2 text-xs gap-2",
        redWon ? "bg-destructive/10" : "bg-card"
      )}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-destructive shrink-0" />
          <span className={cn("truncate", redWon ? "font-semibold text-foreground" : "text-muted-foreground")}>{redTeams}</span>
        </div>
        <span className={cn("stat-number shrink-0", redWon ? "text-foreground" : "text-muted-foreground")}>{redScore}</span>
      </div>
      <div className="h-px bg-border/30" />
      <div className={cn(
        "flex items-center justify-between px-3 py-2 text-xs gap-2",
        blueWon ? "bg-[hsl(var(--chart-2))]/10" : "bg-card"
      )}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-[hsl(var(--chart-2))] shrink-0" />
          <span className={cn("truncate", blueWon ? "font-semibold text-foreground" : "text-muted-foreground")}>{blueTeams}</span>
        </div>
        <span className={cn("stat-number shrink-0", blueWon ? "text-foreground" : "text-muted-foreground")}>{blueScore}</span>
      </div>
    </motion.div>
  );
}

export function EliminationBracket({ rounds }: { rounds: BracketRound[] }) {
  if (rounds.length === 0) return null;

  return (
    <div className="flex gap-6 overflow-x-auto pb-4">
      {rounds.map((round, ri) => (
        <div key={round.round} className="flex flex-col gap-2 min-w-[220px]">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center mb-1">
            {roundLabel(round.round)}
            <span className="ml-1.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {round.matches.length}
            </span>
          </div>
          <div className="flex flex-col gap-3 justify-around flex-1">
            {round.matches.map((match, mi) => (
              <BracketMatchCard key={match.id} match={match} delay={ri * 0.1 + mi * 0.03} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
