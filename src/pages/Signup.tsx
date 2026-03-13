import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { validateTeamNumber } from "@/lib/robotevents";
import { toast } from "sonner";

const isCustomDomain = () =>
  !window.location.hostname.includes("lovable.app") &&
  !window.location.hostname.includes("lovableproject.com");

export default function Signup() {
  const navigate = useNavigate();
  const [teamNumber, setTeamNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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
      if (!noTeam && signUpData.user && signUpData.session) {
        const { data: membership, error: membershipError } = await supabase
          .from("team_members")
          .insert({
            team_number: teamNumber.toUpperCase(),
            user_id: signUpData.user.id,
          })
          .select("role, status")
          .single();

        if (membershipError && membershipError.code !== "23505") {
          toast.error(membershipError.message);
          setLoading(false);
          return;
        }

        if (membership?.role === "owner" && membership?.status === "approved") {
          toast.success("Team created! You're the owner.");
        } else if (membership) {
          toast.success("Join request sent! Waiting for admin approval.");
        }
      }
      toast.success("Account created! Check your email to verify.");
      navigate("/login");
    }
    setLoading(false);
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    try {
      if (isCustomDomain()) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/dashboard`,
            skipBrowserRedirect: true,
          },
        });
        if (error) throw error;
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
      } else {
        const { error } = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: window.location.origin,
        });
        if (error) throw error;
      }
    } catch {
      toast.error("Google sign-in failed. Please try again.");
    }
    setGoogleLoading(false);
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

        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleGoogleSignup}
          disabled={googleLoading}
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team">Team Number</Label>
            {!noTeam && (
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
                This option is for coaches, parents, mentors, or anyone not officially on a VEX team. You can still browse events, rankings, and team profiles. Scouting reports and team notes require a team membership or a paid plan.
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
