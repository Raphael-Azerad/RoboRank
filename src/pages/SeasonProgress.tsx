import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTeamByNumber, getTeamRankings, getTeamSkillsScore, getTeamAwards, calculateRoboRank, calculateRecordFromRankings, SEASONS, SEASON_LIST, getWorldSkillsRankings } from "@/lib/robotevents";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { RoboRankScore } from "@/components/dashboard/RoboRankScore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, BarChart, Bar } from "recharts";
import { TrendingUp, Calendar, Trophy, Target, Loader2, Lock, Crown, Award } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SeasonSnapshot {
  season: string;
  year: string;
  roboRank: number;
  winRate: number;
  wins: number;
  losses: number;
  eventsAttended: number;
  skillsCombined: number;
  globalSkillsRank: number | null;
  awardsCount: number;
}

export default function SeasonProgress() {
  const [user, setUser] = useState<{ team_number?: string | null }>({});
  const { subscribed, startCheckout } = useSubscription();

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
          const [rankings, skills, awards] = await Promise.all([
            getTeamRankings(teamData.id, s.key),
            getTeamSkillsScore(teamData.id, s.key),
            getTeamAwards(teamData.id, s.key),
          ]);
          if (!rankings || rankings.length === 0) continue;
          const record = calculateRecordFromRankings(rankings);
          const rr = calculateRoboRank(rankings, skills);

          // Try to get global skills rank
          let globalSkillsRank: number | null = null;
          try {
            const worldSkills = await getWorldSkillsRankings(s.key);
            if (worldSkills?.data) {
              const entry = worldSkills.data.find((e: any) => e.team?.id === teamData.id);
              if (entry) globalSkillsRank = entry.rank;
            }
          } catch { /* skip */ }

          snapshots.push({
            season: s.name,
            year: s.year,
            roboRank: rr,
            winRate: record.winRate,
            wins: record.wins,
            losses: record.losses,
            eventsAttended: record.eventsAttended,
            skillsCombined: skills,
            globalSkillsRank,
            awardsCount: awards?.length || 0,
          });
        } catch { /* skip */ }
      }
      return snapshots.reverse();
    },
    enabled: !!teamData?.id,
  });

  const latestSeason = seasonData?.[seasonData.length - 1];
  const totalAwards = seasonData?.reduce((s, d) => s + d.awardsCount, 0) || 0;

  // Current season is free; past seasons are premium
  const currentSeasonData = seasonData?.slice(-1) || [];
  const pastSeasonData = seasonData?.slice(0, -1) || [];
  const hasPastSeasons = pastSeasonData.length > 0;

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
                { icon: Award, label: "Total Awards", value: totalAwards, color: "text-[hsl(var(--chart-4))]" },
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

            {/* Current season chart - always free */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border/50 card-gradient p-6">
              <h3 className="font-display font-semibold mb-4">Current Season</h3>
              {latestSeason && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-xs text-muted-foreground block">Record</span><span className="font-medium">{latestSeason.wins}W-{latestSeason.losses}L</span></div>
                  <div><span className="text-xs text-muted-foreground block">Win Rate</span><span className="font-medium">{latestSeason.winRate}%</span></div>
                  <div><span className="text-xs text-muted-foreground block">Skills</span><span className="font-medium">{latestSeason.skillsCombined}</span></div>
                  <div><span className="text-xs text-muted-foreground block">Awards</span><span className="font-medium">{latestSeason.awardsCount}</span></div>
                </div>
              )}
            </motion.div>

            {/* Past seasons - premium gate */}
            {hasPastSeasons && (
              <div className="relative">
                {!subscribed && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl">
                    <Lock className="h-8 w-8 text-primary mb-3" />
                    <p className="text-sm font-medium mb-2">Past Season History</p>
                    <p className="text-xs text-muted-foreground mb-4 text-center max-w-xs">Upgrade to Premium to view historical season data, skills rankings, and awards across all past seasons</p>
                    <Button onClick={startCheckout} className="gap-1.5">
                      <Crown className="h-3.5 w-3.5" /> Upgrade to Premium
                    </Button>
                  </div>
                )}
                <div className={cn(!subscribed && "blur-sm pointer-events-none select-none", "space-y-6")}>
                  {/* RoboRank Over Time */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-border/50 card-gradient p-6">
                    <h3 className="font-display font-semibold mb-4">RoboRank Over Time</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={seasonData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="season" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                        <Area type="monotone" dataKey="roboRank" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} name="RoboRank" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </motion.div>

                  {/* Awards per Season */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="rounded-xl border border-border/50 card-gradient p-6">
                    <h3 className="font-display font-semibold mb-4">Awards Won per Season</h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={seasonData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="season" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                        <Bar dataKey="awardsCount" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="Awards" />
                      </BarChart>
                    </ResponsiveContainer>
                  </motion.div>

                  {/* Win Rate + Skills */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-xl border border-border/50 card-gradient p-6">
                    <h3 className="font-display font-semibold mb-4">Performance Metrics</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={seasonData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="season" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Line type="monotone" dataKey="winRate" stroke="hsl(var(--success))" strokeWidth={2} name="Win Rate %" dot={{ fill: "hsl(var(--success))" }} />
                        <Line type="monotone" dataKey="eventsAttended" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Events" dot={{ fill: "hsl(var(--chart-2))" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>

                  {/* Season Table */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="rounded-xl border border-border/50 card-gradient overflow-hidden">
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
                            <th className="text-center p-3">Skills</th>
                            <th className="text-center p-3">Global Rank</th>
                            <th className="text-center p-3">Awards</th>
                            <th className="text-center p-3">Events</th>
                          </tr>
                        </thead>
                        <tbody>
                          {seasonData.map((s) => (
                            <tr key={s.season} className="border-b border-border/10 hover:bg-muted/20 transition-colors">
                              <td className="p-3 font-medium">{s.season} <span className="text-xs text-muted-foreground">{s.year}</span></td>
                              <td className="p-3 text-center"><RoboRankScore score={s.roboRank} size="sm" /></td>
                              <td className="p-3 text-center stat-number">{s.wins}W-{s.losses}L</td>
                              <td className="p-3 text-center stat-number">{s.winRate}%</td>
                              <td className="p-3 text-center stat-number">{s.skillsCombined}</td>
                              <td className="p-3 text-center stat-number">{s.globalSkillsRank ? `#${s.globalSkillsRank}` : "—"}</td>
                              <td className="p-3 text-center stat-number">{s.awardsCount}</td>
                              <td className="p-3 text-center stat-number">{s.eventsAttended}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
