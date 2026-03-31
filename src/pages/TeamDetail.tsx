import { useState, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RoboRankScore } from "@/components/dashboard/RoboRankScore";
import { StatCard } from "@/components/dashboard/StatCard";
import { useQuery } from "@tanstack/react-query";
import { getTeamByNumber, getTeamRankings, getTeamMatches, getTeamAwards, getTeamEvents, calculateRecordFromRankings, calculateRecordFromMatches, calculateRoboRank, getTeamSkillsScore, SEASONS } from "@/lib/robotevents";
import { useSeason } from "@/contexts/SeasonContext";
import { Trophy, Target, Award, MapPin, Building, ArrowLeft, Loader2, TrendingUp, Medal, ChevronDown, ChevronRight, Video, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MatchesPlayedModal, WinsModal, groupMatchesByEvent, filterWonMatches } from "@/components/matches/MatchModals";

interface GroupedAward {
  title: string;
  events: { name: string; date: string; id?: number }[];
}

function groupAwards(awards: any[]): GroupedAward[] {
  const map = new Map<string, GroupedAward>();
  awards.forEach((a: any) => {
    const title = a.title || "Unknown Award";
    if (!map.has(title)) {
      map.set(title, { title, events: [] });
    }
    map.get(title)!.events.push({
      name: a.event?.name || "Unknown Event",
      date: a.event?.start || a.event?.end || "",
      id: a.event?.id,
    });
  });
  return Array.from(map.values()).sort((a, b) => b.events.length - a.events.length);
}

function AwardGroup({ group }: { group: GroupedAward }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border/30 overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-accent/30 transition-colors text-left">
        <Medal className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium">{group.title}</span>
        </div>
        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">×{group.events.length}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="border-t border-border/20 bg-muted/30">
          {group.events.map((ev, i) => (
            <div key={i} className="px-4 py-2.5 pl-11 text-xs border-t border-border/10 first:border-t-0">
              <div className="text-foreground">{ev.name}</div>
              {ev.date && <div className="text-muted-foreground mt-0.5">{ev.date}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TeamDetail() {
  const { teamNumber } = useParams<{ teamNumber: string }>();
  const navigate = useNavigate();
  const { season } = useSeason();
  const [awardsModalOpen, setAwardsModalOpen] = useState(false);
  const [matchesModalOpen, setMatchesModalOpen] = useState(false);
  const [winsModalOpen, setWinsModalOpen] = useState(false);

  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ["team", teamNumber],
    queryFn: () => getTeamByNumber(teamNumber!),
    enabled: !!teamNumber,
  });

  const teamId = teamData?.id || null;
  const seasonInfo = SEASONS[season];

  const { data: rankings, isLoading: rankingsLoading } = useQuery({
    queryKey: ["teamRankings", teamId, season],
    queryFn: () => getTeamRankings(teamId!, season),
    enabled: !!teamId,
  });

  const { data: matches } = useQuery({
    queryKey: ["teamMatches", teamId, season],
    queryFn: () => getTeamMatches(teamId!, season),
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

  const qualRecord = rankings ? calculateRecordFromRankings(rankings) : null;
  const matchRecord = useMemo(() => {
    if (!matches || !teamNumber) return null;
    return calculateRecordFromMatches(matches, teamNumber);
  }, [matches, teamNumber]);

  const roboRank = rankings ? calculateRoboRank(rankings, skillsScore ?? 0) : null;
  const loading = teamLoading || rankingsLoading;
  const groupedAwards = awards ? groupAwards(awards) : [];

  const matchesByEvent = useMemo(() => {
    if (!matches) return [];
    return groupMatchesByEvent(matches);
  }, [matches]);

  const totalMatchCount = matches?.length || 0;

  const wonMatches = useMemo(() => {
    if (!matches) return [];
    return filterWonMatches(matches, teamNumber!);
  }, [matches, teamNumber]);

  const seasonLabel = `${seasonInfo.name} ${seasonInfo.year}`;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!teamData) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Link to="/rankings"><Button variant="ghost" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>
          <div className="text-center py-12 text-muted-foreground">Team "{teamNumber}" not found.</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4">
          <Link to="/rankings"><Button variant="ghost" className="gap-2 -ml-2"><ArrowLeft className="h-4 w-4" /> Back to Rankings</Button></Link>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-display font-bold">
                Team <span className="text-gradient">{teamData.number}</span>
              </h1>
              <p className="text-lg text-muted-foreground mt-1">{teamData.team_name}</p>
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                {teamData.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {teamData.location.city}, {teamData.location.region}, {teamData.location.country}
                  </span>
                )}
                {teamData.organization && (
                  <span className="flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5" />
                    {teamData.organization}
                  </span>
                )}
              </div>
              <p className="text-xs text-primary mt-2">{seasonLabel}</p>
            </div>
            <div className="shrink-0"><RoboRankScore score={roboRank ?? 0} size="lg" /></div>
          </motion.div>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          <button type="button" onClick={() => setWinsModalOpen(true)} className="text-left">
            <StatCard title="Win Rate" value={matchRecord ? `${matchRecord.winRate}%` : "-"} icon={Trophy}
              subtitle={matchRecord ? `${matchRecord.wins}W-${matchRecord.losses}L-${matchRecord.ties}T (all matches)` : "No data"} className="cursor-pointer" />
          </button>
          <button type="button" onClick={() => setMatchesModalOpen(true)} className="text-left">
            <StatCard title="Matches Played" value={String(totalMatchCount)} icon={Target}
              subtitle={`Quals + Elims · Tap to view all`} className="cursor-pointer" />
          </button>
          <StatCard title="High Score" value={matchRecord ? String(matchRecord.highScore) : "-"} icon={Award}
            subtitle={matchRecord ? `Avg ${matchRecord.avgPoints} pts/match` : ""} />
          <StatCard title="Total WP" value={qualRecord ? String(qualRecord.totalWP) : "-"} icon={TrendingUp}
            subtitle={qualRecord ? `AP: ${qualRecord.totalAP} · SP: ${qualRecord.totalSP}` : ""} />
          <button type="button" onClick={() => setAwardsModalOpen(true)} className="text-left">
            <StatCard title="Awards" value={awards ? String(awards.length) : "-"} icon={Medal}
              subtitle={awards && awards.length > 0 ? "Tap to view" : "No awards yet"} className="cursor-pointer" />
          </button>
        </div>

        <MatchesPlayedModal
          open={matchesModalOpen}
          onOpenChange={setMatchesModalOpen}
          teamNumber={teamNumber!}
          seasonLabel={seasonLabel}
          matchesByEvent={matchesByEvent}
          totalMatchCount={totalMatchCount}
        />

        <WinsModal
          open={winsModalOpen}
          onOpenChange={setWinsModalOpen}
          teamNumber={teamNumber!}
          seasonLabel={seasonLabel}
          wonMatches={wonMatches}
          totalMatchCount={totalMatchCount}
          winRate={matchRecord?.winRate ?? 0}
        />

        <Dialog open={awardsModalOpen} onOpenChange={setAwardsModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{teamData.number} Awards</DialogTitle>
              <DialogDescription>{seasonLabel} · {awards?.length || 0} total awards</DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto pr-1 space-y-2">
              {groupedAwards.length > 0 ? (
                groupedAwards.map((group) => <AwardGroup key={group.title} group={group} />)
              ) : (
                <div className="rounded-lg border border-border/30 p-6 text-sm text-muted-foreground text-center">No awards found for this season.</div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {rankings && rankings.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-xl font-display font-semibold mb-4">Event Results · {seasonInfo.name}</h2>
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-4">Event</div>
                <div className="col-span-2 text-center">Rank</div>
                <div className="col-span-2 text-center">Record</div>
                <div className="col-span-2 text-center">Avg Pts</div>
                <div className="col-span-2 text-center">High</div>
              </div>
              {rankings.map((r: any, i: number) => (
                <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                  onClick={() => r.event?.id && navigate(`/event/${r.event.id}`)}
                  className="grid grid-cols-12 gap-2 px-6 py-4 items-center border-t border-border/30 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="col-span-4">
                    <div className="font-medium text-sm truncate text-primary hover:underline">{r.event?.name || "Unknown"}</div>
                    <div className="text-xs text-muted-foreground">{r.division?.name}</div>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className={`stat-number text-sm ${r.rank <= 3 ? "text-primary" : ""}`}>#{r.rank}</span>
                  </div>
                  <div className="col-span-2 text-center text-sm">
                    <span className="text-[hsl(var(--success))]">{r.wins}W</span>
                    <span className="text-muted-foreground mx-0.5">-</span>
                    <span className="text-destructive">{r.losses}L</span>
                  </div>
                  <div className="col-span-2 text-center text-sm text-muted-foreground">{r.average_points?.toFixed(1)}</div>
                  <div className="col-span-2 text-center stat-number text-sm">{r.high_score}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {rankings && rankings.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No event results for {seasonInfo.name} ({seasonInfo.year}).
          </div>
        )}
      </div>
    </AppLayout>
  );
}
