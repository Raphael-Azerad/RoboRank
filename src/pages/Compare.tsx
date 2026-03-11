import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { RoboRankScore } from "@/components/dashboard/RoboRankScore";
import { Search, Loader2, ArrowLeftRight, Trophy, Target, Award, TrendingUp, Zap, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getTeamByNumber, getTeamRankings, getTeamSkillsScore, calculateRecordFromRankings, calculateRoboRank, SEASONS } from "@/lib/robotevents";
import { useSeason } from "@/contexts/SeasonContext";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TeamComparison {
  team: any;
  record: ReturnType<typeof calculateRecordFromRankings> | null;
  roboRank: number;
  skillsScore: number;
}

function CompareColumn({ label, team1Value, team2Value, higherIsBetter = true }: {
  label: string;
  team1Value: string | number;
  team2Value: string | number;
  higherIsBetter?: boolean;
}) {
  const v1 = typeof team1Value === "number" ? team1Value : parseFloat(String(team1Value)) || 0;
  const v2 = typeof team2Value === "number" ? team2Value : parseFloat(String(team2Value)) || 0;
  const t1Better = higherIsBetter ? v1 > v2 : v1 < v2;
  const t2Better = higherIsBetter ? v2 > v1 : v2 < v1;
  const tied = v1 === v2;

  return (
    <div className="grid grid-cols-3 gap-4 items-center py-3 border-b border-border/20">
      <div className={cn("text-right stat-number text-lg", t1Better ? "text-success" : tied ? "text-foreground" : "text-muted-foreground")}>
        {team1Value}
      </div>
      <div className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
      <div className={cn("text-left stat-number text-lg", t2Better ? "text-success" : tied ? "text-foreground" : "text-muted-foreground")}>
        {team2Value}
      </div>
    </div>
  );
}

export default function Compare() {
  const { season } = useSeason();
  const seasonInfo = SEASONS[season];
  const [team1Input, setTeam1Input] = useState("");
  const [team2Input, setTeam2Input] = useState("");
  const [team1Number, setTeam1Number] = useState("");
  const [team2Number, setTeam2Number] = useState("");

  const { data: team1Data, isLoading: t1Loading } = useQuery({
    queryKey: ["compare-team", team1Number, season],
    queryFn: async (): Promise<TeamComparison | null> => {
      const team = await getTeamByNumber(team1Number);
      if (!team) return null;
      const [rankings, skillsScore] = await Promise.all([
        getTeamRankings(team.id, season),
        getTeamSkillsScore(team.id, season),
      ]);
      const record = calculateRecordFromRankings(rankings);
      const roboRank = calculateRoboRank(rankings, skillsScore);
      return { team, record, roboRank, skillsScore };
    },
    enabled: !!team1Number,
  });

  const { data: team2Data, isLoading: t2Loading } = useQuery({
    queryKey: ["compare-team", team2Number, season],
    queryFn: async (): Promise<TeamComparison | null> => {
      const team = await getTeamByNumber(team2Number);
      if (!team) return null;
      const [rankings, skillsScore] = await Promise.all([
        getTeamRankings(team.id, season),
        getTeamSkillsScore(team.id, season),
      ]);
      const record = calculateRecordFromRankings(rankings);
      const roboRank = calculateRoboRank(rankings, skillsScore);
      return { team, record, roboRank, skillsScore };
    },
    enabled: !!team2Number,
  });

  const handleCompare = (e: React.FormEvent) => {
    e.preventDefault();
    setTeam1Number(team1Input.trim().toUpperCase());
    setTeam2Number(team2Input.trim().toUpperCase());
  };

  const loading = t1Loading || t2Loading;
  const bothLoaded = team1Data && team2Data;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Compare Teams</h1>
          <p className="text-muted-foreground mt-1">
            {seasonInfo.name} {seasonInfo.year} · Head-to-head comparison
          </p>
        </div>

        <form onSubmit={handleCompare} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Team 1 (e.g. 17505B)"
              className="pl-10 bg-card text-center font-display font-semibold"
              value={team1Input}
              onChange={(e) => setTeam1Input(e.target.value)}
            />
          </div>
          <div className="shrink-0">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
          </div>
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Team 2 (e.g. 1000A)"
              className="pl-10 bg-card text-center font-display font-semibold"
              value={team2Input}
              onChange={(e) => setTeam2Input(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={!team1Input.trim() || !team2Input.trim()}>
            Compare
          </Button>
        </form>

        {loading && (
          <div className="flex flex-col items-center gap-2 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading team data...</p>
          </div>
        )}

        {!loading && (team1Number || team2Number) && (!team1Data || !team2Data) && (
          <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
            {!team1Data && team1Number && `Team "${team1Number}" not found. `}
            {!team2Data && team2Number && `Team "${team2Number}" not found.`}
          </div>
        )}

        {!loading && bothLoaded && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Team Headers */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="text-right space-y-1">
                <div className="text-2xl font-display font-bold text-gradient">{team1Data.team.number}</div>
                <div className="text-sm text-muted-foreground truncate">{team1Data.team.team_name}</div>
                {team1Data.team.location && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                    <MapPin className="h-3 w-3" />
                    {team1Data.team.location.region}
                  </div>
                )}
              </div>
              <div className="text-center text-sm font-medium text-muted-foreground">VS</div>
              <div className="text-left space-y-1">
                <div className="text-2xl font-display font-bold text-gradient">{team2Data.team.number}</div>
                <div className="text-sm text-muted-foreground truncate">{team2Data.team.team_name}</div>
                {team2Data.team.location && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {team2Data.team.location.region}
                  </div>
                )}
              </div>
            </div>

            {/* RoboRank comparison */}
            <div className="grid grid-cols-3 gap-4 items-center py-4">
              <div className="flex justify-end">
                <RoboRankScore score={team1Data.roboRank} size="lg" />
              </div>
              <div className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                RoboRank
              </div>
              <div className="flex justify-start">
                <RoboRankScore score={team2Data.roboRank} size="lg" />
              </div>
            </div>

            {/* Stats comparison */}
            <div className="rounded-xl border border-border/50 card-gradient p-6">
              <CompareColumn label="Win Rate" team1Value={`${team1Data.record?.winRate ?? 0}%`} team2Value={`${team2Data.record?.winRate ?? 0}%`} />
              <CompareColumn label="Wins" team1Value={team1Data.record?.wins ?? 0} team2Value={team2Data.record?.wins ?? 0} />
              <CompareColumn label="Losses" team1Value={team1Data.record?.losses ?? 0} team2Value={team2Data.record?.losses ?? 0} higherIsBetter={false} />
              <CompareColumn label="Matches" team1Value={team1Data.record?.total ?? 0} team2Value={team2Data.record?.total ?? 0} />
              <CompareColumn label="Events" team1Value={team1Data.record?.eventsAttended ?? 0} team2Value={team2Data.record?.eventsAttended ?? 0} />
              <CompareColumn label="High Score" team1Value={team1Data.record?.highScore ?? 0} team2Value={team2Data.record?.highScore ?? 0} />
              <CompareColumn label="Avg Pts" team1Value={team1Data.record?.avgPointsPerEvent ?? 0} team2Value={team2Data.record?.avgPointsPerEvent ?? 0} />
              <CompareColumn label="Skills" team1Value={team1Data.skillsScore} team2Value={team2Data.skillsScore} />
              <CompareColumn label="Total WP" team1Value={team1Data.record?.totalWP ?? 0} team2Value={team2Data.record?.totalWP ?? 0} />
              <CompareColumn label="Total AP" team1Value={team1Data.record?.totalAP ?? 0} team2Value={team2Data.record?.totalAP ?? 0} />
              <CompareColumn label="Total SP" team1Value={team1Data.record?.totalSP ?? 0} team2Value={team2Data.record?.totalSP ?? 0} />
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
