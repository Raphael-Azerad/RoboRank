import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTeamByNumber, getTeamEvents, getTeamRankings, getTeamSkillsScore, calculateRoboRank, calculateRecordFromRankings, SEASONS, SEASON_LIST } from "@/lib/robotevents";
import { useSeason } from "@/contexts/SeasonContext";
import { RoboRankScore } from "@/components/dashboard/RoboRankScore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from "recharts";
import { TrendingUp, Calendar, Trophy, Target, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface SeasonSnapshot {
  season: string;
  year: string;
  roboRank: number;
  winRate: number;
  wins: number;
  losses: number;
  eventsAttended: number;
  highScore: number;
  skillsCombined: number;
}

export default function SeasonProgress() {
  const [user, setUser] = useState<{ team_number?: string | null }>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser({ team_number: data.user?.user_metadata?.team_number || null });
    });
  }, []);

  const { data: teamData } = useQuery({
    queryKey: ["teamProfile", user.team_number],
    queryFn: () => getTeamByNumber(user.team_number!),
    enabled: !!user.team_number,
  });

  const { data: seasonData, isLoading } = useQuery({
    queryKey: ["seasonProgress", teamData?.id],
    queryFn: async (): Promise<SeasonSnapshot[]> => {
      if (!teamData?.id) return [];
      const snapshots: SeasonSnapshot[] = [];

      for (const s of SEASON_LIST) {
        try {
          const [rankings, skills] = await Promise.all([
            getTeamRankings(teamData.id, s.key),
            getTeamSkillsScore(teamData.id, s.key),
          ]);
          if (!rankings || rankings.length === 0) continue;
          const record = calculateRecordFromRankings(rankings);
          const rr = calculateRoboRank(rankings, skills);
          snapshots.push({
            season: s.name,
            year: s.year,
            roboRank: rr,
            winRate: record.winRate,
            wins: record.wins,
            losses: record.losses,
            eventsAttended: record.eventsAttended,
            highScore: record.highScore,
            skillsCombined: skills,
          });
        } catch {
          // Skip seasons with no data
        }
      }
      return snapshots.reverse(); // Oldest first
    },
    enabled: !!teamData?.id,
  });

  const latestSeason = seasonData?.[seasonData.length - 1];

  return (
    <AppLayout>
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Season Progress</h1>
          <p className="text-muted-foreground mt-1">
            Track {user.team_number || "your team"}'s improvement across seasons
          </p>
        </div>

        {!user.team_number ? (
          <div className="rounded-xl border border-border/50 card-gradient p-8 text-center space-y-3">
            <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Join a team to see season progress</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading season history...</span>
          </div>
        ) : !seasonData || seasonData.length === 0 ? (
          <div className="rounded-xl border border-border/50 card-gradient p-8 text-center space-y-3">
            <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No season data found for {user.team_number}</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { icon: TrendingUp, label: "Current RR", value: latestSeason?.roboRank || 0, color: "text-primary" },
                { icon: Trophy, label: "Win Rate", value: `${latestSeason?.winRate || 0}%`, color: "text-[hsl(var(--success))]" },
                { icon: Calendar, label: "Seasons", value: seasonData.length, color: "text-[hsl(var(--chart-2))]" },
                { icon: Target, label: "High Score", value: latestSeason?.highScore || 0, color: "text-[hsl(var(--chart-4))]" },
              ].map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border/50 card-gradient p-4"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <card.icon className={`h-4 w-4 ${card.color}`} />
                    <span className="text-xs text-muted-foreground">{card.label}</span>
                  </div>
                  <div className={`text-2xl stat-number ${card.color}`}>{card.value}</div>
                </motion.div>
              ))}
            </div>

            {/* RoboRank Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl border border-border/50 card-gradient p-6"
            >
              <h3 className="font-display font-semibold mb-4">RoboRank Over Time</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={seasonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="season" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Area type="monotone" dataKey="roboRank" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} name="RoboRank" />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Win Rate + Skills Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl border border-border/50 card-gradient p-6"
            >
              <h3 className="font-display font-semibold mb-4">Performance Metrics</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={seasonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="season" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Line type="monotone" dataKey="winRate" stroke="hsl(var(--success))" strokeWidth={2} name="Win Rate %" dot={{ fill: "hsl(var(--success))" }} />
                  <Line type="monotone" dataKey="highScore" stroke="hsl(var(--chart-4))" strokeWidth={2} name="High Score" dot={{ fill: "hsl(var(--chart-4))" }} />
                  <Line type="monotone" dataKey="eventsAttended" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Events" dot={{ fill: "hsl(var(--chart-2))" }} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Season Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-xl border border-border/50 card-gradient overflow-hidden"
            >
              <div className="p-4 border-b border-border/30">
                <h3 className="font-display font-semibold">Season Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 text-xs text-muted-foreground">
                      <th className="text-left p-3">Season</th>
                      <th className="text-center p-3">RoboRank</th>
                      <th className="text-center p-3">Record</th>
                      <th className="text-center p-3">Win %</th>
                      <th className="text-center p-3">High Score</th>
                      <th className="text-center p-3">Skills</th>
                      <th className="text-center p-3">Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasonData.map((s, i) => (
                      <tr key={s.season} className="border-b border-border/10 hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-medium">{s.season} <span className="text-xs text-muted-foreground">{s.year}</span></td>
                        <td className="p-3 text-center">
                          <RoboRankScore score={s.roboRank} size="sm" />
                        </td>
                        <td className="p-3 text-center stat-number">{s.wins}W-{s.losses}L</td>
                        <td className="p-3 text-center stat-number">{s.winRate}%</td>
                        <td className="p-3 text-center stat-number">{s.highScore}</td>
                        <td className="p-3 text-center stat-number">{s.skillsCombined}</td>
                        <td className="p-3 text-center stat-number">{s.eventsAttended}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
