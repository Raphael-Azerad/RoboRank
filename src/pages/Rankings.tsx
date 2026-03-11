import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RoboRankScore } from "@/components/dashboard/RoboRankScore";
import { Search, Loader2, Zap, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
  getWorldSkillsRankings,
  getTeamRankings,
  getTeamSkills,
  calculateRecordFromRankings,
  SEASONS,
  type SeasonKey,
} from "@/lib/robotevents";
import { useSeason } from "@/contexts/SeasonContext";
import type { GradeLevel } from "@/contexts/SeasonContext";
import { motion } from "framer-motion";

interface SkillsTeam {
  rank: number;
  number: string;
  name: string;
  id: number;
  driverScore: number;
  progScore: number;
  combined: number;
  region: string;
  gradeLevel: string;
}

interface RankedTeam {
  number: string;
  name: string;
  id: number;
  score: number;
  wins: number;
  losses: number;
  ties: number;
  total: number;
  winRate: string;
  eventsAttended: number;
  skillsCombined: number;
}

type Tab = "skills" | "roborank";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeSkillsEntry(entry: any, grade: string): SkillsTeam | null {
  const id = entry?.team?.id;
  const number = entry?.team?.team || entry?.team?.number;
  if (!id || !number) return null;

  return {
    rank: Number(entry?.rank || 0),
    number,
    name: entry?.team?.teamName || entry?.team?.team_name || "",
    id,
    driverScore: Number(entry?.scores?.driver || 0),
    progScore: Number(entry?.scores?.programming || 0),
    combined: Number(entry?.scores?.score || 0),
    region: entry?.team?.eventRegion || "",
    gradeLevel: grade,
  };
}

async function getGlobalSkillsPool(season: SeasonKey, gradeLevel: GradeLevel): Promise<SkillsTeam[]> {
  const fetchGrades: string[] =
    gradeLevel === "Both"
      ? ["High School", "Middle School"]
      : [gradeLevel];

  const results = await Promise.all(
    fetchGrades.map((g) => getWorldSkillsRankings(season, g).then((raw) => ({ raw, grade: g })))
  );

  const teamMap = new Map<number, SkillsTeam>();

  results.forEach(({ raw, grade }) => {
    const arr = Array.isArray(raw) ? raw : [];
    arr.forEach((entry: any) => {
      const normalized = normalizeSkillsEntry(entry, grade);
      if (!normalized) return;
      const existing = teamMap.get(normalized.id);
      if (!existing || normalized.combined > existing.combined) {
        teamMap.set(normalized.id, normalized);
      }
    });
  });

  return Array.from(teamMap.values())
    .sort((a, b) => b.combined - a.combined || b.driverScore - a.driverScore)
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

/**
 * Improved RoboRank v2 algorithm
 * Combines competition record with skills performance for a holistic score.
 *
 * Components (total = 100):
 * - Win Rate (25%): raw win percentage
 * - Ranking Percentile (20%): average placement across events
 * - Skills Combined (20%): global skills score normalized
 * - Consistency (15%): low variance in event placements
 * - Event Volume (10%): number of events attended
 * - High Score (10%): best single match score
 */
function calculateRoboRankV2(
  rankings: any[],
  skillsCombined: number
): number {
  if (!rankings || rankings.length === 0) return 0;

  let wins = 0, losses = 0, ties = 0;
  let totalWP = 0, highScore = 0, totalAvgPoints = 0;
  const percentiles: number[] = [];

  rankings.forEach((r: any) => {
    wins += r.wins || 0;
    losses += r.losses || 0;
    ties += r.ties || 0;
    totalWP += r.wp || 0;
    if (r.high_score > highScore) highScore = r.high_score;
    totalAvgPoints += r.average_points || 0;

    if (r.rank && r.rank > 0) {
      const fieldSize = Math.max(r.rank, 24);
      percentiles.push(Math.max(0, (1 - (r.rank - 1) / fieldSize) * 100));
    }
  });

  const total = wins + losses + ties;
  if (total < 3) return 0;

  const winRate = total > 0 ? (wins / total) * 100 : 0;

  // 1. Win Rate (25%)
  const winComponent = winRate * 0.25;

  // 2. Ranking Percentile (20%)
  const avgPercentile = percentiles.length > 0
    ? percentiles.reduce((a, b) => a + b, 0) / percentiles.length
    : 50;
  const rankComponent = avgPercentile * 0.20;

  // 3. Skills Combined (20%) - normalized to ~450 max realistic score
  const skillsComponent = Math.min(skillsCombined / 450, 1) * 100 * 0.20;

  // 4. Consistency (15%) - low std dev in percentiles = high consistency
  let consistencyScore = 75; // default if only 1 event
  if (percentiles.length >= 2) {
    const mean = avgPercentile;
    const variance = percentiles.reduce((sum, p) => sum + (p - mean) ** 2, 0) / percentiles.length;
    const stdDev = Math.sqrt(variance);
    // Lower std dev = better. 0 stddev = 100, 40+ stddev = 0
    consistencyScore = Math.max(0, 100 - stdDev * 2.5);
  }
  const consistencyComponent = consistencyScore * 0.15;

  // 5. Event Volume (10%) - caps at 8 events
  const eventsAttended = rankings.length;
  const volumeComponent = Math.min(eventsAttended / 8, 1) * 100 * 0.10;

  // 6. High Score (10%) - normalized to ~120 max realistic
  const highScoreComponent = Math.min(highScore / 120, 1) * 100 * 0.10;

  return Math.round(Math.min(100,
    winComponent + rankComponent + skillsComponent +
    consistencyComponent + volumeComponent + highScoreComponent
  ));
}

export default function Rankings() {
  const navigate = useNavigate();
  const { season, gradeLevel } = useSeason();
  const [tab, setTab] = useState<Tab>("roborank");
  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(50);
  const [streamedResults, setStreamedResults] = useState<RankedTeam[]>([]);
  const [progress, setProgress] = useState({ processed: 0, total: 0, done: false });

  const seasonInfo = SEASONS[season];

  const { data: skillsLeaderboard, isLoading: skillsLoading } = useQuery({
    queryKey: ["globalSkillsLeaderboard", season, gradeLevel],
    queryFn: () => getGlobalSkillsPool(season, gradeLevel),
    enabled: tab === "skills",
    staleTime: 15 * 60 * 1000,
  });

  const { data: roboRankLeaderboard, isLoading: roboRankLoading } = useQuery({
    queryKey: ["globalRoboRank", season, gradeLevel],
    queryFn: async () => {
      const skillsPool = await getGlobalSkillsPool(season, gradeLevel);
      if (skillsPool.length === 0) return [];

      const candidates = skillsPool.slice(0, 2000);
      const results: RankedTeam[] = [];
      setStreamedResults([]);
      setProgress({ processed: 0, total: candidates.length, done: false });

      for (let i = 0; i < candidates.length; i += 25) {
        const batch = candidates.slice(i, i + 25);

        await Promise.all(
          batch.map(async (team) => {
            try {
              const rankings = await getTeamRankings(team.id, season);
              const record = calculateRecordFromRankings(rankings);
              const score = calculateRoboRankV2(rankings, team.combined);

              if (score > 0 && record.total >= 5) {
                results.push({
                  number: team.number,
                  name: team.name,
                  id: team.id,
                  score,
                  wins: record.wins,
                  losses: record.losses,
                  ties: record.ties,
                  total: record.total,
                  winRate: `${record.winRate}%`,
                  eventsAttended: record.eventsAttended,
                  skillsCombined: team.combined,
                });
              }
            } catch {
              // ignore individual team failures
            }
          }),
        );

        // Update streamed results progressively so users see teams appearing
        const sorted = [...results].sort((a, b) => b.score - a.score || b.skillsCombined - a.skillsCombined);
        setStreamedResults(sorted);
        setProgress({ processed: Math.min(i + 25, candidates.length), total: candidates.length, done: false });

        if (i + 25 < candidates.length) {
          await sleep(50);
        }
      }

      setProgress((p) => ({ ...p, done: true }));
      return results.sort((a, b) => b.score - a.score || b.skillsCombined - a.skillsCombined);
    },
    enabled: tab === "roborank",
    staleTime: 15 * 60 * 1000,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim().toUpperCase();
    if (q) navigate(`/team/${q}`);
  };

  const loading = tab === "skills" ? skillsLoading : (roboRankLoading && streamedResults.length === 0);

  // Use streamed results while still loading, final data when done
  const activeRoboRank = roboRankLeaderboard ?? streamedResults;

  const filteredSkills = skillsLeaderboard?.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toUpperCase();
    return t.number.toUpperCase().includes(q) || t.name.toUpperCase().includes(q);
  });

  const filteredRoboRank = activeRoboRank?.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toUpperCase();
    return t.number.toUpperCase().includes(q) || t.name.toUpperCase().includes(q);
  });

  const gradeBadge = gradeLevel === "Both" ? "All" : gradeLevel === "High School" ? "HS" : "MS";

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Rankings</h1>
          <p className="text-muted-foreground mt-1">
            {seasonInfo.name} {seasonInfo.year} · Global Leaderboard ·{" "}
            <span className="text-primary font-medium">{gradeBadge}</span>
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant={tab === "roborank" ? "default" : "outline"} size="sm" onClick={() => setTab("roborank")}>
            <Globe className="h-3.5 w-3.5 mr-1.5" /> RoboRank
          </Button>
          <Button variant={tab === "skills" ? "default" : "outline"} size="sm" onClick={() => setTab("skills")}>
            <Zap className="h-3.5 w-3.5 mr-1.5" /> Skills Leaderboard
          </Button>
        </div>

        <form onSubmit={handleSearch} className="max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filter by team number or name..."
              className="pl-10 bg-card"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>

        {loading && (
          <div className="flex flex-col items-center gap-2 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {tab === "skills" ? "Loading global skills rankings..." : "Calculating RoboRank scores for top teams..."}
            </p>
          </div>
        )}

        {/* Progress bar while RoboRank is streaming */}
        {tab === "roborank" && roboRankLoading && streamedResults.length > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Processing teams... {progress.processed}/{progress.total}</span>
              <span>{streamedResults.length} ranked</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${(progress.processed / Math.max(progress.total, 1)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {!loading && tab === "skills" && filteredSkills && (
          filteredSkills.length === 0 ? (
            <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
              No skills data found for {seasonInfo.name}.
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-1">#</div>
                  <div className="col-span-4">Team</div>
                  <div className="col-span-2 text-center">Driver</div>
                  <div className="col-span-2 text-center">Prog</div>
                  <div className="col-span-3 text-center">Combined</div>
                </div>
                {filteredSkills.slice(0, displayCount).map((team, i) => (
                  <motion.div
                    key={`${team.id}-${team.rank}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.01, 0.5) }}
                    onClick={() => navigate(`/team/${team.number}`)}
                    className="grid grid-cols-12 gap-2 px-6 py-4 items-center border-t border-border/30 hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <div className="col-span-1 stat-number text-muted-foreground">{team.rank}</div>
                    <div className="col-span-4">
                      <div className="font-display font-semibold">{team.number}</div>
                      <div className="text-xs text-muted-foreground truncate">{team.name}</div>
                    </div>
                    <div className="col-span-2 text-center stat-number text-sm">{team.driverScore}</div>
                    <div className="col-span-2 text-center stat-number text-sm">{team.progScore}</div>
                    <div className="col-span-3 text-center">
                      <span className="stat-number text-primary text-lg">{team.combined}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
              {filteredSkills.length > displayCount && (
                <div className="flex justify-center">
                  <Button variant="outline" onClick={() => setDisplayCount((c) => c + 50)}>
                    Show More ({filteredSkills.length - displayCount} remaining)
                  </Button>
                </div>
              )}
            </>
          )
        )}

        {tab === "roborank" && filteredRoboRank && filteredRoboRank.length > 0 && (
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-1">#</div>
                <div className="col-span-3">Team</div>
                <div className="col-span-2 text-center">RoboRank</div>
                <div className="col-span-2 text-center hidden sm:block">Record</div>
                <div className="col-span-2 text-center">Win Rate</div>
                <div className="col-span-2 text-center hidden sm:block">Skills</div>
              </div>
              {filteredRoboRank.map((team, i) => (
                <motion.div
                  key={team.number}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.015, 0.5) }}
                  onClick={() => navigate(`/team/${team.number}`)}
                  className="grid grid-cols-12 gap-2 px-6 py-4 items-center border-t border-border/30 hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className="col-span-1 stat-number text-muted-foreground">{i + 1}</div>
                  <div className="col-span-3">
                    <div className="font-display font-semibold">{team.number}</div>
                    <div className="text-xs text-muted-foreground truncate">{team.name}</div>
                  </div>
                  <div className="col-span-2 flex justify-center"><RoboRankScore score={team.score} size="sm" /></div>
                  <div className="col-span-2 text-center text-sm hidden sm:block">
                    <span className="text-success">{team.wins}W</span>
                    <span className="text-muted-foreground mx-0.5">-</span>
                    <span className="text-destructive">{team.losses}L</span>
                    {team.ties > 0 && (
                      <>
                        <span className="text-muted-foreground mx-0.5">-</span>
                        <span>{team.ties}T</span>
                      </>
                    )}
                  </div>
                  <div className="col-span-2 text-center stat-number text-sm">{team.winRate}</div>
                  <div className="col-span-2 text-center stat-number text-sm text-muted-foreground hidden sm:block">{team.skillsCombined}</div>
                </motion.div>
              ))}
            </div>
        )}
        
        {tab === "roborank" && !loading && filteredRoboRank && filteredRoboRank.length === 0 && (
          <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
            No teams found for {seasonInfo.name}.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
