import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { RoboRankScore } from "@/components/dashboard/RoboRankScore";
import { Calendar, Trophy, Target, TrendingUp, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getTeamByNumber, getTeamMatches, getTeamRankings } from "@/lib/robotevents";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const [teamNumber, setTeamNumber] = useState<string>("");
  const [teamId, setTeamId] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const tn = data.user?.user_metadata?.team_number || "—";
      setTeamNumber(tn);
    });
  }, []);

  // Look up team on RobotEvents
  const { data: teamData } = useQuery({
    queryKey: ["team", teamNumber],
    queryFn: () => getTeamByNumber(teamNumber),
    enabled: !!teamNumber && teamNumber !== "—",
  });

  useEffect(() => {
    if (teamData?.id) setTeamId(teamData.id);
  }, [teamData]);

  // Fetch match history
  const { data: matches, isLoading: matchesLoading } = useQuery({
    queryKey: ["teamMatches", teamId],
    queryFn: () => getTeamMatches(teamId!),
    enabled: !!teamId,
  });

  // Calculate stats
  const stats = (() => {
    if (!matches || matches.length === 0) return null;
    let wins = 0, losses = 0, ties = 0;
    matches.forEach((m: any) => {
      m.alliances?.forEach((a: any) => {
        const hasTeam = a.teams?.some((t: any) => t.team?.name === teamNumber);
        if (!hasTeam) return;
        if (a.color === "red") {
          const red = m.alliances.find((x: any) => x.color === "red")?.score || 0;
          const blue = m.alliances.find((x: any) => x.color === "blue")?.score || 0;
          if (red > blue) wins++; else if (blue > red) losses++; else ties++;
        } else {
          const red = m.alliances.find((x: any) => x.color === "red")?.score || 0;
          const blue = m.alliances.find((x: any) => x.color === "blue")?.score || 0;
          if (blue > red) wins++; else if (red > blue) losses++; else ties++;
        }
      });
    });
    const total = wins + losses + ties;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    return { wins, losses, ties, total, winRate };
  })();

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-display font-bold">
              Team <span className="text-gradient">{teamNumber}</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              {teamData?.team_name ? teamData.team_name : "Welcome to your competition command center"}
            </p>
          </div>
          <Link to="/scouting">
            <Button variant="hero">
              New Scouting Report <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Win Rate"
            value={stats ? `${stats.winRate}%` : "—"}
            icon={Trophy}
            subtitle={stats ? `${stats.wins}W-${stats.losses}L-${stats.ties}T` : "Loading..."}
          />
          <StatCard
            title="Matches"
            value={stats ? String(stats.total) : "—"}
            icon={Target}
            subtitle="Total matches played"
          />
          <StatCard
            title="Location"
            value={teamData?.location?.region || "—"}
            icon={Calendar}
            subtitle={teamData?.location?.country || ""}
          />
          <StatCard
            title="Organization"
            value={teamData?.organization ? "✓" : "—"}
            icon={TrendingUp}
            subtitle={teamData?.organization?.slice(0, 30) || ""}
          />
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Score Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-border/50 card-gradient p-8 flex flex-col items-center justify-center gap-4"
          >
            <h2 className="text-lg font-display font-semibold text-muted-foreground">Your RoboRank</h2>
            <RoboRankScore score={stats?.winRate || 0} size="lg" />
            <p className="text-sm text-muted-foreground text-center">
              {stats ? `Based on ${stats.total} matches` : "Loading match data..."}
            </p>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 rounded-xl border border-border/50 card-gradient p-8"
          >
            <h2 className="text-lg font-display font-semibold mb-4">Quick Actions</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link to="/events">
                <div className="rounded-lg border border-border/50 p-4 hover:border-primary/30 transition-all cursor-pointer">
                  <Calendar className="h-5 w-5 text-primary mb-2" />
                  <h3 className="font-medium text-sm">Browse Events</h3>
                  <p className="text-xs text-muted-foreground mt-1">Find upcoming competitions</p>
                </div>
              </Link>
              <Link to="/rankings">
                <div className="rounded-lg border border-border/50 p-4 hover:border-primary/30 transition-all cursor-pointer">
                  <Trophy className="h-5 w-5 text-primary mb-2" />
                  <h3 className="font-medium text-sm">View Rankings</h3>
                  <p className="text-xs text-muted-foreground mt-1">See top-rated teams</p>
                </div>
              </Link>
              <Link to="/scouting">
                <div className="rounded-lg border border-border/50 p-4 hover:border-primary/30 transition-all cursor-pointer">
                  <Target className="h-5 w-5 text-primary mb-2" />
                  <h3 className="font-medium text-sm">Generate Report</h3>
                  <p className="text-xs text-muted-foreground mt-1">Scout an upcoming event</p>
                </div>
              </Link>
              <div className="rounded-lg border border-border/50 p-4 opacity-60">
                <TrendingUp className="h-5 w-5 text-muted-foreground mb-2" />
                <h3 className="font-medium text-sm">Match Predictions</h3>
                <p className="text-xs text-muted-foreground mt-1">Coming soon</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
