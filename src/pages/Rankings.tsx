import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RoboRankScore } from "@/components/dashboard/RoboRankScore";
import { Search, Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { fetchRobotEvents, getTeamByNumber, getTeamRankings, calculateRecordFromRankings, calculateRoboRank, SEASONS } from "@/lib/robotevents";
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

type Tab = "search" | "region";

export default function Rankings() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [search, setSearch] = useState("17505");
  const [teamNumber, setTeamNumber] = useState("");
  const [region, setRegion] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setTeamNumber(data.user?.user_metadata?.team_number || "");
    });
  }, []);

  const { data: userTeam } = useQuery({
    queryKey: ["team", teamNumber],
    queryFn: () => getTeamByNumber(teamNumber),
    enabled: !!teamNumber,
  });

  useEffect(() => {
    if (userTeam?.location?.region) setRegion(userTeam.location.region);
  }, [userTeam]);

  // Search teams
  const { data: searchTeams, isLoading: searchLoading } = useQuery({
    queryKey: ["searchTeams", search],
    queryFn: async () => {
      const result = await fetchRobotEvents("/teams", { "number[]": search, "program[]": "1" });
      return result?.data || [];
    },
    enabled: tab === "search" && !!search,
  });

  // Regional teams - get from regional events' rankings
  const { data: regionTeams, isLoading: regionTeamsLoading } = useQuery({
    queryKey: ["regionTeams", region],
    queryFn: async () => {
      // Get recent events from the region
      const eventsResult = await fetchRobotEvents("/events", {
        "program[]": "1",
        "season[]": SEASONS.current.id,
        region,
        per_page: "10",
      });
      const events = eventsResult?.data || [];
      if (events.length === 0) return [];

      // Collect unique team IDs from these events' teams
      const teamMap = new Map<number, any>();
      // Get teams from up to 3 recent events
      for (const evt of events.slice(0, 3)) {
        try {
          const teamsResult = await fetchRobotEvents(`/events/${evt.id}/teams`, { per_page: "250" });
          (teamsResult?.data || []).forEach((t: any) => {
            if (!teamMap.has(t.id)) teamMap.set(t.id, t);
          });
        } catch {}
      }

      return Array.from(teamMap.values()).slice(0, 20);
    },
    enabled: tab === "region" && !!region,
  });

  const teamsToRank = tab === "search" ? searchTeams : regionTeams;
  const teamsLoading = tab === "search" ? searchLoading : regionTeamsLoading;

  // Fetch rankings for teams
  const { data: rankedTeams, isLoading: statsLoading } = useQuery({
    queryKey: ["rankedTeams", tab, teamsToRank?.map((t: any) => t.id)],
    queryFn: async () => {
      if (!teamsToRank || teamsToRank.length === 0) return [];
      const results: RankedTeam[] = [];
      const teams = teamsToRank.slice(0, 20);

      await Promise.all(teams.map(async (team: any) => {
        try {
          const rankings = await getTeamRankings(team.id);
          const record = calculateRecordFromRankings(rankings);
          const score = calculateRoboRank(rankings);
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
        } catch {}
      }));

      return results.sort((a, b) => b.score - a.score);
    },
    enabled: !!teamsToRank && teamsToRank.length > 0,
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
            {SEASONS.current.name} {SEASONS.current.year} · Search teams or view top regional teams
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          <Button variant={tab === "search" ? "default" : "outline"} size="sm" onClick={() => setTab("search")}>
            <Search className="h-3.5 w-3.5 mr-1.5" /> Search Teams
          </Button>
          {region && (
            <Button variant={tab === "region" ? "default" : "outline"} size="sm" onClick={() => setTab("region")}>
              <MapPin className="h-3.5 w-3.5 mr-1.5" /> Top in {region}
            </Button>
          )}
        </div>

        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by team number (e.g. 17505B, 1234, 99999)..." className="pl-10 bg-card uppercase"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Button type="submit" variant="hero">Search</Button>
        </form>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && rankedTeams && rankedTeams.length === 0 && (
          <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
            {tab === "region" ? `No teams found in ${region} this season.` : `No teams found for "${search}".`}
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
              <motion.div key={team.number} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
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
