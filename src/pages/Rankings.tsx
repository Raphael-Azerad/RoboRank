import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { RoboRankScore } from "@/components/dashboard/RoboRankScore";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { fetchRobotEvents, getTeamMatches, getTeamRankings, calculateRecord, calculateRoboRank } from "@/lib/robotevents";
import { motion } from "framer-motion";

interface RankedTeam {
  number: string;
  name: string;
  id: number;
  score: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: string;
}

export default function Rankings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [search, setSearch] = useState("17505");

  // Search teams
  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ["searchTeams", search],
    queryFn: async () => {
      const result = await fetchRobotEvents("/teams", {
        "number[]": search,
        "program[]": "1",
      });
      return result?.data || [];
    },
    enabled: !!search,
  });

  // For each team found, get their stats
  const { data: rankedTeams, isLoading: statsLoading } = useQuery({
    queryKey: ["rankedTeams", teamsData?.map((t: any) => t.id)],
    queryFn: async () => {
      if (!teamsData || teamsData.length === 0) return [];

      const results: RankedTeam[] = [];
      // Process up to 10 teams to avoid too many API calls
      const teams = teamsData.slice(0, 10);

      for (const team of teams) {
        try {
          const [matches, rankings] = await Promise.all([
            getTeamMatches(team.id),
            getTeamRankings(team.id),
          ]);
          const record = calculateRecord(matches, team.number);
          const score = calculateRoboRank(record, rankings);
          results.push({
            number: team.number,
            name: team.team_name || "",
            id: team.id,
            score,
            wins: record.wins,
            losses: record.losses,
            ties: record.ties,
            winRate: `${record.winRate}%`,
          });
        } catch {
          // Skip teams that fail to load
        }
      }

      return results.sort((a, b) => b.score - a.score);
    },
    enabled: !!teamsData && teamsData.length > 0,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchQuery.trim().toUpperCase());
  };

  const loading = teamsLoading || statsLoading;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Rankings</h1>
          <p className="text-muted-foreground mt-1">Search teams and compare RoboRank scores</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by team number (e.g. 17505B)..."
              className="pl-10 bg-card uppercase"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
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
            No teams found. Try a different search term.
          </div>
        )}

        {!loading && rankedTeams && rankedTeams.length > 0 && (
          <div className="rounded-xl border border-border/50 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <div className="col-span-1">#</div>
              <div className="col-span-3">Team</div>
              <div className="col-span-2 text-center">Score</div>
              <div className="col-span-3 text-center hidden sm:block">Record</div>
              <div className="col-span-2 text-center">Win Rate</div>
            </div>
            {/* Rows */}
            {rankedTeams.map((team, i) => (
              <motion.div
                key={team.number}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="grid grid-cols-12 gap-2 px-6 py-4 items-center border-t border-border/30 hover:bg-accent/50 transition-colors"
              >
                <div className="col-span-1 stat-number text-muted-foreground">{i + 1}</div>
                <div className="col-span-3">
                  <div className="font-display font-semibold">{team.number}</div>
                  <div className="text-xs text-muted-foreground truncate">{team.name}</div>
                </div>
                <div className="col-span-2 flex justify-center">
                  <RoboRankScore score={team.score} size="sm" />
                </div>
                <div className="col-span-3 text-center text-sm hidden sm:block">
                  <span className="text-success">{team.wins}W</span>
                  <span className="text-muted-foreground mx-1">-</span>
                  <span className="text-destructive">{team.losses}L</span>
                  {team.ties > 0 && (
                    <>
                      <span className="text-muted-foreground mx-1">-</span>
                      <span className="text-muted-foreground">{team.ties}T</span>
                    </>
                  )}
                </div>
                <div className="col-span-2 text-center stat-number text-sm">{team.winRate}</div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
