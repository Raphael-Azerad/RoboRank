import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { getTeamByNumber, getTeamAwards, SEASONS } from "@/lib/robotevents";
import { useSeason } from "@/contexts/SeasonContext";
import { useQuery } from "@tanstack/react-query";
import { Medal, ArrowLeft, Loader2, Calendar, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Awards() {
  const { season } = useSeason();
  const [teamNumber, setTeamNumber] = useState("");
  const seasonInfo = SEASONS[season];

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setTeamNumber(data.user?.user_metadata?.team_number || "");
    });
  }, []);

  const { data: teamData } = useQuery({
    queryKey: ["team", teamNumber],
    queryFn: () => getTeamByNumber(teamNumber),
    enabled: !!teamNumber,
  });

  const teamId = teamData?.id || null;

  const { data: awards, isLoading } = useQuery({
    queryKey: ["teamAwards", teamId, season],
    queryFn: () => getTeamAwards(teamId!, season),
    enabled: !!teamId,
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" className="gap-2 -ml-2">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-display font-bold">
              Awards · <span className="text-gradient">{teamNumber || "-"}</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              {seasonInfo.name} {seasonInfo.year}
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && (!awards || awards.length === 0) && (
          <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
            No awards found for {seasonInfo.name} ({seasonInfo.year}).
          </div>
        )}

        {!isLoading && awards && awards.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{awards.length} award{awards.length !== 1 ? "s" : ""} this season</p>
            {awards.map((award: any, i: number) => {
              const eventDate = award.event?.start ? new Date(award.event.start) : null;
              return (
                <motion.div
                  key={award.id || i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-xl border border-border/50 card-gradient p-6 flex items-start gap-4"
                >
                  <div className="rounded-full bg-primary/10 p-2.5 mt-0.5 shrink-0">
                    <Medal className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <h3 className="font-display font-semibold">{award.title}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {award.event?.name || "Unknown Event"}
                      </span>
                      {eventDate && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground/70">
                      {seasonInfo.name} · {seasonInfo.year}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
