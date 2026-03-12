import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Loader2, CheckCircle2, XCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { validateTeamNumber } from "@/lib/robotevents";
import { toast } from "sonner";

export default function JoinTeam() {
  const navigate = useNavigate();
  const [teamNumber, setTeamNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [teamValid, setTeamValid] = useState<boolean | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate("/login");
        return;
      }
      setUserId(data.user.id);

      // If user already has a team, redirect to dashboard
      const tn = data.user.user_metadata?.team_number;
      if (tn) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const handleTeamBlur = async () => {
    const num = teamNumber.trim().toUpperCase();
    if (!num) return;
    setValidating(true);
    try {
      const result = await validateTeamNumber(num);
      setTeamValid(result.valid);
      setTeamName(result.teamName || null);
      if (!result.valid) {
        toast.error(`Team "${num}" not found on RobotEvents`);
      }
    } catch {
      setTeamValid(true);
    }
    setValidating(false);
  };

  const handleJoin = async () => {
    if (!teamNumber.trim() || teamValid === false || !userId) return;
    setLoading(true);

    const num = teamNumber.trim().toUpperCase();

    // Check if team already has members
    const { data: existingMembers } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_number", num)
      .eq("status", "approved")
      .limit(1);

    const isFirstMember = !existingMembers || existingMembers.length === 0;

    // Insert team membership
    const { error } = await supabase.from("team_members").insert({
      team_number: num,
      user_id: userId,
      role: isFirstMember ? "owner" : "member",
      status: isFirstMember ? "approved" : "pending",
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("You've already requested to join this team");
      } else {
        toast.error(error.message);
      }
      setLoading(false);
      return;
    }

    // Update user metadata
    await supabase.auth.updateUser({
      data: { team_number: num, team_name: teamName },
    });

    if (isFirstMember) {
      toast.success("Team created! You're the owner.");
    } else {
      toast.success("Join request sent! Waiting for admin approval.");
    }

    navigate("/dashboard");
    setLoading(false);
  };

  const handleSkip = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-6">
            <BarChart3 className="h-8 w-8 text-primary" />
            <span className="text-2xl font-display font-bold text-gradient">RoboRank</span>
          </div>
          <h1 className="text-2xl font-display font-bold">Join Your Team</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your VEX team number to connect with your team
          </p>
        </div>

        <div className="rounded-xl border border-border/50 card-gradient p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Users className="h-5 w-5 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              If your team already has members, your request will need to be approved by an admin. First members become team owner automatically.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="team">Team Number</Label>
            <div className="relative">
              <Input
                id="team"
                placeholder="e.g. 17505B"
                value={teamNumber}
                onChange={(e) => { setTeamNumber(e.target.value); setTeamValid(null); setTeamName(null); }}
                onBlur={handleTeamBlur}
                className="bg-card uppercase pr-10"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {validating && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {!validating && teamValid === true && <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />}
                {!validating && teamValid === false && <XCircle className="h-4 w-4 text-destructive" />}
              </div>
            </div>
            {teamName && teamValid && (
              <p className="text-xs text-[hsl(var(--success))]">{teamName}</p>
            )}
          </div>

          <Button
            className="w-full"
            onClick={handleJoin}
            disabled={loading || !teamNumber.trim() || teamValid === false}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join Team"}
          </Button>
        </div>

        <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleSkip}>
          Skip for now
        </Button>
      </div>
    </div>
  );
}
