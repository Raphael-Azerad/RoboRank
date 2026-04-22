import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, Loader2, CheckCircle2, XCircle, Users, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { validateTeamNumber } from "@/lib/robotevents";
import { toast } from "sonner";

type JoinMode = "member" | "follower";

export default function JoinTeam() {
  const navigate = useNavigate();
  const [joinMode, setJoinMode] = useState<JoinMode>("member");
  const [teamNumber, setTeamNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [teamValid, setTeamValid] = useState<boolean | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate("/login");
        return;
      }
      setUserId(data.user.id);

      // Check team_members table for existing membership
      const { data: membership } = await supabase
        .from("team_members")
        .select("team_number, status")
        .eq("user_id", data.user.id)
        .limit(1)
        .maybeSingle();

      if (membership) {
        navigate("/dashboard");
        return;
      }

      // Check if already following a team
      const { data: profile } = await supabase
        .from("profiles")
        .select("followed_team")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile?.followed_team) {
        navigate("/dashboard");
        return;
      }

      // If user signed up with a team number but team_member row wasn't created
      const metaMode = data.user.user_metadata?.account_mode;
      if (metaMode === "follower") {
        setJoinMode("follower");
      }

      const metaTeam = data.user.user_metadata?.team_number;
      if (metaTeam) {
        const num = String(metaTeam).trim().toUpperCase();
        if (num) {
          const { data: newMembership, error } = await supabase
            .from("team_members")
            .insert({ team_number: num, user_id: data.user.id })
            .select("role, status")
            .single();

          if (!error && newMembership) {
            if (newMembership.role === "owner" && newMembership.status === "approved") {
              toast.success("Welcome! You're the team captain for " + num + ".", { duration: 6000 });
            } else {
              toast.success("Join request sent for " + num + ". Waiting for admin approval.", { duration: 6000 });
            }
          }
          navigate("/dashboard");
          return;
        }
      }

      // Check for followed_team in metadata (Google OAuth follower flow)
      const metaFollowed = data.user.user_metadata?.followed_team;
      if (metaFollowed) {
        const num = String(metaFollowed).trim().toUpperCase();
        if (num) {
          setJoinMode("follower");
          setTeamNumber(num);
          await supabase.from("profiles").update({ followed_team: num }).eq("id", data.user.id);
          navigate("/dashboard");
          return;
        }
      }
    }
    checkUser();
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

    if (joinMode === "follower") {
      const { error } = await supabase
        .from("profiles")
        .update({ followed_team: num })
        .eq("id", userId);

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      toast.success(`Now following team ${num}!`);
      navigate("/dashboard");
      setLoading(false);
      return;
    }

    // Team member flow
    const { data: membership, error } = await supabase
      .from("team_members")
      .insert({ team_number: num, user_id: userId })
      .select("role, status")
      .single();

    if (error) {
      if (error.code === "23505") {
        toast.error("You've already requested to join this team");
      } else {
        toast.error(error.message);
      }
      setLoading(false);
      return;
    }

    if (membership?.role === "owner" && membership?.status === "approved") {
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
          <h1 className="text-2xl font-display font-bold">Get Connected</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Finish setup and choose how you'd like to track a VEX team
          </p>
        </div>

        <div className="rounded-xl border border-border/50 bg-card/40 p-4 text-left">
          <p className="text-xs font-medium text-primary">Final setup step</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add your team now, or skip and come back later from your profile without getting stuck in a loop.
          </p>
        </div>

        {/* Mode selector */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => { setJoinMode("member"); setTeamNumber(""); setTeamValid(null); setTeamName(null); }}
            className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all text-center ${
              joinMode === "member"
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border/50 hover:border-primary/30"
            }`}
          >
            <Users className={`h-5 w-5 ${joinMode === "member" ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <p className="text-sm font-semibold">Join Team</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">I'm on this team</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => { setJoinMode("follower"); setTeamNumber(""); setTeamValid(null); setTeamName(null); }}
            className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all text-center ${
              joinMode === "follower"
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-border/50 hover:border-primary/30"
            }`}
          >
            <Eye className={`h-5 w-5 ${joinMode === "follower" ? "text-primary" : "text-muted-foreground"}`} />
            <div>
              <p className="text-sm font-semibold">Follow Team</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Parent, coach, or fan</p>
            </div>
          </button>
        </div>

        <div className="rounded-xl border border-border/50 card-gradient p-6 space-y-4">
          {joinMode === "member" ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Users className="h-5 w-5 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground">
                First members become team owner automatically. Others need admin approval.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--chart-2))]/5 border border-[hsl(var(--chart-2))]/20">
              <Eye className="h-5 w-5 text-[hsl(var(--chart-2))] shrink-0" />
              <p className="text-xs text-muted-foreground">
                You'll see all stats, rankings, and events. Scouting reports and notes are team-member only.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="team">Team Number</Label>
            <div className="relative">
              <Input
                id="team"
                placeholder="e.g. 1234A"
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
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : joinMode === "member" ? (
              "Join Team"
            ) : (
              "Follow Team"
            )}
          </Button>
        </div>

        <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleSkip}>
          Skip for now
        </Button>
      </div>
    </div>
  );
}
