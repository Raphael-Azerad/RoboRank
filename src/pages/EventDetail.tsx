import { useState, useMemo, useRef, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RoboRankScore } from "@/components/dashboard/RoboRankScore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchRobotEvents, getEventTeams, getEventRankings, getEventMatches,
  getEventSkills, getTeamRankings, calculateRecordFromRankings,
  calculateRoboRank, getTeamSkillsScore, fetchAllPages, getTeamMatches,
  calculateEventScheduleDifficulty,
} from "@/lib/robotevents";
import { useSeason } from "@/contexts/SeasonContext";

import { ArrowLeft, MapPin, Calendar, Users, Loader2, Trophy, Zap, Swords, Medal, Target, ExternalLink, TrendingUp, GitCompare, BarChart3, AlertTriangle, FileText, Download } from "lucide-react";
import { ShareButton } from "@/components/ShareButton";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EliminationBracket } from "@/components/events/EliminationBracket";
import { supabase } from "@/integrations/supabase/client";
import { generateScoutingReport, downloadCSV, downloadExcel } from "@/lib/scoutingReport";
import { toast } from "sonner";

type DetailTab = "teams" | "quals" | "elims" | "skills" | "awards" | "predictions" | "schedule";

// Match round types: 1=Practice, 2=Qualification, 3=R128..6=Finals
function roundLabel(round: number): string {
  switch (round) {
    case 1: return "Practice";
    case 2: return "Qual";
    case 3: return "R16";
    case 4: return "QF";
    case 5: return "SF";
    case 6: return "Final";
    default: return `R${round}`;
  }
}

function isElimRound(round: number): boolean {
  return round >= 3 && round <= 6;
}

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { season } = useSeason();
  
  const [tab, setTab] = useState<DetailTab>("teams");
  const [h2hTeams, setH2hTeams] = useState<[string, string] | null>(null);
  const [h2hOpen, setH2hOpen] = useState(false);
  const [selectedDivisionIdx, setSelectedDivisionIdx] = useState<number>(0);
  const [allDivisionsView, setAllDivisionsView] = useState(false);
  const [teamSearch, setTeamSearch] = useState("");
  const [expandedScheduleTeam, setExpandedScheduleTeam] = useState<string | null>(null);

  // Reset division when navigating to a new event
  const prevEventId = useRef(eventId);
  useEffect(() => {
    if (eventId !== prevEventId.current) {
      setSelectedDivisionIdx(0);
      setAllDivisionsView(false);
      setTeamSearch("");
      prevEventId.current = eventId;
    }
  }, [eventId]);

  const { data: eventData, isLoading: eventLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => fetchRobotEvents(`/events/${eventId}`),
    enabled: !!eventId,
  });

  const event = eventData;
  const divisions = event?.divisions || [];
  const hasDivisions = divisions.length > 1;
  const divisionId = divisions[selectedDivisionIdx]?.id || divisions[0]?.id || 1;

  useDocumentMeta({
    title: event?.name ? `${event.name} | RoboRank` : "Event | RoboRank",
    description: event ? `Rankings, matches, skills and predictions for ${event.name}${event.location?.city ? " in " + event.location.city : ""}.` : undefined,
  });

  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ["eventTeams", eventId],
    queryFn: () => getEventTeams(Number(eventId)),
    enabled: !!eventId,
  });

  const { data: eventRankings, isLoading: rankingsLoading } = useQuery({
    queryKey: ["eventRankings", eventId, divisionId],
    queryFn: async () => {
      const result: any = await getEventRankings(Number(eventId), divisionId);
      if (Array.isArray(result)) return result;
      return result?.data || [];
    },
    enabled: !!eventId && (tab === "teams" || tab === "quals"),
  });

  // All-divisions rankings: merge rankings from every division
  const { data: allDivisionsRankings, isLoading: allDivRankingsLoading } = useQuery({
    queryKey: ["eventRankingsAll", eventId, divisions.map((d: any) => d.id).join(",")],
    queryFn: async () => {
      if (!divisions.length) return [];
      const all = await Promise.all(
        divisions.map(async (div: any) => {
          try {
            const result: any = await getEventRankings(Number(eventId), div.id);
            const arr: any[] = Array.isArray(result) ? result : (result?.data || []);
            return arr.map((r) => ({ ...r, _divisionName: div.name || `Division ${div.id}` }));
          } catch {
            return [];
          }
        })
      );
      return all.flat();
    },
    enabled: !!eventId && hasDivisions && allDivisionsView && tab === "teams",
  });

  const { data: allMatches, isLoading: matchesLoading } = useQuery({
    queryKey: ["eventMatches", eventId, divisionId],
    queryFn: () => getEventMatches(Number(eventId), divisionId),
    enabled: !!eventId && (tab === "quals" || tab === "elims"),
  });

  const { data: eventSkills, isLoading: skillsLoading } = useQuery({
    queryKey: ["eventSkills", eventId],
    queryFn: () => getEventSkills(Number(eventId)),
    enabled: !!eventId && tab === "skills",
  });

  // Awards: try division-level first, fall back to event-level for single-division events
  const { data: eventAwards, isLoading: awardsLoading } = useQuery({
    queryKey: ["eventAwards", eventId, divisionId, hasDivisions],
    queryFn: async () => {
      if (hasDivisions) {
        // Multi-division: fetch division-specific awards
        const divAwards = await fetchAllPages(`/events/${eventId}/divisions/${divisionId}/awards`);
        if (divAwards && divAwards.length > 0) return divAwards;
        // Fallback to event-level awards
        return fetchAllPages(`/events/${eventId}/awards`);
      }
      // Single division: use event-level awards
      const eventAwards = await fetchAllPages(`/events/${eventId}/awards`);
      if (eventAwards && eventAwards.length > 0) return eventAwards;
      // Fallback to division-level
      return fetchAllPages(`/events/${eventId}/divisions/${divisionId}/awards`);
    },
    enabled: !!eventId && tab === "awards",
  });

  // RoboRank for teams (batched concurrency, all teams)
  const { data: teamStats, isLoading: statsLoading } = useQuery({
    queryKey: ["eventTeamStats", teams?.map((t: any) => t.id)],
    queryFn: async () => {
      if (!teams) return [];
      const results: any[] = [];
      for (let i = 0; i < teams.length; i += 15) {
        const batch = teams.slice(i, i + 15);
        await Promise.all(batch.map(async (team: any) => {
          try {
            const [rankings, skillsScore] = await Promise.all([
              getTeamRankings(team.id),
              getTeamSkillsScore(team.id),
            ]);
            const record = calculateRecordFromRankings(rankings);
            const score = calculateRoboRank(rankings, skillsScore);
            results.push({ ...team, record, roboRank: score });
          } catch {
            results.push({ ...team, record: null, roboRank: 0 });
          }
        }));
      }
      return results.sort((a, b) => b.roboRank - a.roboRank);
    },
    enabled: !!teams && teams.length > 0 && (tab === "teams" || tab === "predictions"),
  });

  // Schedule Difficulty
  const { data: scheduleDifficulty, isLoading: scheduleLoading } = useQuery({
    queryKey: ["eventScheduleDifficulty", eventId, divisionId, season],
    queryFn: () => calculateEventScheduleDifficulty(Number(eventId), divisionId, season),
    enabled: !!eventId && tab === "schedule",
    staleTime: 10 * 60 * 1000,
  });

  // Split matches
  const qualMatches = useMemo(() => {
    if (!allMatches) return [];
    return allMatches.filter((m: any) => m.round === 2).sort((a: any, b: any) => a.matchnum - b.matchnum);
  }, [allMatches]);

  const elimMatches = useMemo(() => {
    if (!allMatches) return [];
    return allMatches.filter((m: any) => isElimRound(m.round)).sort((a: any, b: any) => {
      if (a.round !== b.round) return a.round - b.round;
      return a.instance - b.instance || a.matchnum - b.matchnum;
    });
  }, [allMatches]);

  // Skills leaderboard grouped by team
  const skillsLeaderboard = useMemo(() => {
    if (!eventSkills) return [];
    const teamMap = new Map<number, { team: any; driver: number; programming: number; combined: number }>();
    eventSkills.forEach((s: any) => {
      const tid = s.team?.id;
      if (!tid) return;
      if (!teamMap.has(tid)) {
        teamMap.set(tid, { team: s.team, driver: 0, programming: 0, combined: 0 });
      }
      const entry = teamMap.get(tid)!;
      if (s.type === "driver" && s.score > entry.driver) entry.driver = s.score;
      if (s.type === "programming" && s.score > entry.programming) entry.programming = s.score;
    });
    teamMap.forEach((v) => { v.combined = v.driver + v.programming; });
    return Array.from(teamMap.values()).sort((a, b) => b.combined - a.combined);
  }, [eventSkills]);

  // Bracket data for elims
  const bracketRounds = useMemo(() => {
    if (!elimMatches || elimMatches.length === 0) return [];
    const rounds = new Map<number, any[]>();
    elimMatches.forEach((m: any) => {
      if (!rounds.has(m.round)) rounds.set(m.round, []);
      rounds.get(m.round)!.push(m);
    });
    return Array.from(rounds.entries())
      .sort(([a], [b]) => a - b)
      .map(([round, matches]) => ({ round, label: roundLabel(round), matches }));
  }, [elimMatches]);

  const loading = eventLoading || teamsLoading;
  const eventIsCompleted = !!event && !event.ongoing && new Date(event.end || event.start).getTime() < Date.now();

  const renderMatchRow = (match: any, i: number) => {
    const red = match.alliances?.find((a: any) => a.color === "red");
    const blue = match.alliances?.find((a: any) => a.color === "blue");
    const redScore = red?.score ?? 0;
    const blueScore = blue?.score ?? 0;
    const redWon = redScore > blueScore;
    const blueWon = blueScore > redScore;
    const redTeams = red?.teams?.map((t: any) => t.team?.name).filter(Boolean).join(" & ") || "-";
    const blueTeams = blue?.teams?.map((t: any) => t.team?.name).filter(Boolean).join(" & ") || "-";

    return (
      <div key={match.id} className="grid grid-cols-12 gap-1 px-4 py-2.5 items-center border-t border-border/20 text-sm hover:bg-accent/30 transition-colors">
        <div className="col-span-2 text-xs text-muted-foreground">
          {match.name || `${roundLabel(match.round)} ${match.matchnum}`}
        </div>
        <div className={cn("col-span-4 truncate", redWon ? "font-semibold" : "text-muted-foreground")}>
          <span className="inline-block w-2 h-2 rounded-full bg-destructive mr-1.5" />
          {redTeams}
        </div>
        <div className="col-span-2 text-center">
          <span className={cn("stat-number", redWon ? "text-foreground" : "text-muted-foreground")}>{redScore}</span>
          <span className="text-muted-foreground mx-1">-</span>
          <span className={cn("stat-number", blueWon ? "text-foreground" : "text-muted-foreground")}>{blueScore}</span>
        </div>
        <div className={cn("col-span-4 truncate text-right", blueWon ? "font-semibold" : "text-muted-foreground")}>
          {blueTeams}
          <span className="inline-block w-2 h-2 rounded-full bg-[hsl(var(--chart-2))] ml-1.5" />
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <Link to="/events">
          <Button variant="ghost" className="gap-2 -ml-2"><ArrowLeft className="h-4 w-4" /> Back to Events</Button>
        </Link>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {event && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-display font-bold">{event.name}</h1>
              <ShareButton title={`${event.name} on RoboRank`} text={`Live coverage, rankings & matches for ${event.name}`} />
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.location.address_1 && `${event.location.address_1}, `}
                  {event.location.city}, {event.location.region}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(event.start).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
              </span>
              {teams && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {teams.length} teams
                </span>
              )}
              {event.sku && (
                <span className="text-xs font-mono text-primary">{event.sku}</span>
              )}
              {event.sku && (
                <a
                  href={`https://www.robotevents.com/robot-competitions/vex-robotics-competition/${event.sku}.html`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> RobotEvents
                </a>
              )}
            </div>
            <div className="mt-3">
              <Button
                variant="hero"
                size="sm"
                className="gap-1.5"
                onClick={async () => {
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) { toast.error("Please log in"); return; }
                    const teamNum = user.user_metadata?.team_number;
                    if (!teamNum) { toast.error("Connect a team to generate reports"); return; }
                    // Check if already exists
                    const { data: existing } = await supabase.from("scouting_reports")
                      .select("id").eq("event_id", Number(eventId)).eq("user_id", user.id).limit(1);
                    if (existing && existing.length > 0) {
                      toast.info("You already have a report for this event. View it in Scouting.");
                      navigate("/scouting");
                      return;
                    }
                    // Free for everyone — no per-month limit

                    toast.info("Generating report... This may take a minute.");
                    const divId = divisions[selectedDivisionIdx]?.id || 1;
                    const report = await generateScoutingReport(
                      Number(eventId), divId, event.name,
                      new Date(event.start).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
                      season
                    );
                    await supabase.from("scouting_reports").insert({
                      event_id: Number(eventId), event_name: event.name,
                      user_id: user.id, report_data: report as any,
                    });
                    toast.success("Report generated! View it in Scouting.");
                    navigate("/scouting");
                  } catch (err: any) {
                    toast.error(`Failed: ${err.message}`);
                  }
                }}
              >
                <FileText className="h-3.5 w-3.5" /> Generate Scouting Report
              </Button>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "teams" as DetailTab, label: "Teams", icon: Users },
            { key: "quals" as DetailTab, label: "Quals", icon: Target },
            { key: "elims" as DetailTab, label: "Elims", icon: Swords },
            { key: "skills" as DetailTab, label: "Skills", icon: Zap },
            { key: "awards" as DetailTab, label: "Awards", icon: Medal },
            { key: "predictions" as DetailTab, label: "Predictions", icon: TrendingUp },
            { key: "schedule" as DetailTab, label: "Schedule Difficulty", icon: BarChart3 },
          ].map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={tab === key ? "default" : "outline"}
              size="sm"
              onClick={() => setTab(key)}
              className="gap-1.5"
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </Button>
          ))}
        </div>

        {/* Division Selector - below tabs */}
        {hasDivisions && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Division:</span>
            {divisions.map((div: any, idx: number) => (
              <Button
                key={div.id}
                variant={selectedDivisionIdx === idx ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDivisionIdx(idx)}
                className="text-xs h-7"
              >
                {div.name || `Division ${idx + 1}`}
              </Button>
            ))}
          </div>
        )}

        {/* Teams Tab */}
        {tab === "teams" && (
          <>
            {statsLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Calculating RoboRank scores...
              </div>
            )}

            {eventRankings && Array.isArray(eventRankings) && eventRankings.length > 0 && !statsLoading && (
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <div className="px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Event Rankings
                </div>
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/30 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-1">#</div>
                  <div className="col-span-3">Team</div>
                  <div className="col-span-2 text-center">Record</div>
                  <div className="col-span-1 text-center">WP</div>
                  <div className="col-span-1 text-center">AP</div>
                  <div className="col-span-1 text-center">SP</div>
                  <div className="col-span-1 text-center">High</div>
                  <div className="col-span-2 text-center">RoboRank</div>
                </div>
                {(eventRankings as any[]).slice(0, 50).map((r: any, i: number) => {
                  const teamRR = teamStats?.find((t: any) => t.id === r.team?.id);
                  return (
                    <div
                      key={r.id || i}
                      onClick={() => r.team?.name && navigate(`/team/${r.team.name}`)}
                      className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-t border-border/20 hover:bg-accent/30 transition-colors cursor-pointer"
                    >
                      <div className="col-span-1 stat-number text-xs text-muted-foreground">{r.rank}</div>
                      <div className="col-span-3">
                        <div className="font-display font-semibold text-sm">{r.team?.name || "-"}</div>
                      </div>
                      <div className="col-span-2 text-center text-xs">
                        <span className="text-[hsl(var(--success))]">{r.wins}W</span>
                        <span className="text-muted-foreground">-</span>
                        <span className="text-destructive">{r.losses}L</span>
                        {r.ties > 0 && <><span className="text-muted-foreground">-</span><span>{r.ties}T</span></>}
                      </div>
                      <div className="col-span-1 text-center text-xs stat-number">{r.wp}</div>
                      <div className="col-span-1 text-center text-xs text-muted-foreground">{r.ap}</div>
                      <div className="col-span-1 text-center text-xs text-muted-foreground">{r.sp}</div>
                      <div className="col-span-1 text-center text-xs stat-number">{r.high_score}</div>
                      <div className="col-span-2 flex justify-center">
                        {teamRR ? <RoboRankScore score={teamRR.roboRank} size="sm" /> : <span className="text-xs text-muted-foreground">-</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {teamStats && teamStats.length > 0 && !(eventRankings && Array.isArray(eventRankings) && eventRankings.length > 0) && (
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-1">#</div>
                  <div className="col-span-3">Team</div>
                  <div className="col-span-2 text-center">RoboRank</div>
                  <div className="col-span-2 text-center hidden sm:block">Record</div>
                  <div className="col-span-2 text-center">Win Rate</div>
                  <div className="col-span-2 text-center hidden sm:block">Location</div>
                </div>
                {teamStats.map((team: any, i: number) => (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => navigate(`/team/${team.number}`)}
                    className="grid grid-cols-12 gap-2 px-6 py-4 items-center border-t border-border/30 hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <div className="col-span-1 stat-number text-muted-foreground">{i + 1}</div>
                    <div className="col-span-3">
                      <div className="font-display font-semibold">{team.number}</div>
                      <div className="text-xs text-muted-foreground truncate">{team.team_name}</div>
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <RoboRankScore score={team.roboRank} size="sm" />
                    </div>
                    <div className="col-span-2 text-center text-sm hidden sm:block">
                      {team.record ? (
                        <>
                          <span className="text-[hsl(var(--success))]">{team.record.wins}W</span>
                          <span className="text-muted-foreground mx-0.5">-</span>
                          <span className="text-destructive">{team.record.losses}L</span>
                        </>
                      ) : "-"}
                    </div>
                    <div className="col-span-2 text-center stat-number text-sm">
                      {team.record ? `${team.record.winRate}%` : "-"}
                    </div>
                    <div className="col-span-2 text-center text-xs text-muted-foreground hidden sm:block truncate">
                      {team.location?.city}, {team.location?.region}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {teams && teamStats && teams.length > 50 && (
              <p className="text-sm text-muted-foreground text-center">
                Showing top 50 of {teams.length} teams.
              </p>
            )}
          </>
        )}

        {/* Quals Tab */}
        {tab === "quals" && (
          matchesLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading qualification matches...
            </div>
          ) : qualMatches.length === 0 ? (
            <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
              No qualification matches found.
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <div className="grid grid-cols-12 gap-1 px-4 py-2 bg-muted/50 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-2">Match</div>
                <div className="col-span-4">Red Alliance</div>
                <div className="col-span-2 text-center">Score</div>
                <div className="col-span-4 text-right">Blue Alliance</div>
              </div>
              {qualMatches.map((m: any, i: number) => renderMatchRow(m, i))}
            </div>
          )
        )}

        {/* Elims Tab */}
        {tab === "elims" && (
          matchesLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading elimination matches...
            </div>
          ) : elimMatches.length === 0 ? (
            <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
              No elimination matches found.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-xl border border-border/50 card-gradient p-4 overflow-x-auto">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Elimination Bracket</h3>
                <EliminationBracket rounds={bracketRounds} showPlaceholders={!eventIsCompleted} />
              </div>

              <div className="space-y-4">
                {bracketRounds.map(({ round, label, matches }) => (
                  <div key={round} className="rounded-xl border border-border/50 overflow-hidden">
                    <div className="px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Swords className="h-3.5 w-3.5" />
                      {label}
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{matches.length}</span>
                    </div>
                    <div className="grid grid-cols-12 gap-1 px-4 py-1.5 bg-muted/30 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      <div className="col-span-2">Match</div>
                      <div className="col-span-4">Red Alliance</div>
                      <div className="col-span-2 text-center">Score</div>
                      <div className="col-span-4 text-right">Blue Alliance</div>
                    </div>
                    {matches.map((m: any, i: number) => renderMatchRow(m, i))}
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* Skills Tab */}
        {tab === "skills" && (
          skillsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading skills data...
            </div>
          ) : skillsLeaderboard.length === 0 ? (
            <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
              No skills data available for this event.
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/50 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-1">#</div>
                <div className="col-span-3">Team</div>
                <div className="col-span-2 text-center">Driver</div>
                <div className="col-span-2 text-center">Prog</div>
                <div className="col-span-4 text-center">Combined</div>
              </div>
              {skillsLeaderboard.map((entry, i) => (
                <div
                  key={entry.team?.id || i}
                  onClick={() => {
                    const num = entry.team?.name || entry.team?.team;
                    if (num) navigate(`/team/${num}`);
                  }}
                  className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-t border-border/20 hover:bg-accent/30 transition-colors cursor-pointer"
                >
                  <div className="col-span-1 stat-number text-xs text-muted-foreground">{i + 1}</div>
                  <div className="col-span-3">
                    <div className="font-display font-semibold text-sm">{entry.team?.name || entry.team?.team || "-"}</div>
                  </div>
                  <div className="col-span-2 text-center stat-number text-sm">{entry.driver}</div>
                  <div className="col-span-2 text-center stat-number text-sm">{entry.programming}</div>
                  <div className="col-span-4 text-center">
                    <span className="stat-number text-primary text-lg">{entry.combined}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Awards Tab */}
        {tab === "awards" && (
          awardsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading awards...
            </div>
          ) : !eventAwards || (Array.isArray(eventAwards) && eventAwards.length === 0) ? (
            <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
              No awards data available for this event.
            </div>
          ) : (
            <div className="grid gap-3">
              {(eventAwards as any[]).map((award: any, i: number) => {
                const winners = award.teamWinners || award.qualifications || [];
                return (
                  <motion.div
                    key={award.id || i}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="rounded-xl border border-border/50 card-gradient p-4"
                  >
                    <div className="flex items-start gap-3">
                      <Medal className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-semibold text-sm">{award.title}</h3>
                        {winners.length > 0 ? (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {winners.map((w: any, wi: number) => (
                              <span
                                key={wi}
                                onClick={() => {
                                  const num = w.team?.name || w.team?.team;
                                  if (num) navigate(`/team/${num}`);
                                }}
                                className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md cursor-pointer hover:bg-primary/20 transition-colors"
                              >
                                {w.team?.name || w.team?.team || "Unknown"}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">No winners listed</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        )}

        {/* Predictions Tab */}
        {tab === "predictions" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border/50 card-gradient p-4 space-y-2">
              <h3 className="text-sm font-display font-semibold flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-primary" /> What is this?
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Power Rankings</strong> predict team performance using <strong className="text-foreground">RoboRank</strong> - a composite score based on win rate, strength of schedule (AP/SP), consistency, skills scores, and event count. Higher RoboRank = stronger predicted performance.
              </p>
              <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> RoboRank score (0-100)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[hsl(var(--success))]" /> Win rate %</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[hsl(var(--chart-4))]" /> Skills combined</span>
              </div>
            </div>

            <div className="rounded-xl border border-border/50 card-gradient p-4">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <GitCompare className="h-3.5 w-3.5" /> Head-to-Head Lookup
              </h3>
              <p className="text-xs text-muted-foreground mb-3">Pick any two teams to compare their full season matchup history and stats.</p>
              {teams && teams.length > 0 && (
                <div className="flex gap-2 flex-wrap items-center">
                  <select
                    className="bg-card border border-border rounded-lg px-3 py-2 text-sm"
                    value={h2hTeams?.[0] || ""}
                    onChange={(e) => setH2hTeams([e.target.value, h2hTeams?.[1] || ""])}
                  >
                    <option value="">Select Team 1</option>
                    {teams.map((t: any) => {
                      const teamNumber = t.number || t.name || "";
                      return (
                        <option key={t.id} value={teamNumber}>{teamNumber} - {t.team_name || t.teamName || ""}</option>
                      );
                    })}
                  </select>
                  <span className="text-sm font-display font-bold text-muted-foreground">vs</span>
                  <select
                    className="bg-card border border-border rounded-lg px-3 py-2 text-sm"
                    value={h2hTeams?.[1] || ""}
                    onChange={(e) => setH2hTeams([h2hTeams?.[0] || "", e.target.value])}
                  >
                    <option value="">Select Team 2</option>
                    {teams.map((t: any) => {
                      const teamNumber = t.number || t.name || "";
                      return (
                        <option key={t.id} value={teamNumber}>{teamNumber} - {t.team_name || t.teamName || ""}</option>
                      );
                    })}
                  </select>
                  <Button
                    size="sm"
                    disabled={!h2hTeams?.[0] || !h2hTeams?.[1] || h2hTeams[0] === h2hTeams[1]}
                    onClick={() => setH2hOpen(true)}
                  >
                    Compare
                  </Button>
                </div>
              )}
            </div>

            {teamStats && teamStats.length > 0 && (
              <div className="rounded-xl border border-border/50 card-gradient p-4">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" /> Power Rankings - All {teamStats.length} Teams
                </h3>
                <p className="text-xs text-muted-foreground mb-4">Ranked by RoboRank. Bar length shows relative strength compared to the #1 seed.</p>
                
                <div className="grid grid-cols-12 gap-2 px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/20 mb-1">
                  <div className="col-span-1">#</div>
                  <div className="col-span-2">Team</div>
                  <div className="col-span-5">Strength</div>
                  <div className="col-span-2 text-center">Record</div>
                  <div className="col-span-2 text-center">RoboRank</div>
                </div>

                <div className="space-y-1 max-h-[600px] overflow-y-auto">
                  {teamStats.map((team: any, i: number) => {
                    const barWidth = teamStats[0]?.roboRank > 0 ? (team.roboRank / teamStats[0].roboRank) * 100 : 0;
                    return (
                      <motion.div
                        key={team.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 1) }}
                        onClick={() => navigate(`/team/${team.number}`)}
                        className="grid grid-cols-12 gap-2 items-center cursor-pointer hover:bg-accent/30 rounded-lg px-2 py-1.5 transition-colors"
                      >
                        <span className="col-span-1 text-xs stat-number text-muted-foreground">{i + 1}</span>
                        <span className="col-span-2 text-sm font-display font-semibold truncate">{team.number}</span>
                        <div className="col-span-5 h-5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${barWidth}%` }}
                            transition={{ delay: Math.min(i * 0.02, 1) + 0.2, duration: 0.4 }}
                            className="h-full rounded-full"
                            style={{
                              background: `linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--chart-2)) 100%)`,
                              opacity: 0.7 + (barWidth / 100) * 0.3,
                            }}
                          />
                        </div>
                        <span className="col-span-2 text-center text-xs">
                          {team.record ? (
                            <>
                              <span className="text-[hsl(var(--success))]">{team.record.wins}W</span>
                              <span className="text-muted-foreground">-</span>
                              <span className="text-destructive">{team.record.losses}L</span>
                            </>
                          ) : "-"}
                        </span>
                        <div className="col-span-2 flex justify-center">
                          <RoboRankScore score={team.roboRank} size="sm" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
            {(!teamStats || teamStats.length === 0) && !statsLoading && (
              <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
                Switch to the Teams tab first to load RoboRank data, then come back here for predictions.
              </div>
            )}
            {statsLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Calculating predictions...
              </div>
            )}
          </div>
        )}

        {/* Schedule Difficulty Tab */}
        {tab === "schedule" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border/50 card-gradient p-4 space-y-2">
              <h3 className="text-sm font-display font-semibold flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-primary" /> Schedule Difficulty
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Measures how difficult each team's <strong className="text-foreground">qualification schedule</strong> was based on opponent vs alliance RoboRank strength. Higher score = harder opponents relative to alliance partners.
              </p>
              <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Elite (75+)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[hsl(var(--chart-4))]" /> Hard (60-74)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[hsl(var(--chart-3))]" /> Medium (40-59)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[hsl(var(--success))]" /> Easy (&lt;40)</span>
              </div>
            </div>

            {scheduleLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Calculating schedule difficulty for all teams... This may take a moment.
              </div>
            )}

            {scheduleDifficulty && scheduleDifficulty.length > 0 && (
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/50 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-1">#</div>
                  <div className="col-span-3">Team</div>
                  <div className="col-span-2 text-center">Difficulty</div>
                  <div className="col-span-2 text-center">Score</div>
                  <div className="col-span-2 text-center">Label</div>
                  <div className="col-span-2 text-center">Confidence</div>
                </div>
                {scheduleDifficulty.map((team, i) => (
                  <div key={team.teamNumber}>
                    <div
                      onClick={() => setExpandedScheduleTeam(expandedScheduleTeam === team.teamNumber ? null : team.teamNumber)}
                      className="grid grid-cols-12 gap-2 px-4 py-3 items-center border-t border-border/20 hover:bg-accent/30 transition-colors cursor-pointer"
                    >
                      <div className="col-span-1 stat-number text-xs text-muted-foreground">{i + 1}</div>
                      <div className="col-span-3">
                        <div className="font-display font-semibold text-sm">{team.teamNumber}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{team.teamName}</div>
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <RoboRankScore score={team.overallDifficulty} size="sm" />
                      </div>
                      <div className="col-span-2 text-center stat-number text-sm">{team.overallDifficulty}</div>
                      <div className="col-span-2 text-center">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded",
                          team.overallDifficulty >= 75 ? "bg-destructive/15 text-destructive" :
                          team.overallDifficulty >= 60 ? "bg-[hsl(var(--chart-4))]/15 text-[hsl(var(--chart-4))]" :
                          team.overallDifficulty >= 40 ? "bg-[hsl(var(--chart-3))]/15 text-[hsl(var(--chart-3))]" :
                          "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]"
                        )}>
                          {team.label}
                        </span>
                      </div>
                      <div className="col-span-2 text-center">
                        {team.lowConfidence ? (
                          <span className="text-[10px] text-[hsl(var(--chart-4))] flex items-center justify-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Low
                          </span>
                        ) : (
                          <span className="text-[10px] text-[hsl(var(--success))]">High</span>
                        )}
                      </div>
                    </div>

                    {/* Expanded per-match breakdown */}
                    {expandedScheduleTeam === team.teamNumber && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="border-t border-border/20 bg-muted/20 px-4 py-3"
                      >
                        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                          Per-Match Breakdown
                        </div>
                        <div className="space-y-1.5">
                          {team.matchDifficulties.map((md) => (
                            <div key={md.matchNumber} className="grid grid-cols-12 gap-2 items-center text-xs py-1">
                              <div className="col-span-2 text-muted-foreground font-mono">{md.matchName}</div>
                              <div className="col-span-3">
                                <span className="text-[10px] text-muted-foreground">Partners: </span>
                                {md.alliancePartners.map(p => (
                                  <span key={p.number} className={cn("text-[10px] mr-1", p.hasData ? "text-foreground" : "text-muted-foreground/60")}>
                                    {p.number}({p.roboRank})
                                  </span>
                                ))}
                              </div>
                              <div className="col-span-3">
                                <span className="text-[10px] text-muted-foreground">Opponents: </span>
                                {md.opponents.map(o => (
                                  <span key={o.number} className={cn("text-[10px] mr-1", o.hasData ? "text-foreground" : "text-muted-foreground/60")}>
                                    {o.number}({o.roboRank})
                                  </span>
                                ))}
                              </div>
                              <div className="col-span-2 text-center">
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full rounded-full",
                                      md.difficulty >= 75 ? "bg-destructive" :
                                      md.difficulty >= 60 ? "bg-[hsl(var(--chart-4))]" :
                                      md.difficulty >= 40 ? "bg-[hsl(var(--chart-3))]" :
                                      "bg-[hsl(var(--success))]"
                                    )}
                                    style={{ width: `${md.difficulty}%` }}
                                  />
                                </div>
                              </div>
                              <div className="col-span-2 text-center stat-number text-[10px]">
                                {md.difficulty}
                                {md.lowConfidence && <AlertTriangle className="h-2.5 w-2.5 inline ml-0.5 text-[hsl(var(--chart-4))]" />}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!scheduleLoading && (!scheduleDifficulty || scheduleDifficulty.length === 0) && (
              <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
                No qualification matches found for this event. Schedule difficulty requires completed or scheduled qualification matches.
              </div>
            )}
          </div>
        )}

        {/* Head-to-Head Dialog */}
        <HeadToHeadDialog
          open={h2hOpen}
          onOpenChange={setH2hOpen}
          team1={h2hTeams?.[0] || ""}
          team2={h2hTeams?.[1] || ""}
        />
      </div>
    </AppLayout>
  );
}

function HeadToHeadDialog({ open, onOpenChange, team1, team2 }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team1: string;
  team2: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["h2h", team1, team2],
    queryFn: async () => {
      const [t1Data, t2Data] = await Promise.all([
        fetchRobotEvents("/teams", { "number[]": team1, "program[]": "1" }),
        fetchRobotEvents("/teams", { "number[]": team2, "program[]": "1" }),
      ]);
      const t1 = t1Data?.data?.[0];
      const t2 = t2Data?.data?.[0];
      if (!t1 || !t2) return null;

      const [t1Matches, t2Matches, t1Rankings, t2Rankings, t1Skills, t2Skills] = await Promise.all([
        getTeamMatches(t1.id),
        getTeamMatches(t2.id),
        getTeamRankings(t1.id),
        getTeamRankings(t2.id),
        getTeamSkillsScore(t1.id),
        getTeamSkillsScore(t2.id),
      ]);

      let t1Wins = 0, t2Wins = 0, ties = 0;
      const sharedMatches: any[] = [];

      const t2MatchMap = new Map<number, any>();
      t2Matches.forEach((m: any) => t2MatchMap.set(m.id, m));

      t1Matches.forEach((m: any) => {
        if (!t2MatchMap.has(m.id)) return;

        const match = m;
        const red = match.alliances?.find((a: any) => a.color === "red");
        const blue = match.alliances?.find((a: any) => a.color === "blue");
        const redTeams = red?.teams?.map((t: any) => t.team?.name) || [];

        const t1IsRed = redTeams.includes(team1);
        const t1Score = t1IsRed ? (red?.score ?? 0) : (blue?.score ?? 0);
        const t2Score = t1IsRed ? (blue?.score ?? 0) : (red?.score ?? 0);

        const eventName = match.event?.name || match.event_name || "Unknown Event";
        const eventSku = match.event?.sku || "";
        const dateSource = match.started || match.scheduled || match.event?.start || null;
        const matchDate = dateSource
          ? new Date(dateSource).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "Date N/A";
        const matchLabel = match.name || `${roundLabel(match.round)} ${match.matchnum || ""}`.trim();

        sharedMatches.push({
          ...match,
          t1Score,
          t2Score,
          eventName,
          eventSku,
          matchDate,
          matchLabel,
        });

        if (t1Score > t2Score) t1Wins++;
        else if (t2Score > t1Score) t2Wins++;
        else ties++;
      });

      sharedMatches.sort((a, b) => {
        const aTime = a.started ? new Date(a.started).getTime() : 0;
        const bTime = b.started ? new Date(b.started).getTime() : 0;
        return bTime - aTime;
      });

      const t1RR = calculateRoboRank(t1Rankings, t1Skills);
      const t2RR = calculateRoboRank(t2Rankings, t2Skills);
      const t1Record = calculateRecordFromRankings(t1Rankings);
      const t2Record = calculateRecordFromRankings(t2Rankings);

      return { t1, t2, t1Wins, t2Wins, ties, sharedMatches, t1RR, t2RR, t1Record, t2Record };
    },
    enabled: open && !!team1 && !!team2,
  });

  function roundLabel(round: number): string {
    switch (round) {
      case 1: return "Practice";
      case 2: return "Qual";
      case 3: return "R16";
      case 4: return "QF";
      case 5: return "SF";
      case 6: return "Final";
      default: return `R${round}`;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{team1} vs {team2}</DialogTitle>
        </DialogHeader>
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading head-to-head data...
          </div>
        )}
        {data && (
          <div className="space-y-5 overflow-y-auto pr-1">
            <div className="grid grid-cols-3 gap-4 text-center py-2">
              <div className="space-y-1.5">
                <div className="font-display font-bold text-lg text-gradient">{team1}</div>
                <RoboRankScore score={data.t1RR} size="md" />
                <div className="text-xs text-muted-foreground">
                  <span className="text-[hsl(var(--success))]">{data.t1Record.wins}W</span>
                  <span className="text-muted-foreground mx-0.5">-</span>
                  <span className="text-destructive">{data.t1Record.losses}L</span>
                  <span className="text-muted-foreground ml-1">({data.t1Record.winRate}%)</span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Head-to-Head</span>
                <div className="text-2xl font-display font-bold">
                  <span className={cn(data.t1Wins > data.t2Wins ? "text-[hsl(var(--success))]" : "text-foreground")}>{data.t1Wins}</span>
                  <span className="text-muted-foreground mx-1.5">–</span>
                  <span className={cn(data.t2Wins > data.t1Wins ? "text-[hsl(var(--success))]" : "text-foreground")}>{data.t2Wins}</span>
                </div>
                {data.ties > 0 && <span className="text-xs text-muted-foreground mt-0.5">{data.ties} tie{data.ties > 1 ? "s" : ""}</span>}
              </div>
              <div className="space-y-1.5">
                <div className="font-display font-bold text-lg text-gradient">{team2}</div>
                <RoboRankScore score={data.t2RR} size="md" />
                <div className="text-xs text-muted-foreground">
                  <span className="text-[hsl(var(--success))]">{data.t2Record.wins}W</span>
                  <span className="text-muted-foreground mx-0.5">-</span>
                  <span className="text-destructive">{data.t2Record.losses}L</span>
                  <span className="text-muted-foreground ml-1">({data.t2Record.winRate}%)</span>
                </div>
              </div>
            </div>

            {data.sharedMatches.length > 0 ? (
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <div className="px-3 py-2 bg-muted/50 text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Shared Matches This Season</span>
                  <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{data.sharedMatches.length}</span>
                </div>
                <div className="divide-y divide-border/20">
                  {data.sharedMatches.map((m: any) => (
                    <div key={m.id} className="px-3 py-2.5 text-xs hover:bg-accent/20 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">{m.eventName}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono">{m.matchLabel}</span>
                            <span>•</span>
                            <span>{m.matchDate}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn(
                            "stat-number text-sm px-2 py-0.5 rounded",
                            m.t1Score > m.t2Score ? "text-[hsl(var(--success))] bg-[hsl(var(--success))]/10 font-bold" : "text-muted-foreground"
                          )}>{m.t1Score}</span>
                          <span className="text-muted-foreground">–</span>
                          <span className={cn(
                            "stat-number text-sm px-2 py-0.5 rounded",
                            m.t2Score > m.t1Score ? "text-[hsl(var(--success))] bg-[hsl(var(--success))]/10 font-bold" : "text-muted-foreground"
                          )}>{m.t2Score}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground rounded-lg border border-border/30 border-dashed p-6 text-center">
                These teams haven't played in any shared matches this season.
              </div>
            )}
          </div>
        )}
        {!isLoading && !data && (
          <p className="text-sm text-muted-foreground text-center py-4">Could not load data for these teams.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
