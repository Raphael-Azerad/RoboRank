import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RoboRankScore } from "@/components/dashboard/RoboRankScore";
import { StatCard } from "@/components/dashboard/StatCard";
import { useQuery } from "@tanstack/react-query";
import { getTeamByNumber, getTeamRankings, getTeamMatches, calculateRecordFromRankings, calculateRoboRank } from "@/lib/robotevents";
import { Trophy, Target, Award, MapPin, Building, Calendar, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function TeamDetail() {
  const { teamNumber } = useParams<{ teamNumber: string }>();

  const { data: teamData, isLoading: teamLoading } = useQuery({
    queryKey: ["team", teamNumber],
    queryFn: () => getTeamByNumber(teamNumber!),
    enabled: !!teamNumber,
  });

  const teamId = teamData?.id || null;

  const { data: rankings, isLoading: rankingsLoading } = useQuery({
    queryKey: ["teamRankings", teamId],
    queryFn: () => getTeamRankings(teamId!),
    enabled: !!teamId,
  });

  const { data: matches } = useQuery({
    queryKey: ["teamMatches", teamId],
    queryFn: () => getTeamMatches(teamId!),
    enabled: !!teamId,
  });

  const record = rankings ? calculateRecordFromRankings(rankings) : null;
  const roboRank = rankings ? calculateRoboRank(rankings) : null;

  const loading = teamLoading || rankingsLoading;

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
          <Link to="/rankings">
            <Button variant="ghost" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back to Rankings</Button>
          </Link>
          <div className="text-center py-12 text-muted-foreground">
            Team "{teamNumber}" not found.
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <Link to="/rankings">
            <Button variant="ghost" className="gap-2 -ml-2"><ArrowLeft className="h-4 w-4" /> Back to Rankings</Button>
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-6"
          >
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
            </div>
            <div className="shrink-0">
              <RoboRankScore score={roboRank ?? 0} size="lg" />
            </div>
          </motion.div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Win Rate"
            value={record ? `${record.winRate}%` : "—"}
            icon={Trophy}
            subtitle={record ? `${record.wins}W-${record.losses}L-${record.ties}T` : "No data"}
          />
          <StatCard
            title="Qual Matches"
            value={record ? String(record.total) : "—"}
            icon={Target}
            subtitle={record ? `Across ${record.eventsAttended} events` : "No data"}
          />
          <StatCard
            title="High Score"
            value={record ? String(record.highScore) : "—"}
            icon={Award}
            subtitle={record ? `Avg ${record.avgPointsPerEvent} pts/match` : ""}
          />
          <StatCard
            title="Total WP"
            value={record ? String(record.totalWP) : "—"}
            icon={TrendingUp}
            subtitle={record ? `AP: ${record.totalAP} · SP: ${record.totalSP}` : ""}
          />
        </div>

        {/* Event-by-Event Breakdown */}
        {rankings && rankings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-xl font-display font-semibold mb-4">Event Results</h2>
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-4">Event</div>
                <div className="col-span-2 text-center">Rank</div>
                <div className="col-span-2 text-center">Record</div>
                <div className="col-span-2 text-center">Avg Pts</div>
                <div className="col-span-2 text-center">High</div>
              </div>
              {rankings.map((r: any, i: number) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="grid grid-cols-12 gap-2 px-6 py-4 items-center border-t border-border/30 hover:bg-accent/50 transition-colors"
                >
                  <div className="col-span-4">
                    <div className="font-medium text-sm truncate">{r.event?.name || "Unknown Event"}</div>
                    <div className="text-xs text-muted-foreground">{r.division?.name}</div>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className={`stat-number text-sm ${r.rank <= 3 ? 'text-primary' : ''}`}>
                      #{r.rank}
                    </span>
                  </div>
                  <div className="col-span-2 text-center text-sm">
                    <span className="text-success">{r.wins}W</span>
                    <span className="text-muted-foreground mx-0.5">-</span>
                    <span className="text-destructive">{r.losses}L</span>
                  </div>
                  <div className="col-span-2 text-center text-sm text-muted-foreground">
                    {r.average_points?.toFixed(1)}
                  </div>
                  <div className="col-span-2 text-center stat-number text-sm">
                    {r.high_score}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent Matches */}
        {matches && matches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-xl font-display font-semibold mb-4">Recent Matches</h2>
            <div className="grid gap-2">
              {matches.slice(-20).reverse().map((m: any) => {
                const myAlliance = m.alliances?.find((a: any) =>
                  a.teams?.some((t: any) => t.team?.name === teamNumber)
                );
                const oppAlliance = m.alliances?.find((a: any) => a.color !== myAlliance?.color);
                const myScore = myAlliance?.score ?? 0;
                const oppScore = oppAlliance?.score ?? 0;
                const won = myScore > oppScore;
                const tied = myScore === oppScore && myScore > 0;

                return (
                  <div
                    key={m.id}
                    className="rounded-lg border border-border/30 p-4 flex items-center justify-between hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{m.event?.name}</div>
                      <div className="text-xs text-muted-foreground">{m.name} · {m.division?.name}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className={`text-sm stat-number ${won ? 'text-success' : tied ? 'text-muted-foreground' : 'text-destructive'}`}>
                        {myScore}
                      </span>
                      <span className="text-xs text-muted-foreground">vs</span>
                      <span className="text-sm stat-number text-muted-foreground">{oppScore}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        won ? 'bg-success/10 text-success' :
                        tied ? 'bg-muted text-muted-foreground' :
                        'bg-destructive/10 text-destructive'
                      }`}>
                        {won ? 'W' : tied ? 'T' : 'L'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
