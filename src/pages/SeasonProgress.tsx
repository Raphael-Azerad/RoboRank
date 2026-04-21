import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getTeamByNumber, getTeamRankings, getTeamSkillsScore, getTeamAwards, calculateRoboRank, calculateRecordFromRankings, SEASONS, SEASON_LIST, getWorldSkillsRankings, searchTeamsPartial } from "@/lib/robotevents";

import { RoboRankScore } from "@/components/dashboard/RoboRankScore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area, BarChart, Bar } from "recharts";
import { TrendingUp, Calendar, Trophy, Loader2, Award, Plus, X, Search, Users, Download } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { toPng } from "html-to-image";
import { toast } from "sonner";


const COMPARE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-4))",
  "hsl(var(--destructive))",
];

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

interface CompareTeamData {
  number: string;
  name: string;
  id: number;
  seasons: SeasonSnapshot[];
}

async function fetchTeamSeasons(teamId: number, teamNumber: string, teamName: string): Promise<CompareTeamData> {
  const snapshots: SeasonSnapshot[] = [];
  for (const s of SEASON_LIST) {
    try {
      const [rankings, skills, awards] = await Promise.all([
        getTeamRankings(teamId, s.key),
        getTeamSkillsScore(teamId, s.key),
        getTeamAwards(teamId, s.key),
      ]);
      if (!rankings || rankings.length === 0) continue;
      const record = calculateRecordFromRankings(rankings);
      const rr = calculateRoboRank(rankings, skills);
      let globalSkillsRank: number | null = null;
      try {
        const worldSkills = await getWorldSkillsRankings(s.key);
        if (worldSkills?.data) {
          const entry = worldSkills.data.find((e: any) => e.team?.id === teamId);
          if (entry) globalSkillsRank = entry.rank;
        }
      } catch { /* skip */ }
      snapshots.push({
        season: s.name, year: s.year, roboRank: rr, winRate: record.winRate,
        wins: record.wins, losses: record.losses, eventsAttended: record.eventsAttended,
        skillsCombined: skills, globalSkillsRank, awardsCount: awards?.length || 0,
      });
    } catch { /* skip */ }
  }
  return { number: teamNumber, name: teamName, id: teamId, seasons: snapshots.reverse() };
}

function CompareTeamSearch({ onSelect, index }: { onSelect: (team: any) => void; index: number }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useState(() => { const t = setTimeout(() => setDebouncedQuery(query), 300); return () => clearTimeout(t); });
  const { data: results, isLoading } = useQuery({
    queryKey: ["teamSearch", debouncedQuery],
    queryFn: () => searchTeamsPartial(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input placeholder={`Team ${index + 1}...`} className="pl-8 bg-card uppercase h-9 text-sm" value={query}
        onChange={(e) => { setQuery(e.target.value); setDebouncedQuery(e.target.value); }} />
      {isLoading && <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />}
      {results && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-40 overflow-y-auto">
          {results.map((team: any) => (
            <button key={team.id} type="button" onClick={() => { onSelect(team); setQuery(""); setDebouncedQuery(""); }}
              className="w-full text-left px-3 py-2 hover:bg-accent/50 transition-colors text-sm flex items-center justify-between">
              <span className="font-medium">{team.number}</span>
              <span className="text-xs text-muted-foreground truncate ml-2">{team.team_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SeasonProgress() {
  const [user, setUser] = useState<{ team_number?: string | null }>({});

  const [activeTab, setActiveTab] = useState("my-team");
  const [compareRawTeams, setCompareRawTeams] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);
  const compareExportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser({ team_number: data.user?.user_metadata?.team_number || null });
    });
  }, []);

  const handleExportCompare = async () => {
    if (!compareExportRef.current) return;
    try {
      setExporting(true);
      const dataUrl = await toPng(compareExportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: getComputedStyle(document.body).backgroundColor || "#0F172A",
      });
      const link = document.createElement("a");
      const teamSlug = compareRawTeams.map((t: any) => t.number).join("-vs-");
      link.download = `roborank-compare-${teamSlug || "teams"}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Comparison image downloaded");
    } catch (err: any) {
      toast.error("Couldn't generate image");
    } finally {
      setExporting(false);
    }
  };

  const { data: teamData } = useQuery({
    queryKey: ["teamProfile", user.team_number],
    queryFn: () => getTeamByNumber(user.team_number!),
    enabled: !!user.team_number,
  });

  const { data: seasonData, isLoading } = useQuery({
    queryKey: ["seasonProgress", teamData?.id],
    queryFn: async (): Promise<SeasonSnapshot[]> => {
      if (!teamData?.id) return [];
      const result = await fetchTeamSeasons(teamData.id, teamData.number, teamData.team_name);
      return result.seasons;
    },
    enabled: !!teamData?.id,
  });

  // Compare teams data
  const { data: compareData, isLoading: compareLoading } = useQuery({
    queryKey: ["compareTeams", compareRawTeams.map((t: any) => t.id).join(",")],
    queryFn: async (): Promise<CompareTeamData[]> => {
      return Promise.all(compareRawTeams.map((t: any) => fetchTeamSeasons(t.id, t.number, t.team_name)));
    },
    enabled: compareRawTeams.length > 0,
  });

  const addCompareTeam = (team: any) => {
    if (compareRawTeams.length >= 4) return;
    if (compareRawTeams.some((t: any) => t.id === team.id)) return;
    setCompareRawTeams([...compareRawTeams, team]);
  };

  const removeCompareTeam = (id: number) => {
    setCompareRawTeams(compareRawTeams.filter((t: any) => t.id !== id));
  };

  const latestSeason = seasonData?.[seasonData.length - 1];
  const totalAwards = seasonData?.reduce((s, d) => s + d.awardsCount, 0) || 0;
  const hasPastSeasons = seasonData && seasonData.length > 1;

  // Build merged chart data for compare
  const compareChartData = (() => {
    if (!compareData || compareData.length === 0) return [];
    const allSeasons = new Set<string>();
    compareData.forEach(t => t.seasons.forEach(s => allSeasons.add(s.season)));
    return Array.from(allSeasons).map(seasonName => {
      const point: any = { season: seasonName };
      compareData.forEach(t => {
        const snap = t.seasons.find(s => s.season === seasonName);
        point[`${t.number}_rr`] = snap?.roboRank ?? null;
        point[`${t.number}_wr`] = snap?.winRate ?? null;
        point[`${t.number}_skills`] = snap?.skillsCombined ?? null;
        point[`${t.number}_awards`] = snap?.awardsCount ?? null;
      });
      return point;
    });
  })();

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
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
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="my-team">My Team</TabsTrigger>
              <TabsTrigger value="compare" className="gap-1.5">
                <Users className="h-3.5 w-3.5" /> Compare Teams
              </TabsTrigger>
            </TabsList>

            {/* ==================== MY TEAM TAB ==================== */}
            <TabsContent value="my-team" className="space-y-6 mt-4">
              {isLoading ? (
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
                      <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="rounded-xl border border-border/50 card-gradient p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <card.icon className={`h-4 w-4 ${card.color}`} />
                          <span className="text-xs text-muted-foreground">{card.label}</span>
                        </div>
                        <div className={`text-2xl stat-number ${card.color}`}>{card.value}</div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Current season - free */}
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

                  {/* Past seasons */}
                  {hasPastSeasons && (
                    <div className="relative">
                      <div className="space-y-6">
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
                                    <td className="p-3 text-center stat-number">{s.globalSkillsRank ? `#${s.globalSkillsRank}` : "-"}</td>
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
            </TabsContent>

            {/* ==================== COMPARE TAB ==================== */}
            <TabsContent value="compare" className="space-y-6 mt-4">
              <div className="relative">
                <div className="space-y-6">
                  {/* Team selector */}
                  <div className="rounded-xl border border-border/50 card-gradient p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-semibold">Select Teams to Compare</h3>
                      <span className="text-xs text-muted-foreground">{compareRawTeams.length}/4 teams</span>
                    </div>
                    {/* Selected teams */}
                    <div className="flex flex-wrap gap-2">
                      {compareRawTeams.map((t: any, i: number) => (
                        <div key={t.id} className="flex items-center gap-2 rounded-lg border border-border/50 bg-card px-3 py-1.5">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COMPARE_COLORS[i] }} />
                          <span className="font-display font-bold text-sm">{t.number}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[100px]">{t.team_name}</span>
                          <button onClick={() => removeCompareTeam(t.id)} className="text-muted-foreground hover:text-foreground">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {compareRawTeams.length < 4 && (
                      <CompareTeamSearch onSelect={addCompareTeam} index={compareRawTeams.length} />
                    )}
                  </div>

                  {compareLoading && (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading team data...</span>
                    </div>
                  )}

                  {compareData && compareData.length > 0 && compareChartData.length > 0 && (
                    <>
                      {/* RoboRank comparison */}
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border/50 card-gradient p-6">
                        <h3 className="font-display font-semibold mb-4">RoboRank Comparison</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={compareChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="season" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                            <Legend wrapperStyle={{ fontSize: "11px" }} />
                            {compareData.map((t, i) => (
                              <Line key={t.number} type="monotone" dataKey={`${t.number}_rr`} stroke={COMPARE_COLORS[i]} strokeWidth={2} name={t.number} dot={{ fill: COMPARE_COLORS[i] }} connectNulls />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </motion.div>

                      {/* Win Rate comparison */}
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border/50 card-gradient p-6">
                        <h3 className="font-display font-semibold mb-4">Win Rate Comparison</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={compareChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="season" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                            <Legend wrapperStyle={{ fontSize: "11px" }} />
                            {compareData.map((t, i) => (
                              <Line key={t.number} type="monotone" dataKey={`${t.number}_wr`} stroke={COMPARE_COLORS[i]} strokeWidth={2} name={t.number} dot={{ fill: COMPARE_COLORS[i] }} connectNulls />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </motion.div>

                      {/* Skills comparison */}
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border/50 card-gradient p-6">
                        <h3 className="font-display font-semibold mb-4">Skills Score Comparison</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={compareChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="season" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                            <Legend wrapperStyle={{ fontSize: "11px" }} />
                            {compareData.map((t, i) => (
                              <Line key={t.number} type="monotone" dataKey={`${t.number}_skills`} stroke={COMPARE_COLORS[i]} strokeWidth={2} name={t.number} dot={{ fill: COMPARE_COLORS[i] }} connectNulls />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </motion.div>

                      {/* Awards comparison */}
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-border/50 card-gradient p-6">
                        <h3 className="font-display font-semibold mb-4">Awards Comparison</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={compareChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="season" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                            <Legend wrapperStyle={{ fontSize: "11px" }} />
                            {compareData.map((t, i) => (
                              <Bar key={t.number} dataKey={`${t.number}_awards`} fill={COMPARE_COLORS[i]} name={t.number} radius={[4, 4, 0, 0]} />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </motion.div>
                    </>
                  )}

                  {compareRawTeams.length === 0 && (
                    <div className="rounded-xl border border-border/50 card-gradient p-8 text-center space-y-3">
                      <Users className="h-10 w-10 text-muted-foreground mx-auto" />
                      <p className="text-muted-foreground">Search and add up to 4 teams to compare their progress side by side</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
