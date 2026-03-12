import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTeamRankings, getTeamMatches, getTeamSkillsScore, calculateRoboRank, calculateRecordFromMatches, SEASONS, searchTeamsPartial } from "@/lib/robotevents";
import { useSeason } from "@/contexts/SeasonContext";
import { RoboRankScore } from "@/components/dashboard/RoboRankScore";
import { Loader2, Search, Swords, Zap, Info, Users, X, Bookmark, BookmarkCheck, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

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

function PredictionBar({ labelA, labelB, winProbA }: { labelA: string; labelB: string; winProbA: number }) {
  const winProbB = 100 - winProbA;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-medium">
        <span className="text-destructive">{labelA} — {winProbA}%</span>
        <span className="text-[hsl(var(--chart-2))]">{winProbB}% — {labelB}</span>
      </div>
      <div className="h-3 rounded-full overflow-hidden bg-muted flex">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${winProbA}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-gradient-to-r from-destructive to-destructive/70 rounded-l-full"
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
      <div className={cn("text-right text-sm font-medium stat-number", aWins && "text-destructive")}>{valueA}</div>
      <div className="text-center text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={cn("text-left text-sm font-medium stat-number", bWins && "text-[hsl(var(--chart-2))]")}>{valueB}</div>
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
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {selectedTeam ? (
        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-2.5">
          <div className="min-w-0">
            <span className="font-display font-bold text-primary text-sm">{selectedTeam.number}</span>
            <span className="text-xs text-muted-foreground ml-1.5 truncate">{selectedTeam.name}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onSelect(null)} className="text-xs h-6 px-2">
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Team #..."
            className="pl-8 bg-card uppercase h-9 text-sm"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setDebouncedQuery(e.target.value); }}
          />
          {isLoading && (
            <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
          {results && results.length > 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-40 overflow-y-auto">
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

function useTeamStats(rawTeam: any) {
  const { season } = useSeason();
  return useQuery({
    queryKey: ["predictorStats", rawTeam?.id, season],
    queryFn: async (): Promise<TeamStats> => {
      const [rankings, matches, skills] = await Promise.all([
        getTeamRankings(rawTeam.id, season),
        getTeamMatches(rawTeam.id, season),
        getTeamSkillsScore(rawTeam.id, season),
      ]);
      const record = calculateRecordFromMatches(matches || [], rawTeam.number);
      const rr = calculateRoboRank(rankings || [], skills);
      return {
        number: rawTeam.number,
        name: rawTeam.team_name,
        id: rawTeam.id,
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
    enabled: !!rawTeam?.id,
  });
}

function combineAllianceStats(a: TeamStats | undefined, b: TeamStats | undefined): TeamStats | null {
  if (!a && !b) return null;
  if (!a) return b!;
  if (!b) return a;
  return {
    number: `${a.number} + ${b.number}`,
    name: "Alliance",
    id: 0,
    roboRank: Math.round((a.roboRank + b.roboRank) / 2),
    winRate: Math.round((a.winRate + b.winRate) / 2),
    wins: a.wins + b.wins,
    losses: a.losses + b.losses,
    ties: a.ties + b.ties,
    highScore: Math.max(a.highScore, b.highScore),
    avgPoints: Math.round((a.avgPoints + b.avgPoints) * 10) / 10,
    skillsCombined: Math.round((a.skillsCombined + b.skillsCombined) / 2),
    matchesPlayed: a.matchesPlayed + b.matchesPlayed,
  };
}

function calculateWinProbability(a: TeamStats, b: TeamStats): number {
  const rrWeight = 0.4, wrWeight = 0.25, skillsWeight = 0.2, hsWeight = 0.15;
  const rrDiff = (a.roboRank - b.roboRank) / 100;
  const wrDiff = (a.winRate - b.winRate) / 100;
  const skillsDiff = a.skillsCombined && b.skillsCombined
    ? (a.skillsCombined - b.skillsCombined) / Math.max(a.skillsCombined, b.skillsCombined, 1) : 0;
  const hsDiff = a.highScore && b.highScore
    ? (a.highScore - b.highScore) / Math.max(a.highScore, b.highScore, 1) : 0;
  const combined = rrDiff * rrWeight + wrDiff * wrWeight + skillsDiff * skillsWeight + hsDiff * hsWeight;
  return Math.round((1 / (1 + Math.exp(-combined * 4))) * 100);
}

function useHeadToHead(teamAId: number | undefined, teamBIds: number[], teamANumber: string, teamBNumbers: string[]) {
  const { season } = useSeason();
  return useQuery({
    queryKey: ["headToHead", teamAId, teamBIds.join(","), season],
    queryFn: async () => {
      if (!teamAId) return null;
      const matches = await getTeamMatches(teamAId, season);
      if (!matches) return null;
      let wins = 0, losses = 0, ties = 0;
      const sharedMatches: any[] = [];
      matches.forEach((m: any) => {
        const allTeams = m.alliances?.flatMap((a: any) => a.teams?.map((t: any) => t.team?.name) || []) || [];
        if (!teamBNumbers.some(n => allTeams.includes(n))) return;
        const myAlliance = m.alliances?.find((a: any) => a.teams?.some((t: any) => t.team?.name === teamANumber));
        const oppAlliance = m.alliances?.find((a: any) => a.color !== myAlliance?.color);
        if (!myAlliance || !oppAlliance) return;
        if (!oppAlliance.teams?.some((t: any) => teamBNumbers.includes(t.team?.name))) return;
        const myScore = myAlliance.score ?? 0;
        const oppScore = oppAlliance.score ?? 0;
        if (myScore > oppScore) wins++;
        else if (myScore < oppScore) losses++;
        else ties++;
        sharedMatches.push({ name: m.name, myScore, oppScore, result: myScore > oppScore ? "W" : myScore < oppScore ? "L" : "T" });
      });
      return { wins, losses, ties, total: wins + losses + ties, matches: sharedMatches };
    },
    enabled: !!teamAId && teamBIds.length > 0,
  });
}

export default function MatchPredictor() {
  const { season } = useSeason();
  const seasonInfo = SEASONS[season];
  const queryClient = useQueryClient();

  const [red1Raw, setRed1Raw] = useState<any>(null);
  const [red2Raw, setRed2Raw] = useState<any>(null);
  const [blue1Raw, setBlue1Raw] = useState<any>(null);
  const [blue2Raw, setBlue2Raw] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("predict");

  useState(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  });

  const { data: red1Stats, isLoading: loadingR1 } = useTeamStats(red1Raw);
  const { data: red2Stats, isLoading: loadingR2 } = useTeamStats(red2Raw);
  const { data: blue1Stats, isLoading: loadingB1 } = useTeamStats(blue1Raw);
  const { data: blue2Stats, isLoading: loadingB2 } = useTeamStats(blue2Raw);

  const anyLoading = loadingR1 || loadingR2 || loadingB1 || loadingB2;
  const redAlliance = combineAllianceStats(red1Stats, red2Stats);
  const blueAlliance = combineAllianceStats(blue1Stats, blue2Stats);
  const bothReady = redAlliance && blueAlliance;
  const winProbRed = bothReady ? calculateWinProbability(redAlliance, blueAlliance) : 50;

  const redNumbers = [red1Stats?.number, red2Stats?.number].filter(Boolean) as string[];
  const blueNumbers = [blue1Stats?.number, blue2Stats?.number].filter(Boolean) as string[];

  const { data: h2h } = useHeadToHead(
    red1Stats?.id,
    [blue1Stats?.id, blue2Stats?.id].filter(Boolean) as number[],
    redNumbers[0] || "",
    blueNumbers
  );

  // Saved predictions
  const { data: savedPredictions } = useQuery({
    queryKey: ["savedPredictions", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase.from("saved_predictions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!userId,
  });

  const handleSavePrediction = async () => {
    if (!userId || !bothReady) return;
    const { error } = await supabase.from("saved_predictions").insert({
      user_id: userId,
      red_team_1: red1Stats?.number || "",
      red_team_2: red2Stats?.number || null,
      blue_team_1: blue1Stats?.number || "",
      blue_team_2: blue2Stats?.number || null,
      win_prob_red: winProbRed,
      season,
      label: `${redNumbers.join("+")} vs ${blueNumbers.join("+")}`,
    } as any);
    if (error) toast.error(error.message);
    else {
      toast.success("Prediction saved!");
      queryClient.invalidateQueries({ queryKey: ["savedPredictions"] });
    }
  };

  const handleDeletePrediction = async (id: string) => {
    await supabase.from("saved_predictions").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["savedPredictions"] });
  };

  return (
    <AppLayout>
      <div className="max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Match Predictor</h1>
            <p className="text-muted-foreground mt-1">
              Simulate alliance matches · {seasonInfo.name} {seasonInfo.year}
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="predict">Predict</TabsTrigger>
            <TabsTrigger value="saved">
              Saved {savedPredictions?.length ? `(${savedPredictions.length})` : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="predict" className="space-y-6 mt-4">
            {/* Alliance Setup */}
            <div className="grid gap-4 md:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-xl border-2 border-destructive/30 bg-destructive/5 p-4 space-y-3"
              >
                <div className="flex items-center gap-2 text-sm font-display font-bold text-destructive">
                  <Users className="h-4 w-4" /> Red Alliance
                </div>
                <TeamSearch label="Red 1" onSelect={setRed1Raw} selectedTeam={red1Stats || null} />
                <TeamSearch label="Red 2" onSelect={setRed2Raw} selectedTeam={red2Stats || null} />
                {redAlliance && (
                  <div className="flex items-center gap-3 pt-1 border-t border-destructive/10">
                    <RoboRankScore score={redAlliance.roboRank} size="sm" />
                    <div className="text-xs text-muted-foreground">
                      Avg RR: {redAlliance.roboRank} · WR: {redAlliance.winRate}%
                    </div>
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-xl border-2 border-[hsl(var(--chart-2))]/30 bg-[hsl(var(--chart-2))]/5 p-4 space-y-3"
              >
                <div className="flex items-center gap-2 text-sm font-display font-bold text-[hsl(var(--chart-2))]">
                  <Users className="h-4 w-4" /> Blue Alliance
                </div>
                <TeamSearch label="Blue 1" onSelect={setBlue1Raw} selectedTeam={blue1Stats || null} />
                <TeamSearch label="Blue 2" onSelect={setBlue2Raw} selectedTeam={blue2Stats || null} />
                {blueAlliance && (
                  <div className="flex items-center gap-3 pt-1 border-t border-[hsl(var(--chart-2))]/10">
                    <RoboRankScore score={blueAlliance.roboRank} size="sm" />
                    <div className="text-xs text-muted-foreground">
                      Avg RR: {blueAlliance.roboRank} · WR: {blueAlliance.winRate}%
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            {anyLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Loading stats...</span>
              </div>
            )}

            {!bothReady && !anyLoading && (
              <div className="rounded-xl border border-border/50 card-gradient p-8 text-center space-y-3">
                <Swords className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">Add at least one team to each alliance to predict</p>
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
                  {/* Prediction */}
                  <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-destructive/5 via-transparent to-[hsl(var(--chart-2))]/5 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        <h2 className="font-display font-bold text-lg">Prediction</h2>
                      </div>
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSavePrediction}>
                        <Bookmark className="h-3.5 w-3.5" /> Save
                      </Button>
                    </div>
                    <PredictionBar
                      labelA={`Red (${redNumbers.join(" + ")})`}
                      labelB={`Blue (${blueNumbers.join(" + ")})`}
                      winProbA={winProbRed}
                    />
                    <p className="text-sm text-muted-foreground text-center">
                      {winProbRed > 55 ? "Red Alliance is favored" : winProbRed < 45 ? "Blue Alliance is favored" : "Close matchup — could go either way"}
                    </p>
                  </div>

                  <Tabs defaultValue="comparison" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="comparison">Alliance Stats</TabsTrigger>
                      <TabsTrigger value="h2h">Head-to-Head {h2h?.total ? `(${h2h.total})` : ""}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="comparison">
                      <div className="rounded-xl border border-border/50 card-gradient p-6">
                        <div className="grid grid-cols-3 gap-2 mb-3">
                          <div className="text-right text-sm font-display font-bold text-destructive">Red</div>
                          <div className="text-center text-xs text-muted-foreground uppercase tracking-wider">VS</div>
                          <div className="text-left text-sm font-display font-bold text-[hsl(var(--chart-2))]">Blue</div>
                        </div>
                        <StatCompare label="Avg RoboRank" valueA={redAlliance.roboRank} valueB={blueAlliance.roboRank} />
                        <StatCompare label="Avg Win Rate" valueA={`${redAlliance.winRate}%`} valueB={`${blueAlliance.winRate}%`} />
                        <StatCompare label="Matches" valueA={redAlliance.matchesPlayed} valueB={blueAlliance.matchesPlayed} />
                        <StatCompare label="High Score" valueA={redAlliance.highScore} valueB={blueAlliance.highScore} />
                        <StatCompare label="Avg Pts" valueA={redAlliance.avgPoints} valueB={blueAlliance.avgPoints} />
                        <StatCompare label="Avg Skills" valueA={redAlliance.skillsCombined} valueB={blueAlliance.skillsCombined} />
                        <StatCompare label="Record" valueA={`${redAlliance.wins}W-${redAlliance.losses}L`} valueB={`${blueAlliance.wins}W-${blueAlliance.losses}L`} />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 mt-4">
                        {[red1Stats, red2Stats, blue1Stats, blue2Stats].filter(Boolean).map((team) => (
                          <div key={team!.number} className="rounded-lg border border-border/30 p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-display font-bold text-sm">{team!.number}</span>
                              <RoboRankScore score={team!.roboRank} size="sm" />
                            </div>
                            <div className="grid grid-cols-3 gap-1 text-[11px] text-muted-foreground">
                              <span>{team!.wins}W-{team!.losses}L</span>
                              <span>WR: {team!.winRate}%</span>
                              <span>HS: {team!.highScore}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="h2h">
                      <div className="rounded-xl border border-border/50 card-gradient p-6">
                        {!h2h || h2h.total === 0 ? (
                          <div className="text-center py-6 space-y-2">
                            <Swords className="h-8 w-8 text-muted-foreground mx-auto" />
                            <p className="text-sm text-muted-foreground">No head-to-head matches found this season</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center justify-center gap-6 text-center">
                              <div>
                                <div className="text-2xl font-display font-bold text-destructive">{h2h.wins}</div>
                                <div className="text-xs text-muted-foreground">Red Wins</div>
                              </div>
                              <div className="text-lg text-muted-foreground">—</div>
                              <div>
                                <div className="text-2xl font-display font-bold text-muted-foreground">{h2h.ties}</div>
                                <div className="text-xs text-muted-foreground">Ties</div>
                              </div>
                              <div className="text-lg text-muted-foreground">—</div>
                              <div>
                                <div className="text-2xl font-display font-bold text-[hsl(var(--chart-2))]">{h2h.losses}</div>
                                <div className="text-xs text-muted-foreground">Blue Wins</div>
                              </div>
                            </div>
                            <div className="space-y-1.5 border-t border-border/30 pt-3">
                              <p className="text-xs font-medium text-muted-foreground mb-2">Match History</p>
                              {h2h.matches.map((m: any, i: number) => (
                                <div key={i} className={cn(
                                  "flex items-center justify-between text-sm py-1.5 px-3 rounded-lg",
                                  m.result === "W" ? "bg-destructive/5" : m.result === "L" ? "bg-[hsl(var(--chart-2))]/5" : "bg-muted/30"
                                )}>
                                  <span className="text-xs text-muted-foreground">{m.name}</span>
                                  <span className="font-medium">{m.myScore} - {m.oppScore}</span>
                                  <span className={cn("text-xs font-bold",
                                    m.result === "W" ? "text-destructive" : m.result === "L" ? "text-[hsl(var(--chart-2))]" : "text-muted-foreground"
                                  )}>{m.result === "W" ? "Red" : m.result === "L" ? "Blue" : "Tie"}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>Predictions combine average RoboRank, win rates, skills scores, and match history. Actual results depend on strategy, driver skill, and conditions.</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="saved" className="space-y-4 mt-4">
            {!savedPredictions || savedPredictions.length === 0 ? (
              <div className="rounded-xl border border-border/50 card-gradient p-8 text-center space-y-3">
                <BookmarkCheck className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">No saved predictions yet. Run a prediction and hit Save!</p>
              </div>
            ) : (
              savedPredictions.map((pred: any) => (
                <motion.div
                  key={pred.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border/50 card-gradient p-4 space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display font-semibold text-sm">{pred.label || "Prediction"}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(pred.created_at).toLocaleDateString()}
                      </span>
                      <Button
                        size="sm" variant="ghost"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive"
                        onClick={() => handleDeletePrediction(pred.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-destructive font-medium">Red: {pred.red_team_1}{pred.red_team_2 ? ` + ${pred.red_team_2}` : ""}</span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="text-[hsl(var(--chart-2))] font-medium">Blue: {pred.blue_team_1}{pred.blue_team_2 ? ` + ${pred.blue_team_2}` : ""}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden bg-muted flex">
                    <div className="bg-destructive/70 rounded-l-full" style={{ width: `${pred.win_prob_red}%` }} />
                    <div className="bg-[hsl(var(--chart-2))]/70 rounded-r-full" style={{ width: `${100 - pred.win_prob_red}%` }} />
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Red {pred.win_prob_red}%</span>
                    <span>Blue {100 - pred.win_prob_red}%</span>
                  </div>
                </motion.div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
