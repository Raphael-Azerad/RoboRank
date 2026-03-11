import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { getTeamByNumber, SEASONS, SEASON_LIST } from "@/lib/robotevents";
import { useSeason, type GradeLevel } from "@/contexts/SeasonContext";
import { useQuery } from "@tanstack/react-query";
import { User, Mail, Hash, MapPin, Building, Loader2, Calendar, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const GRADE_OPTIONS: { value: GradeLevel; label: string; desc: string }[] = [
  { value: "Both", label: "All Teams", desc: "Show HS & MS combined" },
  { value: "High School", label: "High School", desc: "Only HS teams" },
  { value: "Middle School", label: "Middle School", desc: "Only MS teams" },
];

export default function Profile() {
  const { season, setSeason, gradeLevel, setGradeLevel } = useSeason();
  const [user, setUser] = useState<{ email?: string; team_number?: string }>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser({
        email: data.user?.email,
        team_number: data.user?.user_metadata?.team_number,
      });
    });
  }, []);

  const { data: teamData, isLoading } = useQuery({
    queryKey: ["teamProfile", user.team_number],
    queryFn: () => getTeamByNumber(user.team_number!),
    enabled: !!user.team_number,
  });

  const seasonInfo = SEASONS[season];

  return (
    <AppLayout>
      <div className="max-w-lg space-y-6">
        <h1 className="text-3xl font-display font-bold">Profile</h1>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border/50 card-gradient p-8 space-y-6"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-primary/10 p-4">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold">{user.team_number || "—"}</h2>
              <p className="text-sm text-muted-foreground">
                {teamData?.team_name || "VEX Robotics Team"}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Team Number:</span>
              <span className="font-medium">{user.team_number || "—"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{user.email || "—"}</span>
            </div>
            {isLoading && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading team details...
              </div>
            )}
            {teamData && (
              <>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Location:</span>
                  <span className="font-medium">
                    {teamData.location?.city}, {teamData.location?.region}, {teamData.location?.country}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Organization:</span>
                  <span className="font-medium">{teamData.organization || "—"}</span>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* Grade Level Selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-border/50 card-gradient p-8 space-y-4"
        >
          <div className="flex items-center gap-3">
            <GraduationCap className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-display font-semibold">Grade Level</h3>
              <p className="text-xs text-muted-foreground">
                Filter rankings & leaderboards by division
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {GRADE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={gradeLevel === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => setGradeLevel(opt.value)}
                className="text-xs"
              >
                {opt.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Currently showing: <span className="text-foreground font-medium">{gradeLevel === "Both" ? "All Teams" : gradeLevel}</span>
          </p>
        </motion.div>

        {/* Season Selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border/50 card-gradient p-8 space-y-4"
        >
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-display font-semibold">Active Season</h3>
              <p className="text-xs text-muted-foreground">
                Changes data across the entire platform
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {SEASON_LIST.map((s) => (
              <Button
                key={s.key}
                variant={season === s.key ? "default" : "outline"}
                size="sm"
                onClick={() => setSeason(s.key)}
                className="text-xs"
              >
                {s.name} ({s.year})
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Currently viewing: <span className="text-foreground font-medium">{seasonInfo.name} ({seasonInfo.year})</span>
          </p>
        </motion.div>
      </div>
    </AppLayout>
  );
}
