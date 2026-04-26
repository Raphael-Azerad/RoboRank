import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { RoboRankScore } from "@/components/dashboard/RoboRankScore";
import { EmptyState } from "@/components/ui/empty-state";
import { Calendar, Trophy, Target, TrendingUp, ArrowRight, Loader2, Award, Medal, Swords, Zap, Flag, ChevronRight, Check, Clock, Users, Eye, UserPlus, AlertTriangle, RefreshCw } from "lucide-react";

import { LiveEventCard } from "@/components/dashboard/LiveEventCard";
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
import { useTeamStatus } from "@/hooks/useTeamStatus";
import { toast } from "sonner";
import { PullToRefresh } from "@/components/PullToRefresh";
import { PinnedSection } from "@/components/dashboard/PinnedSection";
import { DashboardModeToggle } from "@/components/dashboard/DashboardModeToggle";
import { useDashboardMode } from "@/hooks/useDashboardMode";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";

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
  const queryClient = useQueryClient();
  const { season } = useSeason();
  const [teamNumber, setTeamNumber] = useState<string>("");
  const [matchesModalOpen, setMatchesModalOpen] = useState(false);
  const [winsModalOpen, setWinsModalOpen] = useState(false);
  const [goals, setGoals] = useState(loadGoals);
  const [addingGoal, setAddingGoal] = useState(false);
  const [goalLabel, setGoalLabel] = useState("");
  const seasonInfo = SEASONS[season];
  const {
    status: teamStatus,
    teamNumber: memberTeamNumber,
    followedTeam,
    userId: memberUserId,
    role: memberRole,
  } = useTeamStatus();

  const isFollower = teamStatus === "follower";

  // Don't auto-redirect to join-team - let users use dashboard even without a team
  // They can join a team from the Profile > Team tab

  useEffect(() => {
    // Use team_members as source of truth, fall back to user_metadata
    if (memberTeamNumber) {
      setTeamNumber(memberTeamNumber);
    } else {
      supabase.auth.getUser().then(({ data }) => {
        setTeamNumber(data.user?.user_metadata?.team_number || "");
      });
    }
  }, [memberTeamNumber]);

  useEffect(() => {
    if (teamStatus !== "approved" || memberRole !== "owner" || !memberTeamNumber || !memberUserId) return;
    const captainToastKey = `captain-toast:${memberUserId}:${memberTeamNumber}`;
    if (sessionStorage.getItem(captainToastKey)) return;

    toast.success(`You're the team captain for ${memberTeamNumber}.`, { duration: 6000 });
    sessionStorage.setItem(captainToastKey, "1");
  }, [teamStatus, memberRole, memberTeamNumber, memberUserId]);

  const { data: teamData, isLoading: teamLoading, error: teamError, refetch: refetchTeam } = useQuery({
    queryKey: ["team", teamNumber],
    queryFn: () => getTeamByNumber(teamNumber),
    enabled: !!teamNumber,
    retry: 1,
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

  // Current win/loss streak from most recent matches (chronological from latest)
  const currentStreak = useMemo(() => {
    if (!matches || !teamNumber || matches.length === 0) return null;
    // Sort by start desc; matches array shape: { started, scored, alliances: [{color, score, teams:[{team:{name}}]}] }
    const sorted = [...matches]
      .filter((m: any) => m.scored)
      .sort((a: any, b: any) => new Date(b.started || 0).getTime() - new Date(a.started || 0).getTime());
    let kind: "W" | "L" | "T" | null = null;
    let count = 0;
    for (const m of sorted) {
      const myAlliance = m.alliances?.find((al: any) =>
        al.teams?.some((t: any) => (t.team?.name || "") === teamNumber),
      );
      const oppAlliance = m.alliances?.find((al: any) => al !== myAlliance);
      if (!myAlliance || !oppAlliance) continue;
      let res: "W" | "L" | "T";
      if (myAlliance.score > oppAlliance.score) res = "W";
      else if (myAlliance.score < oppAlliance.score) res = "L";
      else res = "T";
      if (kind === null) { kind = res; count = 1; }
      else if (kind === res) count++;
      else break;
    }
    return kind && count > 0 ? { kind, count } : null;
  }, [matches, teamNumber]);

  // Time-of-day greeting
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return "Up late";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 21) return "Good evening";
    return "Good night";
  }, []);

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

  const handleAddGoal = () => {
    if (!goalLabel.trim()) return;
    const newGoals = [...goals, { label: goalLabel.trim(), done: false }];
    setGoals(newGoals);
    saveGoals(newGoals);
    setGoalLabel("");
    setAddingGoal(false);
  };

  const handleToggleGoal = (i: number) => {
    const newGoals = goals.map((g, idx) => idx === i ? { ...g, done: !g.done } : g);
    setGoals(newGoals);
    saveGoals(newGoals);
  };

  const handleRemoveGoal = (i: number) => {
    const newGoals = goals.filter((_, idx) => idx !== i);
    setGoals(newGoals);
    saveGoals(newGoals);
  };

  const seasonLabel = `${seasonInfo.name} ${seasonInfo.year}`;

  const handleRefresh = async () => {
    await queryClient.invalidateQueries();
  };

  return (
    <AppLayout>
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6">
        {/* No-team empty state — supersedes the dashboard until a team is set */}
        {teamStatus === "no-team" && !teamNumber && (
          <EmptyState
            icon={UserPlus}
            size="lg"
            title="Welcome to RoboRank"
            description="Join your competition team to unlock your dashboard, scouting reports, and live match analytics — or follow a team as a parent or coach."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link to="/join-team">
                  <Button variant="hero" className="gap-1.5">
                    <Users className="h-4 w-4" /> Join or follow a team
                  </Button>
                </Link>
                <Link to="/rankings">
                  <Button variant="outline" className="gap-1.5">
                    Browse rankings <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            }
          />
        )}

        {/* RobotEvents API failure — team configured but data couldn't load */}
        {teamStatus !== "no-team" && teamNumber && teamError && !teamData && (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't reach the RobotEvents API"
            description="We had trouble loading data for your team. This is usually temporary — please check your connection and try again."
            action={
              <Button onClick={() => refetchTeam()} variant="outline" className="gap-1.5">
                <RefreshCw className="h-4 w-4" /> Retry
              </Button>
            }
          />
        )}

        {/* Hide the rest of the dashboard until we have a team to show */}
        {teamStatus !== "no-team" && (<>


        {teamStatus === "pending" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-[hsl(var(--chart-4))]/30 bg-[hsl(var(--chart-4))]/5 p-4 flex items-center gap-3"
          >
            <Clock className="h-5 w-5 text-[hsl(var(--chart-4))] shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Awaiting team approval</p>
              <p className="text-xs text-muted-foreground">Your team admin needs to approve your membership. You can browse stats in the meantime, but can't create scouting reports or notes.</p>
            </div>
          </motion.div>
        )}
        {/* Follower banner */}
        {isFollower && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-[hsl(var(--chart-2))]/30 bg-[hsl(var(--chart-2))]/5 p-4 flex items-center gap-3"
          >
            <Eye className="h-5 w-5 text-[hsl(var(--chart-2))] shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Following {followedTeam}</p>
              <p className="text-xs text-muted-foreground">You're viewing stats as a parent/coach. Scouting reports and team notes are for team members only.</p>
            </div>
          </motion.div>
        )}
        {/* Live event auto-suggest (24h before -> 24h after) */}
        {teamNumber && <LiveEventCard teamNumber={teamNumber} />}

        {/* Personal pins — fast access to starred events/teams/views */}
        <PinnedSection />

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-2xl border border-border/60 card-elevated p-6 md:p-8"
        >
          {/* Ambient drifting glows for cinematic feel */}
          <div className="pointer-events-none absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-primary/15 blur-3xl animate-ambient-drift" />
          <div className="pointer-events-none absolute -bottom-32 -left-24 w-[24rem] h-[24rem] rounded-full bg-[hsl(var(--chart-2))]/10 blur-3xl animate-ambient-drift" style={{ animationDelay: "-7s" }} />
          {/* Decorative grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
              maskImage: "radial-gradient(ellipse at top right, black 30%, transparent 75%)",
            }}
          />

          <div className="relative flex flex-col md:flex-row items-center gap-6">
            <motion.div
              className="shrink-0 relative"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Soft halo behind RoboRank score */}
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl scale-110 animate-pulse-glow" />
              {loading ? (
                <div className="h-28 w-28 flex items-center justify-center relative">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="relative">
                  <RoboRankScore score={roboRank ?? 0} size="lg" />
                </div>
              )}
            </motion.div>

            <div className="flex-1 text-center md:text-left space-y-2.5 min-w-0">
              <div className="flex items-center gap-2 justify-center md:justify-start flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  {seasonLabel}
                </span>
                {currentStreak && currentStreak.count >= 2 && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border",
                      currentStreak.kind === "W" && "border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
                      currentStreak.kind === "L" && "border-destructive/40 bg-destructive/10 text-destructive",
                      currentStreak.kind === "T" && "border-border bg-muted/40 text-muted-foreground",
                    )}
                  >
                    {currentStreak.kind === "W" && <Zap className="h-2.5 w-2.5" />}
                    {currentStreak.count}-{currentStreak.kind} streak
                  </motion.span>
                )}
              </div>
              <p className="text-xs md:text-sm text-muted-foreground font-medium">
                {greeting}{teamData?.team_name ? `, ${teamData.team_name}` : ""}.
              </p>
              <h1 className="text-3xl md:text-5xl font-display font-bold tracking-tight leading-[1.05]">
                Team <span className="text-gradient">{teamNumber || "-"}</span>
              </h1>
              {matchRecord && (
                <div className="flex items-center gap-3 justify-center md:justify-start text-sm pt-1">
                  <span className="flex items-center gap-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--success))]" />
                    <span className="font-display font-bold text-[hsl(var(--success))] tabular-nums">{matchRecord.wins}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">W</span>
                  </span>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1.5">
                    <span className="font-display font-bold text-destructive tabular-nums">{matchRecord.losses}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">L</span>
                  </span>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1.5">
                    <span className="font-display font-bold text-muted-foreground tabular-nums">{matchRecord.ties}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">T</span>
                  </span>
                  <span className="text-border">·</span>
                  <span className="font-display font-bold tabular-nums">{matchRecord.winRate}%</span>
                </div>
              )}
            </div>
            <div className="shrink-0">
              {!isFollower && (
                <Link to="/scouting">
                  <Button variant="hero" className="gap-1.5">
                    Scout Report <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </motion.div>

        {/* ============ STAT CARDS ============
            Mobile: show 2 primary cards (Win Rate + Matches) above the fold,
            tuck the rest into a "More stats" disclosure to reduce density.
            Desktop: show all 4 in a row. */}
        {(() => {
          const allStats = [
            { title: "Win Rate", value: matchRecord ? `${matchRecord.winRate}%` : "-", icon: Trophy, sub: matchRecord ? `${matchRecord.wins}W-${matchRecord.losses}L-${matchRecord.ties}T` : "", color: "text-[hsl(var(--success))]", onClick: () => setWinsModalOpen(true) },
            { title: "Matches", value: totalMatchCount ? String(totalMatchCount) : "-", icon: Swords, sub: qualRecord ? `${qualRecord.eventsAttended} events` : "", color: "text-[hsl(var(--chart-2))]", onClick: () => setMatchesModalOpen(true) },
            { title: "High Score", value: matchRecord ? String(matchRecord.highScore) : "-", icon: Zap, sub: matchRecord ? `Avg ${matchRecord.avgPoints} pts` : "", color: "text-[hsl(var(--chart-4))]", onClick: undefined as undefined | (() => void) },
            { title: "Awards", value: awards ? String(awards.length) : "-", icon: Medal, sub: awards?.length ? "Tap to view" : "", color: "text-primary", onClick: () => navigate("/awards") },
          ];
          const renderStat = (stat: typeof allStats[number], i: number) => (
            <motion.button
              key={stat.title}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={stat.onClick}
              className={cn(
                "group relative text-left rounded-xl border border-border/60 card-gradient p-4 transition-all duration-200 hover:border-primary/40 hover:-translate-y-0.5",
                stat.onClick && "cursor-pointer"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{stat.title}</span>
                <div className="rounded-md bg-background/60 p-1.5 ring-1 ring-border/60 transition-colors group-hover:ring-primary/30">
                  <stat.icon className={cn("h-3.5 w-3.5", stat.color)} />
                </div>
              </div>
              <div className={cn("text-3xl font-display font-bold tabular-nums leading-none", stat.color)}>{stat.value}</div>
              {stat.sub && <p className="text-[11px] text-muted-foreground mt-2 tabular-nums">{stat.sub}</p>}
            </motion.button>
          );
          return (
            <>
              {/* Mobile: 2 primary cards */}
              <div className="grid gap-3 grid-cols-2 md:hidden">
                {allStats.slice(0, 2).map(renderStat)}
              </div>
              {/* Mobile: rest tucked into disclosure */}
              <details className="md:hidden group rounded-xl border border-border/50 card-gradient overflow-hidden">
                <summary className="list-none flex items-center justify-between px-4 py-3 cursor-pointer min-h-[48px] active:bg-muted/40 transition-colors">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
                    More stats
                  </span>
                  <span className="text-xs text-muted-foreground">High score · Awards</span>
                </summary>
                <div className="grid gap-3 grid-cols-2 px-3 pb-3 pt-1">
                  {allStats.slice(2).map(renderStat)}
                </div>
              </details>
              {/* Desktop: full row */}
              <div className="hidden md:grid gap-3 grid-cols-2 lg:grid-cols-4">
                {allStats.map(renderStat)}
              </div>
            </>
          );
        })()}

        {/* ============ MAIN GRID ============ */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Left col: Skills + Goals — collapsed on mobile, always visible on desktop */}
          <div className="space-y-4 hidden lg:block">
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
              <div className="space-y-2">
                {goals.map((g, i) => (
                  <div key={i} className="group flex items-center gap-2.5 py-1">
                    <button
                      onClick={() => handleToggleGoal(i)}
                      className={cn(
                        "shrink-0 h-4 w-4 rounded border transition-all flex items-center justify-center",
                        g.done ? "bg-[hsl(var(--success))] border-[hsl(var(--success))]" : "border-muted-foreground/40 hover:border-primary"
                      )}
                    >
                      {g.done && <Check className="h-3 w-3 text-background" />}
                    </button>
                    <span className={cn("text-xs font-medium flex-1", g.done && "line-through text-muted-foreground")}>{g.label}</span>
                    <button onClick={() => handleRemoveGoal(i)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">✕</button>
                  </div>
                ))}
                {goals.length === 0 && !addingGoal && (
                  <p className="text-xs text-muted-foreground text-center py-2">Add goals like "Win a tournament" or "Hit 200 skills"</p>
                )}
                {addingGoal ? (
                  <div className="space-y-2 pt-1">
                    <Input placeholder='e.g. "Win a tournament"' value={goalLabel} onChange={(e) => setGoalLabel(e.target.value)} className="h-8 text-xs bg-card" onKeyDown={(e) => e.key === "Enter" && handleAddGoal()} />
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
                { to: "/predictor", icon: Swords, label: "Match Predictor", desc: "Simulate 2v2 matches", color: "text-primary", showForFollower: true },
                { to: "/rankings", icon: Trophy, label: "Rankings", desc: "Look up any team", color: "text-[hsl(var(--chart-4))]", showForFollower: true },
                { to: "/notes", icon: Flag, label: "Team Notes", desc: "Strategy & observations", color: "text-[hsl(var(--chart-2))]", showForFollower: false },
                { to: `/team/${teamNumber}`, icon: TrendingUp, label: "Full Stats", desc: "Detailed team profile", color: "text-[hsl(var(--success))]", showForFollower: true },
              ].filter(action => !isFollower || action.showForFollower).map((action) => (
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

        <details className="md:hidden group rounded-xl border border-border/50 card-gradient overflow-hidden">
          <summary className="list-none flex items-center justify-between px-4 py-3.5 cursor-pointer min-h-[52px] active:bg-muted/40 transition-colors">
            <span className="font-display font-semibold text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              More insights
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-4 pb-4 space-y-4 border-t border-border/40 pt-4">
            {/* Skills Breakdown — mobile clone */}
            <div className="rounded-xl border border-border/40 bg-background/40 p-4">
              <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-[hsl(var(--chart-4))]" /> Skills Breakdown
              </h3>
              <div className="text-center mb-3">
                <div className="text-3xl font-display font-bold text-[hsl(var(--chart-4))]">{totalSkills}</div>
                <div className="text-xs text-muted-foreground">Combined Score</div>
              </div>
              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Driver</span>
                    <span className="font-medium tabular-nums">{driverSkills}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70" style={{ width: `${totalSkills > 0 ? (driverSkills / totalSkills) * 100 : 50}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Programming</span>
                    <span className="font-medium tabular-nums">{progSkills}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--chart-2))] to-[hsl(var(--chart-2))]/70" style={{ width: `${totalSkills > 0 ? (progSkills / totalSkills) * 100 : 50}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </details>

        {/* Modals */}
        {teamNumber && (
          <>
            <MatchesPlayedModal open={matchesModalOpen} onOpenChange={setMatchesModalOpen} teamNumber={teamNumber} seasonLabel={seasonLabel} matchesByEvent={matchesByEvent} totalMatchCount={totalMatchCount} />
            <WinsModal open={winsModalOpen} onOpenChange={setWinsModalOpen} teamNumber={teamNumber} seasonLabel={seasonLabel} wonMatches={wonMatches} totalMatchCount={totalMatchCount} winRate={matchRecord?.winRate ?? 0} />
          </>
        )}
        </>)}
      </div>
      </PullToRefresh>
    </AppLayout>
  );
}
