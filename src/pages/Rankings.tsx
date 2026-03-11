import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RoboRankScore } from "@/components/dashboard/RoboRankScore";
import { Search, Loader2, Zap, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getWorldSkillsRankings, getTeamRankings, calculateRecordFromRankings, calculateRoboRank, SEASONS, type SeasonKey } from "@/lib/robotevents";
import { useSeason } from "@/contexts/SeasonContext";
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
}

type Tab = "skills" | "roborank";

export default function Rankings() {
  const navigate = useNavigate();
  const { season } = useSeason();
  const [tab, setTab] = useState<Tab>("skills");
  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(50);

  const seasonInfo = SEASONS[season];

  // Global Skills Leaderboard from the official endpoint
  const { data: skillsLeaderboard, isLoading: skillsLoading } = useQuery({
    queryKey: ["globalSkillsLeaderboard", season],
    queryFn: async () => {
      const data = await getWorldSkillsRankings(season, "High School");
      if (!Array.isArray(data)) return [];
      return data.map((entry: any) => ({
        rank: entry.rank,
        number: entry.team?.team || entry.team?.number || "",
        name: entry.team?.teamName || entry.team?.team_name || "",
        id: entry.team?.id || 0,
        driverScore: entry.scores?.driver || 0,
        progScore: entry.scores?.programming || 0,
        combined: entry.scores?.score || 0,
        region: entry.team?.eventRegion || "",
      })) as SkillsTeam[];
    },
    enabled: tab === "skills",
    staleTime: 10 * 60 * 1000,
  });

  // RoboRank leaderboard - uses top skills teams then fetches their rankings
  const { data: roboRankLeaderboard, isLoading: roboRankLoading } = useQuery({
    queryKey: ["globalRoboRank", season],
    queryFn: async () => {
      // First get top skills teams to have a good pool of strong teams
      const skillsData = await getWorldSkillsRankings(season, "High School");
      if (!Array.isArray(skillsData) || skillsData.length === 0) return [];

      // Take top 100 skills teams and compute their RoboRank
      const topTeams = skillsData.slice(0, 100);
      const results: RankedTeam[] = [];

      await Promise.all(topTeams.map(async (entry: any) => {
        try {
          const teamId = entry.team?.id;
          if (!teamId) return;
          const rankings = await getTeamRankings(teamId, season);
          const record = calculateRecordFromRankings(rankings);
          const score = calculateRoboRank(rankings);
          if (score > 0 && record.total >= 3) {
            results.push({
              number: entry.team?.team || entry.team?.number || "",
              name: entry.team?.teamName || entry.team?.team_name || "",
              id: teamId,
              score,
              wins: record.wins,
              losses: record.losses,
              ties: record.ties,
              total: record.total,
              winRate: `${record.winRate}%`,
              eventsAttended: record.eventsAttended,
            });
          }
        } catch {}
      }));

      return results.sort((a, b) => b.score - a.score);
    },
    enabled: tab === "roborank",
    staleTime: 10 * 60 * 1000,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim().toUpperCase();
    if (q) navigate(`/team/${q}`);
  };

  const loading = tab === "skills" ? skillsLoading : roboRankLoading;

  const filteredSkills = skillsLeaderboard?.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toUpperCase();
    return t.number.toUpperCase().includes(q) || t.name.toUpperCase().includes(q);
  });

  const filteredRoboRank = roboRankLeaderboard?.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toUpperCase();
    return t.number.toUpperCase().includes(q) || t.name.toUpperCase().includes(q);
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Rankings</h1>
          <p className="text-muted-foreground mt-1">
            {seasonInfo.name} {seasonInfo.year} · Global Leaderboard
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          <Button variant={tab === "skills" ? "default" : "outline"} size="sm" onClick={() => setTab("skills")}>
            <Zap className="h-3.5 w-3.5 mr-1.5" /> Skills Leaderboard
          </Button>
          <Button variant={tab === "roborank" ? "default" : "outline"} size="sm" onClick={() => setTab("roborank")}>
            <Globe className="h-3.5 w-3.5 mr-1.5" /> RoboRank
          </Button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Filter by team number or name..." className="pl-10 bg-card uppercase"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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

        {/* Skills Leaderboard */}
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
                  <motion.div key={`${team.id}-${team.rank}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.01, 0.5) }}
                    onClick={() => navigate(`/team/${team.number}`)}
                    className="grid grid-cols-12 gap-2 px-6 py-4 items-center border-t border-border/30 hover:bg-accent/50 transition-colors cursor-pointer">
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

        {/* RoboRank Leaderboard */}
        {!loading && tab === "roborank" && filteredRoboRank && (
          filteredRoboRank.length === 0 ? (
            <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
              No teams found for {seasonInfo.name}.
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-1">#</div>
                <div className="col-span-3">Team</div>
                <div className="col-span-2 text-center">RoboRank</div>
                <div className="col-span-2 text-center hidden sm:block">Record</div>
                <div className="col-span-2 text-center">Win Rate</div>
                <div className="col-span-2 text-center hidden sm:block">Events</div>
              </div>
              {filteredRoboRank.map((team, i) => (
                <motion.div key={team.number} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.015, 0.5) }}
                  onClick={() => navigate(`/team/${team.number}`)}
                  className="grid grid-cols-12 gap-2 px-6 py-4 items-center border-t border-border/30 hover:bg-accent/50 transition-colors cursor-pointer">
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
                    {team.ties > 0 && <><span className="text-muted-foreground mx-0.5">-</span><span>{team.ties}T</span></>}
                  </div>
                  <div className="col-span-2 text-center stat-number text-sm">{team.winRate}</div>
                  <div className="col-span-2 text-center text-sm text-muted-foreground hidden sm:block">{team.eventsAttended}</div>
                </motion.div>
              ))}
            </div>
          )
        )}
      </div>
    </AppLayout>
  );
}
