import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RoboRankScore } from "@/components/dashboard/RoboRankScore";
import { Search, Loader2, MapPin, Globe, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { fetchRobotEvents, getTeamByNumber, getTeamRankings, calculateRecordFromRankings, calculateRoboRank, SEASONS, SEASON_LIST, US_STATES, type SeasonKey } from "@/lib/robotevents";
import { supabase } from "@/integrations/supabase/client";
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
  location?: string;
}

type Tab = "global" | "state" | "search";

export default function Rankings() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("global");
  const [searchQuery, setSearchQuery] = useState("");
  const [search, setSearch] = useState("");
  const [selectedState, setSelectedState] = useState("Texas");
  const [season, setSeason] = useState<SeasonKey>("current");

  const seasonInfo = SEASONS[season];

  // Global top teams — fetch from large recent events
  const { data: globalTeams, isLoading: globalTeamsLoading } = useQuery({
    queryKey: ["globalTopTeams", season],
    queryFn: async () => {
      // Get recent large events to find top teams
      const eventsResult = await fetchRobotEvents("/events", {
        "program[]": "1",
        "season[]": SEASONS[season].id,
        per_page: "20",
      });
      const events = eventsResult?.data || [];
      if (events.length === 0) return [];

      const teamMap = new Map<number, any>();
      // Sample teams from up to 8 events spread across regions
      for (const evt of events.slice(0, 8)) {
        try {
          const teamsResult = await fetchRobotEvents(`/events/${evt.id}/teams`, { per_page: "250" });
          (teamsResult?.data || []).forEach((t: any) => {
            if (!teamMap.has(t.id)) teamMap.set(t.id, t);
          });
        } catch {}
      }

      // Take a sample to rank (limit API calls)
      return Array.from(teamMap.values()).slice(0, 100);
    },
    enabled: tab === "global",
    staleTime: 5 * 60 * 1000,
  });

  // State teams
  const { data: stateTeams, isLoading: stateTeamsLoading } = useQuery({
    queryKey: ["stateTeams", selectedState, season],
    queryFn: async () => {
      const eventsResult = await fetchRobotEvents("/events", {
        "program[]": "1",
        "season[]": SEASONS[season].id,
        region: selectedState,
        per_page: "10",
      });
      const events = eventsResult?.data || [];
      if (events.length === 0) return [];

      const teamMap = new Map<number, any>();
      for (const evt of events.slice(0, 5)) {
        try {
          const teamsResult = await fetchRobotEvents(`/events/${evt.id}/teams`, { per_page: "250" });
          (teamsResult?.data || []).forEach((t: any) => {
            if (!teamMap.has(t.id)) teamMap.set(t.id, t);
          });
        } catch {}
      }
      return Array.from(teamMap.values()).slice(0, 100);
    },
    enabled: tab === "state" && !!selectedState,
    staleTime: 5 * 60 * 1000,
  });

  // Search teams
  const { data: searchTeams, isLoading: searchLoading } = useQuery({
    queryKey: ["searchTeams", search, season],
    queryFn: async () => {
      const result = await fetchRobotEvents("/teams", { "number[]": search, "program[]": "1" });
      return result?.data || [];
    },
    enabled: tab === "search" && !!search,
  });

  const teamsToRank = tab === "global" ? globalTeams : tab === "state" ? stateTeams : searchTeams;
  const teamsLoading = tab === "global" ? globalTeamsLoading : tab === "state" ? stateTeamsLoading : searchLoading;

  // Fetch rankings for teams
  const { data: rankedTeams, isLoading: statsLoading } = useQuery({
    queryKey: ["rankedTeams", tab, season, teamsToRank?.map((t: any) => t.id)],
    queryFn: async () => {
      if (!teamsToRank || teamsToRank.length === 0) return [];
      const results: RankedTeam[] = [];
      const teams = teamsToRank.slice(0, 100);

      await Promise.all(teams.map(async (team: any) => {
        try {
          const rankings = await getTeamRankings(team.id, season);
          const record = calculateRecordFromRankings(rankings);
          const score = calculateRoboRank(rankings);
          if (score > 0) {
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
              location: team.location ? `${team.location.city}, ${team.location.region}` : undefined,
            });
          }
        } catch {}
      }));

      return results.sort((a, b) => b.score - a.score);
    },
    enabled: !!teamsToRank && teamsToRank.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearch(searchQuery.trim().toUpperCase());
      setTab("search");
    }
  };

  const loading = teamsLoading || statsLoading;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Rankings</h1>
          <p className="text-muted-foreground mt-1">
            {seasonInfo.name} {seasonInfo.year} · Top teams ranked by RoboRank
          </p>
        </div>

        {/* Season Selector */}
        <div className="flex flex-wrap gap-2">
          {SEASON_LIST.map((s) => (
            <Button key={s.key} variant={season === s.key ? "default" : "outline"} size="sm"
              onClick={() => setSeason(s.key)} className="text-xs">
              {s.name}
            </Button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          <Button variant={tab === "global" ? "default" : "outline"} size="sm" onClick={() => setTab("global")}>
            <Globe className="h-3.5 w-3.5 mr-1.5" /> Top Teams
          </Button>
          <Button variant={tab === "state" ? "default" : "outline"} size="sm" onClick={() => setTab("state")}>
            <MapPin className="h-3.5 w-3.5 mr-1.5" /> By State
          </Button>
          <Button variant={tab === "search" ? "default" : "outline"} size="sm" onClick={() => setTab("search")}>
            <Search className="h-3.5 w-3.5 mr-1.5" /> Search
          </Button>
        </div>

        {/* State selector */}
        {tab === "state" && (
          <Select value={selectedState} onValueChange={setSelectedState}>
            <SelectTrigger className="w-[220px] bg-card">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((state) => (
                <SelectItem key={state} value={state}>{state}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by team number (e.g. 17505B)..." className="pl-10 bg-card uppercase"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Button type="submit" variant="hero">Search</Button>
        </form>

        {loading && (
          <div className="flex flex-col items-center gap-2 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Calculating RoboRank scores...</p>
          </div>
        )}

        {!loading && rankedTeams && rankedTeams.length === 0 && (
          <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
            {tab === "state" ? `No teams found in ${selectedState} for ${seasonInfo.name}.` :
             tab === "search" ? `No teams found for "${search}".` :
             `No teams found for ${seasonInfo.name}.`}
          </div>
        )}

        {!loading && rankedTeams && rankedTeams.length > 0 && (
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="col-span-1">#</div>
              <div className="col-span-3">Team</div>
              <div className="col-span-2 text-center">RoboRank</div>
              <div className="col-span-2 text-center hidden sm:block">Record</div>
              <div className="col-span-2 text-center">Win Rate</div>
              <div className="col-span-2 text-center hidden sm:block">Events</div>
            </div>
            {rankedTeams.map((team, i) => (
              <motion.div key={team.number} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
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
        )}
      </div>
    </AppLayout>
  );
}
