import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RoboRankScore } from "@/components/dashboard/RoboRankScore";
import { Search, Loader2, MapPin, Globe, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { fetchRobotEvents, getTeamRankings, getEventSkills, calculateRecordFromRankings, calculateRoboRank, SEASONS, US_STATES, type SeasonKey } from "@/lib/robotevents";
import { useSeason } from "@/contexts/SeasonContext";
import { motion } from "framer-motion";

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

interface SkillsTeam {
  number: string;
  name: string;
  id: number;
  driverScore: number;
  progScore: number;
  combined: number;
}

type Tab = "skills" | "roborank";

export default function Rankings() {
  const navigate = useNavigate();
  const { season } = useSeason();
  const [tab, setTab] = useState<Tab>("skills");
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");

  const seasonInfo = SEASONS[season];

  // Discover events for the season (optionally filtered by state)
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["rankingsEvents", season, stateFilter],
    queryFn: async () => {
      const params: Record<string, string> = {
        "program[]": "1",
        "season[]": SEASONS[season].id,
        per_page: "20",
      };
      if (stateFilter !== "all") params.region = stateFilter;
      const result = await fetchRobotEvents("/events", params);
      return result?.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Skills leaderboard
  const { data: skillsLeaderboard, isLoading: skillsLoading } = useQuery({
    queryKey: ["skillsLeaderboard", season, stateFilter, events?.map((e: any) => e.id)],
    queryFn: async () => {
      if (!events || events.length === 0) return [];
      const teamSkills = new Map<number, { number: string; name: string; id: number; driver: number; prog: number }>();

      const eventsToFetch = events.slice(0, 10);
      await Promise.all(eventsToFetch.map(async (evt: any) => {
        try {
          const skills = await getEventSkills(evt.id);
          skills.forEach((s: any) => {
            const teamId = s.team?.id;
            if (!teamId) return;
            const existing = teamSkills.get(teamId) || {
              number: s.team.name || "",
              name: s.team.team_name || "",
              id: teamId,
              driver: 0,
              prog: 0,
            };
            if (s.type === "driver" && s.score > existing.driver) existing.driver = s.score;
            if (s.type === "programming" && s.score > existing.prog) existing.prog = s.score;
            teamSkills.set(teamId, existing);
          });
        } catch {}
      }));

      const results: SkillsTeam[] = Array.from(teamSkills.values()).map((t) => ({
        ...t,
        driverScore: t.driver,
        progScore: t.prog,
        combined: t.driver + t.prog,
      }));

      return results.sort((a, b) => b.combined - a.combined).slice(0, 100);
    },
    enabled: tab === "skills" && !!events && events.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // RoboRank leaderboard
  const { data: roboRankLeaderboard, isLoading: roboRankLoading } = useQuery({
    queryKey: ["roboRankLeaderboard", season, stateFilter, events?.map((e: any) => e.id)],
    queryFn: async () => {
      if (!events || events.length === 0) return [];

      // Discover teams from events
      const teamMap = new Map<number, any>();
      const eventsToFetch = events.slice(0, 10);
      await Promise.all(eventsToFetch.map(async (evt: any) => {
        try {
          const result = await fetchRobotEvents(`/events/${evt.id}/teams`, { per_page: "250" });
          (result?.data || []).forEach((t: any) => {
            if (!teamMap.has(t.id)) teamMap.set(t.id, t);
          });
        } catch {}
      }));

      // Take up to 80 teams and fetch their rankings
      const teams = Array.from(teamMap.values()).slice(0, 80);
      const results: RankedTeam[] = [];

      await Promise.all(teams.map(async (team: any) => {
        try {
          const rankings = await getTeamRankings(team.id, season);
          const record = calculateRecordFromRankings(rankings);
          const score = calculateRoboRank(rankings);
          // Only include teams with meaningful data
          if (score > 20 && record.total >= 6) {
            results.push({
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
            });
          }
        } catch {}
      }));

      return results.sort((a, b) => b.score - a.score).slice(0, 100);
    },
    enabled: tab === "roborank" && !!events && events.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Search (navigate to team page)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim().toUpperCase();
    if (q) navigate(`/team/${q}`);
  };

  const loading = eventsLoading || (tab === "skills" ? skillsLoading : roboRankLoading);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Rankings</h1>
          <p className="text-muted-foreground mt-1">
            {seasonInfo.name} {seasonInfo.year} · {stateFilter === "all" ? "Global" : stateFilter} Leaderboard
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

        {/* Filters row */}
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-[200px] bg-card">
              <MapPin className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue placeholder="Global" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Global (All States)</SelectItem>
              {US_STATES.map((state) => (
                <SelectItem key={state} value={state}>{state}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Look up team (e.g. 17505B) — press Enter" className="pl-10 bg-card uppercase"
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
          </form>
        </div>

        {loading && (
          <div className="flex flex-col items-center gap-2 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {tab === "skills" ? "Loading skills standings..." : "Calculating RoboRank scores..."}
            </p>
          </div>
        )}

        {/* Skills Leaderboard */}
        {!loading && tab === "skills" && skillsLeaderboard && (
          skillsLeaderboard.length === 0 ? (
            <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
              No skills data found for {seasonInfo.name}{stateFilter !== "all" ? ` in ${stateFilter}` : ""}.
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-1">#</div>
                <div className="col-span-4">Team</div>
                <div className="col-span-2 text-center">Driver</div>
                <div className="col-span-2 text-center">Prog</div>
                <div className="col-span-3 text-center">Combined</div>
              </div>
              {skillsLeaderboard.map((team, i) => (
                <motion.div key={team.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}
                  onClick={() => navigate(`/team/${team.number}`)}
                  className="grid grid-cols-12 gap-2 px-6 py-4 items-center border-t border-border/30 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="col-span-1 stat-number text-muted-foreground">{i + 1}</div>
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
          )
        )}

        {/* RoboRank Leaderboard */}
        {!loading && tab === "roborank" && roboRankLeaderboard && (
          roboRankLeaderboard.length === 0 ? (
            <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
              No teams found for {seasonInfo.name}{stateFilter !== "all" ? ` in ${stateFilter}` : ""}.
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
              {roboRankLeaderboard.map((team, i) => (
                <motion.div key={team.number} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }}
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
