import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { validateTeamNumber } from "@/lib/robotevents";
import { toast } from "sonner";

export default function Signup() {
  const navigate = useNavigate();
  const [teamNumber, setTeamNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [teamValid, setTeamValid] = useState<boolean | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [noTeam, setNoTeam] = useState(false);

  const handleTeamBlur = async () => {
    if (noTeam) return;
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noTeam && !teamNumber.trim()) {
      toast.error("Please enter your team number or select 'No team'");
      return;
    }
    if (!noTeam && teamValid === false) {
      toast.error("Please enter a valid VEX team number");
      return;
    }
    setLoading(true);

    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          team_number: noTeam ? null : teamNumber.toUpperCase(),
          team_name: noTeam ? null : teamName,
        },
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      // If user has a team, auto-create team_members entry as owner
      if (!noTeam && signUpData.user) {
        await supabase.from("team_members").insert({
          team_number: teamNumber.toUpperCase(),
          user_id: signUpData.user.id,
          role: "owner",
          status: "approved",
        });
      }
      toast.success("Account created! Check your email to verify.");
      navigate("/login");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <BarChart3 className="h-8 w-8 text-primary" />
            <span className="text-2xl font-display font-bold text-gradient">RoboRank</span>
          </Link>
          <h1 className="text-2xl font-display font-bold">Create your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">Enter your VEX team number to get started</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team">Team Number</Label>
            {!noTeam && (
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
            )}
            {teamName && teamValid && !noTeam && (
              <p className="text-xs text-[hsl(var(--success))]">{teamName}</p>
            )}
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={noTeam}
                onChange={(e) => {
                  setNoTeam(e.target.checked);
                  if (e.target.checked) {
                    setTeamNumber("");
                    setTeamValid(null);
                    setTeamName(null);
                  }
                }}
                className="rounded border-border"
              />
              I don't have a team
            </label>
            {noTeam && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                You can browse events and rankings, but scouting reports require a team unless you upgrade to a paid plan.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="team@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-card"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-card"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || (!noTeam && teamValid === false)}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
