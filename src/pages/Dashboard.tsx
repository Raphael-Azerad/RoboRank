import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { RoboRankScore } from "@/components/dashboard/RoboRankScore";
import { Calendar, Trophy, Target, TrendingUp, ArrowRight, Loader2, Award, Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getTeamByNumber, getTeamRankings, getTeamAwards, getTeamMatches, calculateRecordFromRankings, calculateRecordFromMatches, calculateRoboRank, getTeamSkillsScore, SEASONS } from "@/lib/robotevents";
import { useSeason } from "@/contexts/SeasonContext";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { MatchesPlayedModal, WinsModal, groupMatchesByEvent, filterWonMatches } from "@/components/matches/MatchModals";

export default function Dashboard() {
  const navigate = useNavigate();
  const { season } = useSeason();
  const [teamNumber, setTeamNumber] = useState<string>("");
  const [matchesModalOpen, setMatchesModalOpen] = useState(false);
  const [winsModalOpen, setWinsModalOpen] = useState(false);
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

  const qualRecord = rankings ? calculateRecordFromRankings(rankings) : null;
  const matchRecord = useMemo(() => {
    if (!matches || !teamNumber) return null;
    return calculateRecordFromMatches(matches, teamNumber);
  }, [matches, teamNumber]);

  const roboRank = rankings ? calculateRoboRank(rankings, skillsScore ?? 0) : null;
  const loading = teamLoading || rankingsLoading;

  const matchesByEvent = useMemo(() => {
    if (!matches) return [];
    return groupMatchesByEvent(matches);
  }, [matches]);

  const totalMatchCount = matches?.length || 0;

  const wonMatches = useMemo(() => {
    if (!matches || !teamNumber) return [];
    return filterWonMatches(matches, teamNumber);
  }, [matches, teamNumber]);

  const seasonLabel = `${seasonInfo.name} ${seasonInfo.year}`;

  return (
    <AppLayout>
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">
              Team <span className="text-gradient">{teamNumber || "—"}</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              {teamData?.team_name || "Welcome to your competition command center"}
              {" · "}
              <span className="text-xs text-primary">{seasonLabel}</span>
            </p>
          </div>
          <Link to="/scouting">
            <Button variant="hero">
              New Scouting Report <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </motion.div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <button type="button" onClick={() => setWinsModalOpen(true)} className="text-left">
            <StatCard title="Win Rate" value={matchRecord ? `${matchRecord.winRate}%` : "—"} icon={Trophy}
              subtitle={matchRecord ? `${matchRecord.wins}W-${matchRecord.losses}L-${matchRecord.ties}T (all matches)` : loading ? "Loading..." : "No data"} className="cursor-pointer" />
          </button>
          <button type="button" onClick={() => setMatchesModalOpen(true)} className="text-left">
            <StatCard title="Matches" value={totalMatchCount ? String(totalMatchCount) : "—"} icon={Target}
              subtitle={qualRecord ? `Across ${qualRecord.eventsAttended} events` : loading ? "Loading..." : "No data"} className="cursor-pointer" />
          </button>
          <StatCard title="High Score" value={matchRecord ? String(matchRecord.highScore) : "—"} icon={Award}
            subtitle={matchRecord ? `Avg ${matchRecord.avgPoints} pts/match` : ""} />
          <div onClick={() => navigate("/awards")} className="cursor-pointer">
            <StatCard title="Awards" value={awards ? String(awards.length) : "—"} icon={Medal}
              subtitle={awards && awards.length > 0 ? "Tap to view all" : loading ? "Loading..." : "No awards"} />
          </div>
        </div>

        {teamNumber && (
          <MatchesPlayedModal
            open={matchesModalOpen}
            onOpenChange={setMatchesModalOpen}
            teamNumber={teamNumber}
            seasonLabel={seasonLabel}
            matchesByEvent={matchesByEvent}
            totalMatchCount={totalMatchCount}
          />
        )}

        {teamNumber && (
          <WinsModal
            open={winsModalOpen}
            onOpenChange={setWinsModalOpen}
            teamNumber={teamNumber}
            seasonLabel={seasonLabel}
            wonMatches={wonMatches}
            totalMatchCount={totalMatchCount}
            winRate={matchRecord?.winRate ?? 0}
          />
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-xl border border-border/50 card-gradient p-8 flex flex-col items-center justify-center gap-4">
            <h2 className="text-lg font-display font-semibold text-muted-foreground">Your RoboRank</h2>
            {loading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <RoboRankScore score={roboRank ?? 0} size="lg" />}
            <p className="text-sm text-muted-foreground text-center">
              {qualRecord ? `Based on ${qualRecord.total} qualifier matches` : loading ? "Loading…" : "No data"}
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="lg:col-span-2 rounded-xl border border-border/50 card-gradient p-8">
            <h2 className="text-lg font-display font-semibold mb-4">Quick Actions</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link to="/events"><div className="rounded-lg border border-border/50 p-4 hover:border-primary/30 transition-all cursor-pointer">
                <Calendar className="h-5 w-5 text-primary mb-2" /><h3 className="font-medium text-sm">Browse Events</h3>
                <p className="text-xs text-muted-foreground mt-1">Find upcoming competitions</p></div></Link>
              <Link to="/rankings"><div className="rounded-lg border border-border/50 p-4 hover:border-primary/30 transition-all cursor-pointer">
                <Trophy className="h-5 w-5 text-primary mb-2" /><h3 className="font-medium text-sm">View Rankings</h3>
                <p className="text-xs text-muted-foreground mt-1">Look up any team's stats</p></div></Link>
              <Link to="/scouting"><div className="rounded-lg border border-border/50 p-4 hover:border-primary/30 transition-all cursor-pointer">
                <Target className="h-5 w-5 text-primary mb-2" /><h3 className="font-medium text-sm">Generate Report</h3>
                <p className="text-xs text-muted-foreground mt-1">Scout an upcoming event</p></div></Link>
              <Link to={`/team/${teamNumber}`}><div className="rounded-lg border border-border/50 p-4 hover:border-primary/30 transition-all cursor-pointer">
                <TrendingUp className="h-5 w-5 text-primary mb-2" /><h3 className="font-medium text-sm">Your Full Stats</h3>
                <p className="text-xs text-muted-foreground mt-1">Detailed team profile</p></div></Link>
            </div>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
