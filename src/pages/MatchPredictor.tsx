import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { getTeamByNumber, getTeamRankings, getTeamMatches, getTeamSkillsScore, calculateRoboRank, calculateRecordFromMatches, SEASONS, searchTeamsPartial } from "@/lib/robotevents";
import { useSeason } from "@/contexts/SeasonContext";
import { RoboRankScore } from "@/components/dashboard/RoboRankScore";
import { Loader2, Search, Swords, TrendingUp, Trophy, Target, Zap, ArrowRight, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface TeamStats {
  number: string;
  name: string;
  id: number;
  roboRank: number;
  winRate: number;
  wins: number;
  losses: number;
  ties: number;
  highScore: number;
  avgPoints: number;
  skillsCombined: number;
  matchesPlayed: number;
}

function PredictionBar({ teamA, teamB, winProbA }: { teamA: string; teamB: string; winProbA: number }) {
  const winProbB = 100 - winProbA;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-medium">
        <span className="text-primary">{teamA} — {winProbA}%</span>
        <span className="text-[hsl(var(--chart-2))]">{winProbB}% — {teamB}</span>
      </div>
      <div className="h-3 rounded-full overflow-hidden bg-muted flex">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${winProbA}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-gradient-to-r from-primary to-primary/70 rounded-l-full"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${winProbB}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-gradient-to-l from-[hsl(var(--chart-2))] to-[hsl(var(--chart-2))]/70 rounded-r-full"
        />
      </div>
    </div>
  );
}

function StatCompare({ label, valueA, valueB, higherBetter = true }: { label: string; valueA: string | number; valueB: string | number; higherBetter?: boolean }) {
  const numA = typeof valueA === "number" ? valueA : parseFloat(String(valueA));
  const numB = typeof valueB === "number" ? valueB : parseFloat(String(valueB));
  const aWins = higherBetter ? numA > numB : numA < numB;
  const bWins = higherBetter ? numB > numA : numB < numA;

  return (
    <div className="grid grid-cols-3 gap-2 items-center py-2.5 border-b border-border/20 last:border-0">
      <div className={cn("text-right text-sm font-medium stat-number", aWins && "text-primary")}>
        {valueA}
      </div>
      <div className="text-center text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={cn("text-left text-sm font-medium stat-number", bWins && "text-[hsl(var(--chart-2))]")}>
        {valueB}
      </div>
    </div>
  );
}

function TeamSearch({ onSelect, label, selectedTeam }: { onSelect: (team: any) => void; label: string; selectedTeam: TeamStats | null }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useState(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  });

  const { data: results, isLoading } = useQuery({
    queryKey: ["teamSearch", debouncedQuery],
    queryFn: () => searchTeamsPartial(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {selectedTeam ? (
        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div>
            <span className="font-display font-bold text-primary">{selectedTeam.number}</span>
            <span className="text-sm text-muted-foreground ml-2">{selectedTeam.name}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onSelect(null)} className="text-xs">Change</Button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search team number..."
            className="pl-10 bg-card uppercase"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setDebouncedQuery(e.target.value); }}
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
          {results && results.length > 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
              {results.map((team: any) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => { onSelect(team); setQuery(""); setDebouncedQuery(""); }}
                  className="w-full text-left px-3 py-2 hover:bg-accent/50 transition-colors text-sm flex items-center justify-between"
                >
                  <span className="font-medium">{team.number}</span>
                  <span className="text-xs text-muted-foreground truncate ml-2">{team.team_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function calculateWinProbability(a: TeamStats, b: TeamStats): number {
  // Weighted combination of stats
  const rrWeight = 0.4;
  const wrWeight = 0.25;
  const skillsWeight = 0.2;
  const hsWeight = 0.15;

  const rrDiff = (a.roboRank - b.roboRank) / 100;
  const wrDiff = (a.winRate - b.winRate) / 100;
  const skillsDiff = a.skillsCombined && b.skillsCombined
    ? (a.skillsCombined - b.skillsCombined) / Math.max(a.skillsCombined, b.skillsCombined, 1)
    : 0;
  const hsDiff = a.highScore && b.highScore
    ? (a.highScore - b.highScore) / Math.max(a.highScore, b.highScore, 1)
    : 0;

  const combined = rrDiff * rrWeight + wrDiff * wrWeight + skillsDiff * skillsWeight + hsDiff * hsWeight;
  // Sigmoid to convert to probability
  const prob = 1 / (1 + Math.exp(-combined * 4));
  return Math.round(prob * 100);
}

export default function MatchPredictor() {
  const { season } = useSeason();
  const seasonInfo = SEASONS[season];
  const [teamARaw, setTeamARaw] = useState<any | null>(null);
  const [teamBRaw, setTeamBRaw] = useState<any | null>(null);

  const { data: teamAStats, isLoading: loadingA } = useQuery({
    queryKey: ["predictorStats", teamARaw?.id, season],
    queryFn: async (): Promise<TeamStats> => {
      const [rankings, matches, skills] = await Promise.all([
        getTeamRankings(teamARaw.id, season),
        getTeamMatches(teamARaw.id, season),
        getTeamSkillsScore(teamARaw.id, season),
      ]);
      const record = calculateRecordFromMatches(matches || [], teamARaw.number);
      const rr = calculateRoboRank(rankings || [], skills);
      return {
        number: teamARaw.number,
        name: teamARaw.team_name,
        id: teamARaw.id,
        roboRank: rr,
        winRate: record.winRate,
        wins: record.wins,
        losses: record.losses,
        ties: record.ties,
        highScore: record.highScore,
        avgPoints: record.avgPoints,
        skillsCombined: skills,
        matchesPlayed: record.total,
      };
    },
    enabled: !!teamARaw?.id,
  });

  const { data: teamBStats, isLoading: loadingB } = useQuery({
    queryKey: ["predictorStats", teamBRaw?.id, season],
    queryFn: async (): Promise<TeamStats> => {
      const [rankings, matches, skills] = await Promise.all([
        getTeamRankings(teamBRaw.id, season),
        getTeamMatches(teamBRaw.id, season),
        getTeamSkillsScore(teamBRaw.id, season),
      ]);
      const record = calculateRecordFromMatches(matches || [], teamBRaw.number);
      const rr = calculateRoboRank(rankings || [], skills);
      return {
        number: teamBRaw.number,
        name: teamBRaw.team_name,
        id: teamBRaw.id,
        roboRank: rr,
        winRate: record.winRate,
        wins: record.wins,
        losses: record.losses,
        ties: record.ties,
        highScore: record.highScore,
        avgPoints: record.avgPoints,
        skillsCombined: skills,
        matchesPlayed: record.total,
      };
    },
    enabled: !!teamBRaw?.id,
  });

  const bothReady = teamAStats && teamBStats;
  const winProbA = bothReady ? calculateWinProbability(teamAStats, teamBStats) : 50;

  return (
    <AppLayout>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Match Predictor</h1>
          <p className="text-muted-foreground mt-1">
            Predict head-to-head match outcomes · {seasonInfo.name} {seasonInfo.year}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-xl border border-border/50 card-gradient p-5 space-y-4"
          >
            <TeamSearch label="Team A" onSelect={setTeamARaw} selectedTeam={teamAStats || null} />
            {loadingA && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading stats...
              </div>
            )}
            {teamAStats && (
              <div className="flex items-center gap-3">
                <RoboRankScore score={teamAStats.roboRank} size="sm" />
                <div className="text-xs text-muted-foreground">
                  {teamAStats.wins}W-{teamAStats.losses}L · {teamAStats.matchesPlayed} matches
                </div>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-xl border border-border/50 card-gradient p-5 space-y-4"
          >
            <TeamSearch label="Team B" onSelect={setTeamBRaw} selectedTeam={teamBStats || null} />
            {loadingB && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading stats...
              </div>
            )}
            {teamBStats && (
              <div className="flex items-center gap-3">
                <RoboRankScore score={teamBStats.roboRank} size="sm" />
                <div className="text-xs text-muted-foreground">
                  {teamBStats.wins}W-{teamBStats.losses}L · {teamBStats.matchesPlayed} matches
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {!bothReady && !loadingA && !loadingB && (
          <div className="rounded-xl border border-border/50 card-gradient p-8 text-center space-y-3">
            <Swords className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Select two teams to predict the match outcome</p>
          </div>
        )}

        <AnimatePresence>
          {bothReady && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Prediction Result */}
              <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-[hsl(var(--chart-2))]/5 p-6 space-y-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <h2 className="font-display font-bold text-lg">Prediction</h2>
                </div>
                <PredictionBar teamA={teamAStats.number} teamB={teamBStats.number} winProbA={winProbA} />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {winProbA > 55
                      ? `${teamAStats.number} is favored to win`
                      : winProbA < 45
                        ? `${teamBStats.number} is favored to win`
                        : "This is a close matchup — could go either way"}
                  </p>
                </div>
              </div>

              {/* Stat Comparison */}
              <div className="rounded-xl border border-border/50 card-gradient p-6">
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-right text-sm font-display font-bold text-primary">{teamAStats.number}</div>
                  <div className="text-center text-xs text-muted-foreground uppercase tracking-wider">VS</div>
                  <div className="text-left text-sm font-display font-bold text-[hsl(var(--chart-2))]">{teamBStats.number}</div>
                </div>
                <StatCompare label="RoboRank" valueA={teamAStats.roboRank} valueB={teamBStats.roboRank} />
                <StatCompare label="Win Rate" valueA={`${teamAStats.winRate}%`} valueB={`${teamBStats.winRate}%`} />
                <StatCompare label="Matches" valueA={teamAStats.matchesPlayed} valueB={teamBStats.matchesPlayed} />
                <StatCompare label="High Score" valueA={teamAStats.highScore} valueB={teamBStats.highScore} />
                <StatCompare label="Avg Pts" valueA={teamAStats.avgPoints} valueB={teamBStats.avgPoints} />
                <StatCompare label="Skills" valueA={teamAStats.skillsCombined} valueB={teamBStats.skillsCombined} />
                <StatCompare label="Record" valueA={`${teamAStats.wins}W-${teamAStats.losses}L`} valueB={`${teamBStats.wins}W-${teamBStats.losses}L`} />
              </div>

              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>Predictions are based on RoboRank, win rate, skills scores, and match history. Actual match results depend on many factors including alliance partners and strategy.</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}