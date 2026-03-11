import { AppLayout } from "@/components/layout/AppLayout";
import { RoboRankScore } from "@/components/dashboard/RoboRankScore";
import { motion } from "framer-motion";

const placeholderTeams = [
  { rank: 1, number: "1234A", name: "RoboWarriors", score: 92, wins: 45, losses: 3, winRate: "93.8%" },
  { rank: 2, number: "5678B", name: "TechTitans", score: 88, wins: 40, losses: 6, winRate: "87.0%" },
  { rank: 3, number: "9012C", name: "GearGrinders", score: 85, wins: 38, losses: 8, winRate: "82.6%" },
  { rank: 4, number: "3456D", name: "CircuitBreakers", score: 81, wins: 35, losses: 10, winRate: "77.8%" },
  { rank: 5, number: "7890E", name: "BotBuilders", score: 78, wins: 33, losses: 12, winRate: "73.3%" },
];

export default function Rankings() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Rankings</h1>
          <p className="text-muted-foreground mt-1">Top VEX teams by RoboRank score</p>
        </div>

        <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-4">
          Connect your RobotEvents API key to load real team rankings. These are placeholder teams.
        </div>

        <div className="rounded-xl border border-border/50 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="col-span-1">#</div>
            <div className="col-span-3">Team</div>
            <div className="col-span-2 text-center">Score</div>
            <div className="col-span-2 text-center hidden sm:block">Record</div>
            <div className="col-span-2 text-center">Win Rate</div>
          </div>
          {/* Rows */}
          {placeholderTeams.map((team, i) => (
            <motion.div
              key={team.number}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="grid grid-cols-12 gap-2 px-6 py-4 items-center border-t border-border/30 hover:bg-accent/50 transition-colors cursor-pointer"
            >
              <div className="col-span-1 stat-number text-muted-foreground">{team.rank}</div>
              <div className="col-span-3">
                <div className="font-display font-semibold">{team.number}</div>
                <div className="text-xs text-muted-foreground">{team.name}</div>
              </div>
              <div className="col-span-2 flex justify-center">
                <RoboRankScore score={team.score} size="sm" />
              </div>
              <div className="col-span-2 text-center text-sm hidden sm:block">
                <span className="text-success">{team.wins}W</span>
                <span className="text-muted-foreground mx-1">-</span>
                <span className="text-destructive">{team.losses}L</span>
              </div>
              <div className="col-span-2 text-center stat-number text-sm">{team.winRate}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
