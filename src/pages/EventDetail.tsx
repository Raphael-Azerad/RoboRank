import { useParams, Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RoboRankScore } from "@/components/dashboard/RoboRankScore";
import { useQuery } from "@tanstack/react-query";
import { fetchRobotEvents, getEventTeams, getTeamRankings, calculateRecordFromRankings, calculateRoboRank, getTeamSkillsScore } from "@/lib/robotevents";
import { ArrowLeft, MapPin, Calendar, Users, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  // Get event details
  const { data: eventData, isLoading: eventLoading } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const result = await fetchRobotEvents(`/events/${eventId}`);
      return result;
    },
    enabled: !!eventId,
  });

  // Get teams at this event
  const { data: teams, isLoading: teamsLoading } = useQuery({
    queryKey: ["eventTeams", eventId],
    queryFn: () => getEventTeams(Number(eventId)),
    enabled: !!eventId,
  });

  // Get RoboRank for each team (batch, max 30)
  const { data: teamStats, isLoading: statsLoading } = useQuery({
    queryKey: ["eventTeamStats", teams?.map((t: any) => t.id)],
    queryFn: async () => {
      if (!teams) return [];
      const subset = teams.slice(0, 30);
      const results: any[] = [];
      await Promise.all(subset.map(async (team: any) => {
        try {
          const rankings = await getTeamRankings(team.id);
          const record = calculateRecordFromRankings(rankings);
          const score = calculateRoboRank(rankings);
          results.push({
            ...team,
            record,
            roboRank: score,
          });
        } catch {
          results.push({ ...team, record: null, roboRank: 0 });
        }
      }));
      return results.sort((a, b) => b.roboRank - a.roboRank);
    },
    enabled: !!teams && teams.length > 0,
  });

  const loading = eventLoading || teamsLoading;
  const event = eventData;

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
                  {event.location.city}, {event.location.region}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(event.start).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </span>
              {teams && (
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {teams.length} teams registered
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Teams at this event */}
        {statsLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Calculating RoboRank scores for all teams...
          </div>
        )}

        {teamStats && teamStats.length > 0 && (
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
                      <span className="text-success">{team.record.wins}W</span>
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

        {/* Show remaining teams without stats */}
        {teams && teamStats && teams.length > 30 && (
          <p className="text-sm text-muted-foreground text-center">
            Showing RoboRank scores for top 30 teams. {teams.length - 30} additional teams registered.
          </p>
        )}
      </div>
    </AppLayout>
  );
}
