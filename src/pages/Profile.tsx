import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { getTeamByNumber, SEASONS, SEASON_LIST } from "@/lib/robotevents";
import { useSeason, type GradeLevel } from "@/contexts/SeasonContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Mail, Hash, MapPin, Building, Loader2, Calendar, GraduationCap, Users, Check, X as XIcon, Clock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { validateTeamNumber } from "@/lib/robotevents";

const GRADE_OPTIONS: { value: GradeLevel; label: string; desc: string }[] = [
  { value: "Both", label: "All Teams", desc: "Show HS & MS combined" },
  { value: "High School", label: "High School", desc: "Only HS teams" },
  { value: "Middle School", label: "Middle School", desc: "Only MS teams" },
];

export default function Profile() {
  const { season, setSeason, gradeLevel, setGradeLevel } = useSeason();
  const { subscribed, loading: subLoading, subscriptionEnd, startCheckout, openPortal } = useSubscription();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<{ id?: string; email?: string; team_number?: string | null }>({});
  const [joinTeamNumber, setJoinTeamNumber] = useState("");
  const [joiningTeam, setJoiningTeam] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser({
        id: data.user?.id,
        email: data.user?.email,
        team_number: data.user?.user_metadata?.team_number || null,
      });
    });
  }, []);

  const { data: teamData, isLoading } = useQuery({
    queryKey: ["teamProfile", user.team_number],
    queryFn: () => getTeamByNumber(user.team_number!),
    enabled: !!user.team_number,
  });

  // Team members with email info
  const { data: teamMembers } = useQuery({
    queryKey: ["teamMembers", user.team_number],
    queryFn: async () => {
      if (!user.team_number) return [];
      const { data: members } = await supabase.from("team_members")
        .select("*")
        .eq("team_number", user.team_number);
      if (!members || members.length === 0) return [];
      // Fetch profile emails for approved members
      const approvedIds = members.filter(m => m.status === "approved").map(m => m.user_id);
      const { data: profiles } = await supabase.from("profiles")
        .select("id, email")
        .in("id", approvedIds);
      const emailMap = new Map((profiles || []).map(p => [p.id, p.email]));
      return members.map(m => ({ ...m, email: emailMap.get(m.user_id) || null }));
    },
    enabled: !!user.team_number,
  });

  // Pending join requests for my team
  const approvedMembers = teamMembers?.filter(m => m.status === "approved") || [];
  const pendingRequests = teamMembers?.filter(m => m.status === "pending") || [];
  const myMembership = teamMembers?.find(m => m.user_id === user.id);
  const isTeamOwner = myMembership?.role === "owner";
  const [showMembers, setShowMembers] = useState(false);

  // My pending requests (if I requested to join a team)
  const { data: myPendingRequests } = useQuery({
    queryKey: ["myPendingRequests", user.id],
    queryFn: async () => {
      if (!user.id) return [];
      const { data } = await supabase.from("team_members")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "pending");
      return data || [];
    },
    enabled: !!user.id && !user.team_number,
  });

  const handleJoinRequest = async () => {
    const num = joinTeamNumber.trim().toUpperCase();
    if (!num) return;
    setJoiningTeam(true);
    try {
      const result = await validateTeamNumber(num);
      if (!result.valid) {
        toast.error(`Team "${num}" not found on RobotEvents`);
        setJoiningTeam(false);
        return;
      }
      const { error } = await supabase.from("team_members").insert({
        team_number: num,
        user_id: user.id!,
        role: "member",
        status: "pending",
      });
      if (error) {
        if (error.code === "23505") toast.error("You already requested to join this team");
        else toast.error(error.message);
      } else {
        toast.success(`Join request sent for team ${num}`);
        setJoinTeamNumber("");
        queryClient.invalidateQueries({ queryKey: ["myPendingRequests"] });
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setJoiningTeam(false);
  };

  const handleApproveRequest = async (memberId: string, teamNum: string, userId: string) => {
    const { error } = await supabase.from("team_members")
      .update({ status: "approved" })
      .eq("id", memberId);
    if (error) {
      toast.error(error.message);
    } else {
      // Update the user's profile with the team number
      await supabase.from("profiles").update({ team_number: teamNum }).eq("id", userId);
      toast.success("Member approved!");
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
    }
  };

  const handleRejectRequest = async (memberId: string) => {
    const { error } = await supabase.from("team_members")
      .update({ status: "rejected" })
      .eq("id", memberId);
    if (error) toast.error(error.message);
    else {
      toast.success("Request rejected");
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
    }
  };

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
              <h2 className="text-xl font-display font-bold">{user.team_number || "No Team"}</h2>
              <p className="text-sm text-muted-foreground">
                {teamData?.team_name || (user.team_number ? "VEX Robotics Team" : "Browse-only account")}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {user.team_number && (
              <div className="flex items-center gap-3 text-sm">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Team Number:</span>
                <span className="font-medium">{user.team_number}</span>
              </div>
            )}
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

        {/* Subscription */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          className={cn(
            "rounded-xl border p-8 space-y-4",
            subscribed ? "border-primary/30 bg-primary/5" : "border-border/50 card-gradient"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className={cn("h-5 w-5", subscribed ? "text-primary" : "text-muted-foreground")} />
              <div>
                <h3 className="font-display font-semibold">
                  {subscribed ? "Premium Plan" : "Free Plan"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {subscribed
                    ? `Unlimited reports · Renews ${subscriptionEnd ? new Date(subscriptionEnd).toLocaleDateString() : "—"}`
                    : "1 scouting report per month"}
                </p>
              </div>
            </div>
            {subscribed ? (
              <Button variant="outline" size="sm" onClick={openPortal}>Manage</Button>
            ) : (
              <Button variant="hero" size="sm" onClick={startCheckout} className="gap-1.5">
                <Crown className="h-3.5 w-3.5" /> Upgrade — $10/mo
              </Button>
            )}
          </div>
        </motion.div>


        {!user.team_number && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-xl border border-border/50 card-gradient p-8 space-y-4"
          >
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-display font-semibold">Join a Team</h3>
                <p className="text-xs text-muted-foreground">
                  Request to join an existing team to access scouting reports
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Team number (e.g. 17505B)"
                value={joinTeamNumber}
                onChange={(e) => setJoinTeamNumber(e.target.value)}
                className="bg-card uppercase"
              />
              <Button onClick={handleJoinRequest} disabled={joiningTeam || !joinTeamNumber.trim()}>
                {joiningTeam ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request"}
              </Button>
            </div>
            {myPendingRequests && myPendingRequests.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Pending Requests:</p>
                {myPendingRequests.map((req) => (
                  <div key={req.id} className="flex items-center gap-2 text-sm bg-muted/30 rounded-lg px-3 py-2">
                    <Clock className="h-4 w-4 text-[hsl(var(--chart-4))]" />
                    <span>{req.team_number}</span>
                    <span className="text-xs text-muted-foreground">— Awaiting approval</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Team Members (for team owners) */}
        {user.team_number && teamMembers && teamMembers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-xl border border-border/50 card-gradient p-8 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-display font-semibold">Team Members</h3>
                  <p className="text-xs text-muted-foreground">
                    {approvedMembers.length} member{approvedMembers.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMembers(!showMembers)}
                className="text-xs"
              >
                {showMembers ? "Hide" : "View All"}
              </Button>
            </div>

            {/* Pending requests (owner only) */}
            {isTeamOwner && pendingRequests.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[hsl(var(--chart-4))]">Pending Join Requests</p>
                {pendingRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between bg-[hsl(var(--chart-4))]/5 border border-[hsl(var(--chart-4))]/20 rounded-lg px-3 py-2">
                    <span className="text-sm font-medium">{(req as any).email || req.user_id.slice(0, 8) + "..."}</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-[hsl(var(--success))]"
                        onClick={() => handleApproveRequest(req.id, req.team_number, req.user_id)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-destructive"
                        onClick={() => handleRejectRequest(req.id)}>
                        <XIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Expanded member list */}
            {showMembers && (
              <div className="space-y-2 border-t border-border/30 pt-3">
                {approvedMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between text-sm py-2 px-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col">
                      <span className={cn(member.user_id === user.id && "text-primary font-medium")}>
                        {member.user_id === user.id ? "You" : ((member as any).email || `Member ${member.user_id.slice(0, 8)}...`)}
                      </span>
                      {(member as any).email && member.user_id !== user.id && (
                        <span className="text-[10px] text-muted-foreground">{(member as any).email}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded",
                        member.role === "owner" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {member.role === "owner" ? "Leader" : "Member"}
                      </span>
                      {isTeamOwner && member.user_id !== user.id && member.role !== "owner" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] text-primary"
                          onClick={async () => {
                            const { error } = await supabase.from("team_members")
                              .update({ role: "owner" })
                              .eq("id", member.id);
                            if (error) toast.error(error.message);
                            else {
                              toast.success("Promoted to leader!");
                              queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
                            }
                          }}
                        >
                          Make Leader
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

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
