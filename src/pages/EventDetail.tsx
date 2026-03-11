import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RoboRankScore } from "@/components/dashboard/RoboRankScore";
import { useQuery } from "@tanstack/react-query";
import {
  fetchRobotEvents, getEventTeams, getEventRankings, getEventMatches,
  getEventSkills, getTeamRankings, calculateRecordFromRankings,
  calculateRoboRank, getTeamSkillsScore, fetchAllPages,
} from "@/lib/robotevents";
import { ArrowLeft, MapPin, Calendar, Users, Loader2, Trophy, Zap, Swords, Medal, Target, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EliminationBracket } from "@/components/events/EliminationBracket";

type DetailTab = "teams" | "quals" | "elims" | "skills" | "awards";

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
  const [tab, setTab] = useState<DetailTab>("teams");

  const { data: eventData, isLoading: eventLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => fetchRobotEvents(`/events/${eventId}`),
    enabled: !!eventId,
  });

  const event = eventData;
  const divisionId = event?.divisions?.[0]?.id || 1;

  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ["eventTeams", eventId],
    queryFn: () => getEventTeams(Number(eventId)),
    enabled: !!eventId,
  });

  // Rankings at this event (division-level)
  const { data: eventRankings, isLoading: rankingsLoading } = useQuery({
    queryKey: ["eventRankings", eventId, divisionId],
    queryFn: async () => {
      const result = await getEventRankings(Number(eventId), divisionId);
      return result?.data || result || [];
    },
    enabled: !!eventId && (tab === "teams" || tab === "quals"),
  });

  // Matches
  const { data: allMatches, isLoading: matchesLoading } = useQuery({
    queryKey: ["eventMatches", eventId, divisionId],
    queryFn: () => getEventMatches(Number(eventId), divisionId),
    enabled: !!eventId && (tab === "quals" || tab === "elims"),
  });

  // Skills
  const { data: eventSkills, isLoading: skillsLoading } = useQuery({
    queryKey: ["eventSkills", eventId],
    queryFn: () => getEventSkills(Number(eventId)),
    enabled: !!eventId && tab === "skills",
  });

  // Awards
  const { data: eventAwards, isLoading: awardsLoading } = useQuery({
    queryKey: ["eventAwards", eventId],
    queryFn: async () => {
      const result = await fetchRobotEvents(`/events/${eventId}/awards`);
      return result?.data || result || [];
    },
    enabled: !!eventId && tab === "awards",
  });

  // RoboRank for teams (batch, max 50)
  const { data: teamStats, isLoading: statsLoading } = useQuery({
    queryKey: ["eventTeamStats", teams?.map((t: any) => t.id)],
    queryFn: async () => {
      if (!teams) return [];
      const subset = teams.slice(0, 50);
      const results: any[] = [];
      for (let i = 0; i < subset.length; i += 15) {
        const batch = subset.slice(i, i + 15);
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
    enabled: !!teams && teams.length > 0 && tab === "teams",
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

  const renderMatchRow = (match: any, i: number) => {
    const red = match.alliances?.find((a: any) => a.color === "red");
    const blue = match.alliances?.find((a: any) => a.color === "blue");
    const redScore = red?.score ?? 0;
    const blueScore = blue?.score ?? 0;
    const redWon = redScore > blueScore;
    const blueWon = blueScore > redScore;
    const redTeams = red?.teams?.map((t: any) => t.team?.name).filter(Boolean).join(" & ") || "—";
    const blueTeams = blue?.teams?.map((t: any) => t.team?.name).filter(Boolean).join(" & ") || "—";

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
            <h1 className="text-2xl font-display font-bold">{event.name}</h1>
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

        {/* Teams Tab */}
        {tab === "teams" && (
          <>
            {statsLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Calculating RoboRank scores...
              </div>
            )}

            {/* Event Rankings */}
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
                        <div className="font-display font-semibold text-sm">{r.team?.name || "—"}</div>
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
                        {teamRR ? <RoboRankScore score={teamRR.roboRank} size="sm" /> : <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Fallback: Team list with RoboRank */}
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
                      ) : "—"}
                    </div>
                    <div className="col-span-2 text-center stat-number text-sm">
                      {team.record ? `${team.record.winRate}%` : "—"}
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
                    <div className="font-display font-semibold text-sm">{entry.team?.name || entry.team?.team || "—"}</div>
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
      </div>
    </AppLayout>
  );
}
