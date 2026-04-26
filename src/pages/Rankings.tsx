import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RoboRankScore } from "@/components/dashboard/RoboRankScore";
import { Search, Loader2, Zap, Globe, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PullToRefresh } from "@/components/PullToRefresh";
import {
  getWorldSkillsRankings,
  getTeamRankings,
  getTeamByNumber,
  getTeamSkillsScore,
  fetchRobotEvents,
  searchTeamsPartial,
  calculateRecordFromRankings,
  calculateRoboRank,
  SEASONS,
  type SeasonKey,
} from "@/lib/robotevents";
import { useSeason } from "@/contexts/SeasonContext";
import type { GradeLevel } from "@/contexts/SeasonContext";
// motion no longer used — long lists use lightweight CSS fade-in for perf

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

type Tab = "skills" | "roborank" | "regions";

interface RegionRow {
  region: string;
  teamCount: number;
  scoredCount: number;
  avgRoboRank: number;
  topTeam: { number: string; score: number } | null;
}

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

export default function Rankings() {
  const navigate = useNavigate();
  const { season, gradeLevel } = useSeason();
  const [tab, setTab] = useState<Tab>("roborank");
  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(50);
  const [streamedResults, setStreamedResults] = useState<RankedTeam[]>([]);
  const [progress, setProgress] = useState({ processed: 0, total: 0, done: false });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [regionSearch, setRegionSearch] = useState("");

  const seasonInfo = SEASONS[season];

  const { data: skillsLeaderboard, isLoading: skillsLoading } = useQuery({
    queryKey: ["globalSkillsLeaderboard", season, gradeLevel],
    queryFn: () => getGlobalSkillsPool(season, gradeLevel),
    enabled: tab === "skills" || tab === "regions",
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
              const score = calculateRoboRank(rankings, team.combined);

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
              // ignore
            }
          }),
        );

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
    enabled: tab === "roborank" || tab === "regions",
    staleTime: 15 * 60 * 1000,
  });

  // Build region rankings from skills pool + computed RoboRank scores
  const regionData = useMemo<{ rows: RegionRow[]; scoredTeams: number; totalTeams: number }>(() => {
    if (!skillsLeaderboard || skillsLeaderboard.length === 0) {
      return { rows: [], scoredTeams: 0, totalTeams: 0 };
    }
    const rrLookup = new Map<number, { score: number; number: string }>();
    (roboRankLeaderboard ?? streamedResults).forEach((t) => {
      rrLookup.set(t.id, { score: t.score, number: t.number });
    });

    // Bucket teams by region (eventRegion already encodes sub-regions like "Texas - Region 3")
    const buckets = new Map<string, SkillsTeam[]>();
    skillsLeaderboard.forEach((t) => {
      const region = (t.region || "").trim();
      if (!region) return;
      if (!buckets.has(region)) buckets.set(region, []);
      buckets.get(region)!.push(t);
    });

    const rows: RegionRow[] = [];
    let scoredTeams = 0;
    let totalTeams = 0;
    buckets.forEach((teams, region) => {
      if (teams.length < 25) return; // require at least 25 teams in a region
      const topTeams = teams.slice().sort((a, b) => b.combined - a.combined).slice(0, 100);
      const scored = topTeams
        .map((t) => ({ team: t, rr: rrLookup.get(t.id) }))
        .filter((x) => x.rr && x.rr.score > 0);

      if (scored.length === 0) {
        rows.push({ region, teamCount: teams.length, scoredCount: 0, avgRoboRank: 0, topTeam: null });
        totalTeams += topTeams.length;
        return;
      }

      const avg = scored.reduce((s, x) => s + x.rr!.score, 0) / scored.length;
      const top = scored.reduce((best, x) => (!best || x.rr!.score > best.rr!.score ? x : best), scored[0]);

      rows.push({
        region,
        teamCount: teams.length,
        scoredCount: scored.length,
        avgRoboRank: Math.round(avg * 10) / 10,
        topTeam: top.rr ? { number: top.team.number, score: top.rr.score } : null,
      });
      scoredTeams += scored.length;
      totalTeams += topTeams.length;
    });

    rows.sort((a, b) => b.avgRoboRank - a.avgRoboRank || b.scoredCount - a.scoredCount);
    return { rows, scoredTeams, totalTeams };
  }, [skillsLeaderboard, roboRankLeaderboard, streamedResults]);

  // Debounce search for live API lookup
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim().toUpperCase()), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Live search: search the RobotEvents API for teams matching the query
  const { data: liveSearchResults, isLoading: liveSearchLoading } = useQuery({
    queryKey: ["liveTeamSearch", debouncedSearch, season, tab],
    queryFn: async () => {
      // Search the API for teams matching the query (partial number + name)
      const teams = await searchTeamsPartial(debouncedSearch);
      if (teams.length === 0) return [];

      // For RoboRank tab, calculate scores for found teams
      if (tab === "roborank") {
        const ranked: RankedTeam[] = [];
        await Promise.all(
          teams.map(async (team: any) => {
            // Skip if already in leaderboard
            const existing = (roboRankLeaderboard ?? streamedResults)?.find((t) => t.id === team.id);
            if (existing) return;
            try {
              const [rankings, skillsScore] = await Promise.all([
                getTeamRankings(team.id, season),
                getTeamSkillsScore(team.id, season),
              ]);
              const record = calculateRecordFromRankings(rankings);
              const score = calculateRoboRank(rankings, skillsScore);
              ranked.push({
                number: team.number,
                name: team.team_name || "",
                id: team.id,
                score,
                wins: record.wins,
                losses: record.losses,
                ties: record.ties,
                total: record.total,
                winRate: `${record.winRate}%`,
                eventsAttended: record.eventsAttended,
                skillsCombined: skillsScore,
              });
            } catch {
              // ignore
            }
          })
        );
        return ranked;
      }

      // For skills tab, return basic team info for filtering
      return teams.map((t: any) => ({
        id: t.id,
        number: t.number,
        name: t.team_name || "",
      }));
    },
    enabled: debouncedSearch.length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim().toUpperCase();
    if (q) navigate(`/team/${q}`);
  };

  const loading = tab === "skills" ? skillsLoading : (roboRankLoading && streamedResults.length === 0);

  const activeRoboRankBase = roboRankLeaderboard ?? streamedResults;

  // Build a lookup map for RoboRank scores to show in skills tab
  const roboRankMap = new Map<number, number>();
  activeRoboRankBase?.forEach((t) => {
    roboRankMap.set(t.id, t.score);
  });

  const filteredSkills = skillsLeaderboard?.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toUpperCase();
    return t.number.toUpperCase().includes(q) || t.name.toUpperCase().includes(q);
  });

  const filteredRoboRank = (() => {
    let results = activeRoboRankBase?.filter((t) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toUpperCase();
      return t.number.toUpperCase().includes(q) || t.name.toUpperCase().includes(q);
    }) ?? [];
    // Append live search results that aren't already in the list
    if (liveSearchResults && tab === "roborank") {
      const liveRanked = liveSearchResults as RankedTeam[];
      liveRanked.forEach((lr) => {
        if (!results.find((t) => t.id === lr.id)) {
          results = [...results, lr];
        }
      });
    }
    return results;
  })();

  const gradeBadge = gradeLevel === "Both" ? "All" : gradeLevel === "High School" ? "HS" : "MS";

  const queryClient = useQueryClient();
  return (
    <AppLayout>
      <PullToRefresh onRefresh={() => queryClient.invalidateQueries()}>
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
          <Button variant={tab === "regions" ? "default" : "outline"} size="sm" onClick={() => setTab("regions")}>
            <MapPin className="h-3.5 w-3.5 mr-1.5" /> Regions
          </Button>
        </div>

        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-2.5 text-xs text-muted-foreground leading-relaxed">
          <strong className="text-yellow-400/90">Note:</strong> The RoboRank leaderboard is based on a sample of the <strong>top 2,000 skills teams</strong> globally. 
          Teams outside this pool won't appear on the leaderboard but can be searched individually to calculate their score on the fly. 
          <Link to="/about" className="text-primary hover:underline ml-1">Learn how RoboRank is calculated →</Link>
        </div>

        <form onSubmit={handleSearch} className="max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search any team number..."
              className="pl-10 bg-card"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Type to search globally. Press Enter to view profile.
            {liveSearchLoading && <span className="ml-2 text-primary">Searching...</span>}
          </p>
        </form>

        {loading && (
          <div className="flex flex-col items-center gap-2 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {tab === "skills" ? "Loading global skills rankings..." : "Calculating RoboRank scores for top teams..."}
            </p>
          </div>
        )}

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
                {/* Desktop table header */}
                <div className="hidden md:grid grid-cols-12 gap-2 px-6 py-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-1">#</div>
                  <div className="col-span-3">Team</div>
                  <div className="col-span-2 text-center">Driver</div>
                  <div className="col-span-2 text-center">Prog</div>
                  <div className="col-span-2 text-center">Combined</div>
                  <div className="col-span-2 text-center">RoboRank</div>
                </div>
                {filteredSkills.slice(0, displayCount).map((team) => (
                  <div
                    key={`${team.id}-${team.rank}`}
                    onClick={() => navigate(`/team/${team.number}`)}
                    className="border-t border-border/30 hover:bg-accent/50 active:bg-accent/70 transition-colors cursor-pointer animate-fade-in"
                  >
                    {/* Desktop row */}
                    <div className="hidden md:grid grid-cols-12 gap-2 px-6 py-4 items-center">
                      <div className="col-span-1 stat-number text-muted-foreground">{team.rank}</div>
                      <div className="col-span-3">
                        <div className="font-display font-semibold">{team.number}</div>
                        <div className="text-xs text-muted-foreground truncate">{team.name}</div>
                      </div>
                      <div className="col-span-2 text-center stat-number text-sm">{team.driverScore}</div>
                      <div className="col-span-2 text-center stat-number text-sm">{team.progScore}</div>
                      <div className="col-span-2 text-center">
                        <span className="stat-number text-primary text-lg">{team.combined}</span>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        {roboRankMap.has(team.id) ? (
                          <RoboRankScore score={roboRankMap.get(team.id)!} size="sm" />
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    </div>
                    {/* Mobile card row */}
                    <div className="md:hidden flex items-center gap-3 px-4 py-3 min-h-[64px]">
                      <div className="w-7 text-right stat-number text-muted-foreground text-sm shrink-0">{team.rank}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-display font-semibold text-sm">{team.number}</div>
                        <div className="text-xs text-muted-foreground truncate">{team.name}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="stat-number text-primary text-base leading-none">{team.combined}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">D {team.driverScore} · P {team.progScore}</div>
                      </div>
                      {roboRankMap.has(team.id) && (
                        <div className="shrink-0">
                          <RoboRankScore score={roboRankMap.get(team.id)!} size="sm" />
                        </div>
                      )}
                    </div>
                  </div>
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
              {/* Desktop header */}
              <div className="hidden md:grid grid-cols-12 gap-2 px-6 py-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-1">#</div>
                <div className="col-span-3">Team</div>
                <div className="col-span-2 text-center">RoboRank</div>
                <div className="col-span-2 text-center">Record</div>
                <div className="col-span-2 text-center">Win Rate</div>
                <div className="col-span-2 text-center">Skills</div>
              </div>
              {filteredRoboRank.slice(0, displayCount).map((team, i) => (
                <div
                  key={team.number}
                  onClick={() => navigate(`/team/${team.number}`)}
                  className="border-t border-border/30 hover:bg-accent/50 active:bg-accent/70 transition-colors cursor-pointer animate-fade-in"
                >
                  {/* Desktop row */}
                  <div className="hidden md:grid grid-cols-12 gap-2 px-6 py-4 items-center">
                    <div className="col-span-1 stat-number text-muted-foreground">{i + 1}</div>
                    <div className="col-span-3">
                      <div className="font-display font-semibold">{team.number}</div>
                      <div className="text-xs text-muted-foreground truncate">{team.name}</div>
                    </div>
                    <div className="col-span-2 flex justify-center"><RoboRankScore score={team.score} size="sm" /></div>
                    <div className="col-span-2 text-center text-sm">
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
                    <div className="col-span-2 text-center stat-number text-sm text-muted-foreground">{team.skillsCombined}</div>
                  </div>
                  {/* Mobile card row */}
                  <div className="md:hidden flex items-center gap-3 px-4 py-3 min-h-[64px]">
                    <div className="w-7 text-right stat-number text-muted-foreground text-sm shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-semibold text-sm">{team.number}</div>
                      <div className="text-xs text-muted-foreground truncate">{team.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                        <span className="text-success">{team.wins}W</span>
                        <span className="mx-0.5">·</span>
                        <span className="text-destructive">{team.losses}L</span>
                        <span className="mx-1.5 text-border">|</span>
                        <span>{team.winRate}</span>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <RoboRankScore score={team.score} size="sm" />
                    </div>
                  </div>
                </div>
              ))}
              {filteredRoboRank.length > displayCount && (
                <div className="flex justify-center p-4 border-t border-border/30">
                  <Button variant="outline" onClick={() => setDisplayCount((c) => c + 50)}>
                    Show More ({filteredRoboRank.length - displayCount} remaining)
                  </Button>
                </div>
              )}
            </div>
        )}

        {tab === "roborank" && !loading && filteredRoboRank && filteredRoboRank.length === 0 && (
          <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
            {debouncedSearch.length >= 2 && liveSearchLoading
              ? "Searching..."
              : `No teams found for ${seasonInfo.name}.`}
          </div>
        )}

        {tab === "regions" && (
          <>
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-muted-foreground leading-relaxed">
              <strong className="text-primary">How this works:</strong> Each region's strength is the average RoboRank of its top 100 teams (by skills score).
              Big states like Texas and California are split into sub-regions by RobotEvents (e.g. "Texas - Region 3"). Only regions with 25+ teams are shown.
              Scores fill in as the global RoboRank leaderboard finishes computing.
            </div>

            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter regions..."
                className="pl-10 bg-card"
                value={regionSearch}
                onChange={(e) => setRegionSearch(e.target.value)}
              />
            </div>

            {skillsLoading && (
              <div className="flex flex-col items-center gap-2 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading region data...</p>
              </div>
            )}

            {!skillsLoading && regionData.rows.length > 0 && (
              <>
                {(roboRankLoading || regionData.scoredTeams < regionData.totalTeams) && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>RoboRank coverage filling in...</span>
                      <span>{regionData.scoredTeams}/{regionData.totalTeams} teams scored</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${(regionData.scoredTeams / Math.max(regionData.totalTeams, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-border/50 overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <div className="col-span-1">#</div>
                    <div className="col-span-4">Region</div>
                    <div className="col-span-2 text-center">Avg RoboRank</div>
                    <div className="col-span-2 text-center hidden sm:block">Teams Scored</div>
                    <div className="col-span-3 text-center hidden sm:block">Top Team</div>
                  </div>
                  {regionData.rows
                    .filter((r) => !regionSearch.trim() || r.region.toLowerCase().includes(regionSearch.trim().toLowerCase()))
                    .map((row, i) => (
                      <div
                        key={row.region}
                        className="grid grid-cols-12 gap-2 px-6 py-4 items-center border-t border-border/30 hover:bg-accent/30 transition-colors animate-fade-in"
                      >
                        <div className="col-span-1 stat-number text-muted-foreground">{i + 1}</div>
                        <div className="col-span-4">
                          <div className="font-display font-semibold flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-primary/70" />
                            {row.region}
                          </div>
                          <div className="text-xs text-muted-foreground">{row.teamCount} teams in region</div>
                        </div>
                        <div className="col-span-2 flex justify-center">
                          {row.scoredCount > 0 ? (
                            <RoboRankScore score={Math.round(row.avgRoboRank)} size="sm" />
                          ) : (
                            <span className="text-xs text-muted-foreground">pending</span>
                          )}
                        </div>
                        <div className="col-span-2 text-center text-sm text-muted-foreground hidden sm:block">
                          {row.scoredCount}/{Math.min(row.teamCount, 100)}
                        </div>
                        <div className="col-span-3 text-center hidden sm:block">
                          {row.topTeam ? (
                            <button
                              onClick={() => navigate(`/team/${row.topTeam!.number}`)}
                              className="text-sm font-display font-semibold text-primary hover:underline"
                            >
                              {row.topTeam.number} <span className="text-xs text-muted-foreground">({row.topTeam.score})</span>
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </>
            )}

            {!skillsLoading && regionData.rows.length === 0 && (
              <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
                No regions with 25+ teams found for {seasonInfo.name}.
              </div>
            )}
          </>
        )}
      </div>
      </PullToRefresh>
    </AppLayout>
  );
}
