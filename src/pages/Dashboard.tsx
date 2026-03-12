import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { RoboRankScore } from "@/components/dashboard/RoboRankScore";
import { Calendar, Trophy, Target, TrendingUp, ArrowRight, Loader2, Award, Medal, Swords, Zap, Flag, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getTeamByNumber, getTeamRankings, getTeamAwards, getTeamMatches, getTeamEvents, getTeamSkills, calculateRecordFromRankings, calculateRecordFromMatches, calculateRoboRank, getTeamSkillsScore, SEASONS } from "@/lib/robotevents";
import { useSeason } from "@/contexts/SeasonContext";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { MatchesPlayedModal, WinsModal, groupMatchesByEvent, filterWonMatches } from "@/components/matches/MatchModals";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";

// Season goals stored in localStorage
function loadGoals(): { label: string; done: boolean }[] {
  try {
    const stored = localStorage.getItem("roborank-season-goals-v2");
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}
function saveGoals(goals: { label: string; done: boolean }[]) {
  localStorage.setItem("roborank-season-goals-v2", JSON.stringify(goals));
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { season } = useSeason();
  const [teamNumber, setTeamNumber] = useState<string>("");
  const [matchesModalOpen, setMatchesModalOpen] = useState(false);
  const [winsModalOpen, setWinsModalOpen] = useState(false);
  const [goals, setGoals] = useState(loadGoals);
  const [addingGoal, setAddingGoal] = useState(false);
  const [goalLabel, setGoalLabel] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const seasonInfo = SEASONS[season];

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setTeamNumber(data.user?.user_metadata?.team_number || "");
    });
  }, []);

  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ["team", teamNumber],
    queryFn: () => getTeamByNumber(teamNumber),
    enabled: !!teamNumber,
  });

  const teamId = teamData?.id || null;

  const { data: rankings, isLoading: rankingsLoading } = useQuery({
    queryKey: ["teamRankings", teamId, season],
    queryFn: () => getTeamRankings(teamId!, season),
    enabled: !!teamId,
  });

  const { data: awards } = useQuery({
    queryKey: ["teamAwards", teamId, season],
    queryFn: () => getTeamAwards(teamId!, season),
    enabled: !!teamId,
  });

  const { data: skillsScore } = useQuery({
    queryKey: ["teamSkillsScore", teamId, season],
    queryFn: () => getTeamSkillsScore(teamId!, season),
    enabled: !!teamId,
  });

  const { data: matches } = useQuery({
    queryKey: ["teamMatches", teamId, season],
    queryFn: () => getTeamMatches(teamId!, season),
    enabled: !!teamId,
  });

  const { data: skillsData } = useQuery({
    queryKey: ["teamSkillsRaw", teamId, season],
    queryFn: () => getTeamSkills(teamId!, season),
    enabled: !!teamId,
  });

  const { data: upcomingEvents } = useQuery({
    queryKey: ["teamEvents", teamId, season],
    queryFn: () => getTeamEvents(teamId!, season),
    enabled: !!teamId,
  });

  const qualRecord = rankings ? calculateRecordFromRankings(rankings) : null;
  const matchRecord = useMemo(() => {
    if (!matches || !teamNumber) return null;
    return calculateRecordFromMatches(matches, teamNumber);
  }, [matches, teamNumber]);

  const roboRank = rankings ? calculateRoboRank(rankings, skillsScore ?? 0) : null;
  const loading = teamLoading || rankingsLoading;

  const matchesByEvent = useMemo(() => matches ? groupMatchesByEvent(matches) : [], [matches]);
  const totalMatchCount = matches?.length || 0;
  const wonMatches = useMemo(() => {
    if (!matches || !teamNumber) return [];
    return filterWonMatches(matches, teamNumber);
  }, [matches, teamNumber]);

  // Skills breakdown
  const driverSkills = useMemo(() => {
    if (!skillsData) return 0;
    return Math.max(0, ...skillsData.filter((s: any) => s.type === "driver").map((s: any) => s.score));
  }, [skillsData]);
  const progSkills = useMemo(() => {
    if (!skillsData) return 0;
    return Math.max(0, ...skillsData.filter((s: any) => s.type === "programming").map((s: any) => s.score));
  }, [skillsData]);
  const totalSkills = driverSkills + progSkills;

  // Upcoming events (future only)
  const futureEvents = useMemo(() => {
    if (!upcomingEvents) return [];
    const now = new Date();
    return upcomingEvents
      .filter((e: any) => new Date(e.start) > now)
      .sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 3);
  }, [upcomingEvents]);

  // Auto-update goals with live data
  useEffect(() => {
    if (!matchRecord) return;
    const updated = goals.map(g => {
      const lower = g.label.toLowerCase();
      if (lower.includes("win rate") || lower.includes("win %")) return { ...g, current: matchRecord.winRate };
      if (lower.includes("wins")) return { ...g, current: matchRecord.wins };
      if (lower.includes("match")) return { ...g, current: totalMatchCount };
      if (lower.includes("award")) return { ...g, current: awards?.length || 0 };
      if (lower.includes("skills") || lower.includes("skill")) return { ...g, current: totalSkills };
      return g;
    });
    setGoals(updated);
    saveGoals(updated);
  }, [matchRecord, totalMatchCount, awards, totalSkills]);

  const handleAddGoal = () => {
    if (!goalLabel.trim() || !goalTarget.trim()) return;
    const newGoals = [...goals, { label: goalLabel.trim(), target: parseInt(goalTarget) || 0, current: 0 }];
    setGoals(newGoals);
    saveGoals(newGoals);
    setGoalLabel("");
    setGoalTarget("");
    setAddingGoal(false);
  };

  const handleRemoveGoal = (i: number) => {
    const newGoals = goals.filter((_, idx) => idx !== i);
    setGoals(newGoals);
    saveGoals(newGoals);
  };

  const seasonLabel = `${seasonInfo.name} ${seasonInfo.year}`;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* ============ HERO SECTION ============ */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-primary/20 p-6 md:p-8"
          style={{ background: "linear-gradient(135deg, hsl(0 85% 50% / 0.12), hsl(220 20% 7%), hsl(200 70% 50% / 0.08))" }}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="relative flex flex-col md:flex-row items-center gap-6">
            <div className="shrink-0">
              {loading ? (
                <div className="h-28 w-28 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <RoboRankScore score={roboRank ?? 0} size="lg" />
              )}
            </div>
            <div className="flex-1 text-center md:text-left space-y-2">
              <h1 className="text-3xl md:text-4xl font-display font-bold">
                Team <span className="text-gradient">{teamNumber || "—"}</span>
              </h1>
              <p className="text-muted-foreground">
                {teamData?.team_name || "Your competition command center"}
                <span className="mx-2 text-border">·</span>
                <span className="text-primary text-sm font-medium">{seasonLabel}</span>
              </p>
              {matchRecord && (
                <div className="flex items-center gap-4 justify-center md:justify-start text-sm">
                  <span className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
                    <span className="font-display font-bold text-[hsl(var(--success))]">{matchRecord.wins}W</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-destructive" />
                    <span className="font-display font-bold text-destructive">{matchRecord.losses}L</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                    <span className="font-display font-bold text-muted-foreground">{matchRecord.ties}T</span>
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-display font-bold">{matchRecord.winRate}% WR</span>
                </div>
              )}
            </div>
            <div className="shrink-0">
              <Link to="/scouting">
                <Button variant="hero" className="gap-1.5">
                  Scout Report <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* ============ STAT CARDS ============ */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Win Rate", value: matchRecord ? `${matchRecord.winRate}%` : "—", icon: Trophy, sub: matchRecord ? `${matchRecord.wins}W-${matchRecord.losses}L-${matchRecord.ties}T` : "", color: "text-[hsl(var(--success))]", onClick: () => setWinsModalOpen(true) },
            { title: "Matches", value: totalMatchCount ? String(totalMatchCount) : "—", icon: Swords, sub: qualRecord ? `${qualRecord.eventsAttended} events` : "", color: "text-[hsl(var(--chart-2))]", onClick: () => setMatchesModalOpen(true) },
            { title: "High Score", value: matchRecord ? String(matchRecord.highScore) : "—", icon: Zap, sub: matchRecord ? `Avg ${matchRecord.avgPoints} pts` : "", color: "text-[hsl(var(--chart-4))]" },
            { title: "Awards", value: awards ? String(awards.length) : "—", icon: Medal, sub: awards?.length ? "Tap to view" : "", color: "text-primary", onClick: () => navigate("/awards") },
          ].map((stat, i) => (
            <motion.button
              key={stat.title}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={stat.onClick}
              className={cn(
                "text-left rounded-xl border border-border/50 card-gradient p-4 transition-all hover:border-primary/30 hover:scale-[1.02]",
                stat.onClick && "cursor-pointer"
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">{stat.title}</span>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
              <div className={cn("text-2xl font-display font-bold", stat.color)}>{stat.value}</div>
              {stat.sub && <p className="text-[11px] text-muted-foreground mt-1">{stat.sub}</p>}
            </motion.button>
          ))}
        </div>

        {/* ============ MAIN GRID ============ */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Left col: Skills + Goals */}
          <div className="space-y-4">
            {/* Skills Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl border border-border/50 card-gradient p-5"
            >
              <h3 className="font-display font-semibold text-sm mb-4 flex items-center gap-2">
                <Target className="h-4 w-4 text-[hsl(var(--chart-4))]" /> Skills Breakdown
              </h3>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-display font-bold text-[hsl(var(--chart-4))]">{totalSkills}</div>
                  <div className="text-xs text-muted-foreground">Combined Score</div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Driver</span>
                      <span className="font-medium">{driverSkills}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${totalSkills > 0 ? (driverSkills / totalSkills) * 100 : 50}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Programming</span>
                      <span className="font-medium">{progSkills}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${totalSkills > 0 ? (progSkills / totalSkills) * 100 : 50}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                        className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--chart-2))] to-[hsl(var(--chart-2))]/70"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Season Goals */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-xl border border-border/50 card-gradient p-5"
            >
              <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
                <Flag className="h-4 w-4 text-primary" /> Season Goals
              </h3>
              <div className="space-y-3">
                {goals.map((g, i) => {
                  const pct = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
                  const done = pct >= 100;
                  return (
                    <div key={i} className="group">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={cn("font-medium", done && "text-[hsl(var(--success))]")}>{g.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{g.current}/{g.target}</span>
                          <button onClick={() => handleRemoveGoal(i)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">✕</button>
                        </div>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  );
                })}
                {goals.length === 0 && !addingGoal && (
                  <p className="text-xs text-muted-foreground text-center py-2">Set goals like "Win 70% of matches"</p>
                )}
                {addingGoal ? (
                  <div className="space-y-2 pt-1">
                    <Input placeholder='Goal name (e.g. "Win Rate")' value={goalLabel} onChange={(e) => setGoalLabel(e.target.value)} className="h-8 text-xs bg-card" />
                    <Input placeholder="Target number" type="number" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} className="h-8 text-xs bg-card" />
                    <div className="flex gap-1.5">
                      <Button size="sm" className="h-7 text-xs flex-1" onClick={handleAddGoal}>Add</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingGoal(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => setAddingGoal(true)}>+ Add Goal</Button>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right col: Upcoming Events + Leaderboard */}
          <div className="lg:col-span-2 space-y-4">
            {/* Upcoming Events */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl border border-border/50 card-gradient p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[hsl(var(--chart-2))]" /> Upcoming Events
                </h3>
                <Link to="/events" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  All events <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              {futureEvents.length > 0 ? (
                <div className="space-y-2.5">
                  {futureEvents.map((event: any, i: number) => {
                    const eventDate = new Date(event.start);
                    const daysUntil = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <Link key={event.id} to={`/events/${event.id}`}>
                        <div className="flex items-center gap-3 rounded-lg border border-border/30 p-3 hover:border-primary/30 transition-all group">
                          <div className="shrink-0 rounded-lg bg-[hsl(var(--chart-2))]/10 px-3 py-2 text-center">
                            <div className="text-lg font-display font-bold text-[hsl(var(--chart-2))]">{eventDate.getDate()}</div>
                            <div className="text-[10px] text-muted-foreground uppercase">{eventDate.toLocaleString("default", { month: "short" })}</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{event.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{event.location?.city}, {event.location?.region}</p>
                          </div>
                          <div className="shrink-0">
                            <span className={cn(
                              "text-xs font-medium px-2 py-0.5 rounded-full",
                              daysUntil <= 7 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                            )}>
                              {daysUntil <= 0 ? "Today" : `${daysUntil}d`}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  No upcoming events registered
                </div>
              )}
            </motion.div>

            {/* Quick Actions as compact grid */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="grid gap-2.5 grid-cols-2"
            >
              {[
                { to: "/predictor", icon: Swords, label: "Match Predictor", desc: "Simulate 2v2 matches", color: "text-primary" },
                { to: "/rankings", icon: Trophy, label: "Rankings", desc: "Look up any team", color: "text-[hsl(var(--chart-4))]" },
                { to: "/notes", icon: Flag, label: "Team Notes", desc: "Strategy & observations", color: "text-[hsl(var(--chart-2))]" },
                { to: `/team/${teamNumber}`, icon: TrendingUp, label: "Full Stats", desc: "Detailed team profile", color: "text-[hsl(var(--success))]" },
              ].map((action) => (
                <Link key={action.to} to={action.to}>
                  <div className="rounded-xl border border-border/50 card-gradient p-4 hover:border-primary/30 hover:scale-[1.02] transition-all">
                    <action.icon className={cn("h-5 w-5 mb-2", action.color)} />
                    <h4 className="font-display font-semibold text-sm">{action.label}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{action.desc}</p>
                  </div>
                </Link>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Modals */}
        {teamNumber && (
          <>
            <MatchesPlayedModal open={matchesModalOpen} onOpenChange={setMatchesModalOpen} teamNumber={teamNumber} seasonLabel={seasonLabel} matchesByEvent={matchesByEvent} totalMatchCount={totalMatchCount} />
            <WinsModal open={winsModalOpen} onOpenChange={setWinsModalOpen} teamNumber={teamNumber} seasonLabel={seasonLabel} wonMatches={wonMatches} totalMatchCount={totalMatchCount} winRate={matchRecord?.winRate ?? 0} />
          </>
        )}
      </div>
    </AppLayout>
  );
}
