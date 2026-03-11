import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { RoboRankScore } from "@/components/dashboard/RoboRankScore";
import { Search, Loader2, Plus, X, MapPin } from "lucide-react";
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

function useTeamComparison(teamNumber: string, season: string) {
  return useQuery({
    queryKey: ["compare-team", teamNumber, season],
    queryFn: async (): Promise<TeamComparison | null> => {
      const team = await getTeamByNumber(teamNumber);
      if (!team) return null;
      const [rankings, skillsScore] = await Promise.all([
        getTeamRankings(team.id, season as any),
        getTeamSkillsScore(team.id, season as any),
      ]);
      const record = calculateRecordFromRankings(rankings);
      const roboRank = calculateRoboRank(rankings, skillsScore);
      return { team, record, roboRank, skillsScore };
    },
    enabled: !!teamNumber,
  });
}

interface StatRowProps {
  label: string;
  values: (string | number)[];
  higherIsBetter?: boolean;
}

function StatRow({ label, values, higherIsBetter = true }: StatRowProps) {
  const nums = values.map((v) => (typeof v === "number" ? v : parseFloat(String(v)) || 0));
  const best = higherIsBetter ? Math.max(...nums) : Math.min(...nums);
  const allSame = nums.every((n) => n === nums[0]);

  return (
    <div className="grid items-center py-3 border-b border-border/20" style={{ gridTemplateColumns: `1fr repeat(${values.length}, 1fr)` }}>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider pl-4">
        {label}
      </div>
      {values.map((val, i) => (
        <div
          key={i}
          className={cn(
            "text-center stat-number text-base",
            !allSame && nums[i] === best ? "text-[hsl(var(--success))]" : allSame ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {val}
        </div>
      ))}
    </div>
  );
}

export default function Compare() {
  const { season } = useSeason();
  const seasonInfo = SEASONS[season];
  const [inputs, setInputs] = useState<string[]>(["", ""]);
  const [submitted, setSubmitted] = useState<string[]>([]);

  const team1 = useTeamComparison(submitted[0] || "", season);
  const team2 = useTeamComparison(submitted[1] || "", season);
  const team3 = useTeamComparison(submitted[2] || "", season);
  const team4 = useTeamComparison(submitted[3] || "", season);

  const allQueries = [team1, team2, team3, team4].slice(0, submitted.length);
  const loading = allQueries.some((q) => q.isLoading);
  const loadedTeams = allQueries.map((q) => q.data).filter(Boolean) as TeamComparison[];

  const handleCompare = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = inputs.filter((s) => s.trim()).map((s) => s.trim().toUpperCase());
    if (cleaned.length >= 2) setSubmitted(cleaned);
  };

  const updateInput = (index: number, value: string) => {
    setInputs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addSlot = () => {
    if (inputs.length < 4) setInputs((prev) => [...prev, ""]);
  };

  const removeSlot = (index: number) => {
    if (inputs.length > 2) {
      setInputs((prev) => prev.filter((_, i) => i !== index));
      setSubmitted((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const teamCount = inputs.length;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Compare Teams</h1>
          <p className="text-muted-foreground mt-1">
            {seasonInfo.name} {seasonInfo.year} · Compare up to 4 teams side by side
          </p>
        </div>

        <form onSubmit={handleCompare} className="space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            {inputs.map((input, i) => (
              <div key={i} className="relative flex-1 min-w-[140px]">
                <label className="text-xs text-muted-foreground mb-1 block">Team {i + 1}</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={`e.g. ${["17505B", "1000A", "2011C", "5150H"][i]}`}
                    className="pl-9 bg-card font-display font-semibold text-sm"
                    value={input}
                    onChange={(e) => updateInput(i, e.target.value)}
                  />
                  {inputs.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeSlot(i)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {inputs.length < 4 && (
              <Button type="button" variant="outline" size="sm" onClick={addSlot} className="gap-1.5 mb-0.5">
                <Plus className="h-3.5 w-3.5" /> Add Team
              </Button>
            )}
          </div>
          <Button type="submit" disabled={inputs.filter((s) => s.trim()).length < 2}>
            Compare
          </Button>
        </form>

        {loading && (
          <div className="flex flex-col items-center gap-2 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading team data...</p>
          </div>
        )}

        {!loading && submitted.length >= 2 && loadedTeams.length === 0 && (
          <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
            No teams found. Check your team numbers and try again.
          </div>
        )}

        {!loading && loadedTeams.length >= 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Team Headers */}
            <div className="grid items-start" style={{ gridTemplateColumns: `1fr repeat(${loadedTeams.length}, 1fr)` }}>
              <div />
              {loadedTeams.map((t) => (
                <div key={t.team.id} className="text-center space-y-2 px-2">
                  <div className="text-xl font-display font-bold text-gradient">{t.team.number}</div>
                  <div className="text-xs text-muted-foreground truncate">{t.team.team_name}</div>
                  {t.team.location && (
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 justify-center">
                      <MapPin className="h-2.5 w-2.5" />
                      {t.team.location.region}
                    </div>
                  )}
                  <div className="flex justify-center pt-1">
                    <RoboRankScore score={t.roboRank} size="md" />
                  </div>
                </div>
              ))}
            </div>

            {/* Stats Table */}
            <div className="rounded-xl border border-border/50 card-gradient overflow-hidden">
              <StatRow label="Win Rate" values={loadedTeams.map((t) => `${t.record?.winRate ?? 0}%`)} />
              <StatRow label="Wins" values={loadedTeams.map((t) => t.record?.wins ?? 0)} />
              <StatRow label="Losses" values={loadedTeams.map((t) => t.record?.losses ?? 0)} higherIsBetter={false} />
              <StatRow label="Matches" values={loadedTeams.map((t) => t.record?.total ?? 0)} />
              <StatRow label="Events" values={loadedTeams.map((t) => t.record?.eventsAttended ?? 0)} />
              <StatRow label="High Score" values={loadedTeams.map((t) => t.record?.highScore ?? 0)} />
              <StatRow label="Avg Pts" values={loadedTeams.map((t) => t.record?.avgPointsPerEvent ?? 0)} />
              <StatRow label="Skills" values={loadedTeams.map((t) => t.skillsScore)} />
              <StatRow label="Total WP" values={loadedTeams.map((t) => t.record?.totalWP ?? 0)} />
              <StatRow label="Total AP" values={loadedTeams.map((t) => t.record?.totalAP ?? 0)} />
              <StatRow label="Total SP" values={loadedTeams.map((t) => t.record?.totalSP ?? 0)} />
            </div>

            {/* Not-found teams */}
            {submitted.length > loadedTeams.length && (
              <p className="text-sm text-muted-foreground text-center">
                {submitted.filter((n) => !loadedTeams.find((t) => t.team.number === n)).map((n) => `"${n}"`).join(", ")} not found.
              </p>
            )}
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
