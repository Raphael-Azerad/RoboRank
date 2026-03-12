import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { getTeamByNumber, SEASONS, SEASON_LIST } from "@/lib/robotevents";
import { useSeason, type GradeLevel } from "@/contexts/SeasonContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { User, Mail, Hash, MapPin, Building, Loader2, Calendar, GraduationCap, Users, Check, X as XIcon, Clock, Crown, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { validateTeamNumber } from "@/lib/robotevents";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const GRADE_OPTIONS: { value: GradeLevel; label: string }[] = [
  { value: "Both", label: "All Teams" },
  { value: "High School", label: "High School" },
  { value: "Middle School", label: "Middle School" },
];

export default function Profile() {
  const { season, setSeason, gradeLevel, setGradeLevel } = useSeason();
  const { subscribed, loading: subLoading, subscriptionEnd, startCheckout, openPortal } = useSubscription();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<{ id?: string; email?: string; team_number?: string | null }>({});
  const [joinTeamNumber, setJoinTeamNumber] = useState("");
  const [joiningTeam, setJoiningTeam] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [removeMember, setRemoveMember] = useState<{ id: string; email: string | null } | null>(null);

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

  const { data: teamMembers } = useQuery({
    queryKey: ["teamMembers", user.team_number],
    queryFn: async () => {
      if (!user.team_number) return [];
      const { data: members } = await supabase.from("team_members")
        .select("*")
        .eq("team_number", user.team_number);
      if (!members || members.length === 0) return [];
      const approvedIds = members.filter(m => m.status === "approved").map(m => m.user_id);
      const { data: profiles } = await supabase.from("profiles")
        .select("id, email")
        .in("id", approvedIds);
      const emailMap = new Map((profiles || []).map(p => [p.id, p.email]));
      return members.map(m => ({ ...m, email: emailMap.get(m.user_id) || null }));
    },
    enabled: !!user.team_number,
  });

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

  const approvedMembers = teamMembers?.filter(m => m.status === "approved") || [];
  const pendingRequests = teamMembers?.filter(m => m.status === "pending") || [];
  const myMembership = teamMembers?.find(m => m.user_id === user.id);
  const isTeamOwner = myMembership?.role === "owner";

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

  const handleRemoveMember = async (memberId: string) => {
    const { error } = await supabase.from("team_members").delete().eq("id", memberId);
    if (error) toast.error(error.message);
    else {
      toast.success("Member removed from team");
      setRemoveMember(null);
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
    }
  };

  const seasonInfo = SEASONS[season];

  return (
    <AppLayout>
      <div className="max-w-2xl space-y-6">
        {/* Header with upgrade CTA */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-display font-bold">Profile</h1>
          {!subscribed && !subLoading && (
            <Button onClick={startCheckout} className="gap-1.5 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
              <Crown className="h-4 w-4" /> Upgrade to Premium
            </Button>
          )}
          {subscribed && (
            <Button variant="outline" size="sm" onClick={openPortal} className="gap-1.5">
              <Crown className="h-4 w-4 text-primary" /> Manage Plan
            </Button>
          )}
        </div>

        {/* Subscription Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-xl border p-5",
            subscribed
              ? "border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10"
              : "border-border/50 card-gradient"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn("rounded-full p-2.5", subscribed ? "bg-primary/15" : "bg-muted")}>
              <Crown className={cn("h-5 w-5", subscribed ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div className="flex-1">
              <h3 className="font-display font-semibold">
                {subscribed ? "Premium Plan" : "Free Plan"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {subscribed
                  ? `Unlimited scouting reports · Renews ${subscriptionEnd ? new Date(subscriptionEnd).toLocaleDateString() : "—"}`
                  : "1 scouting report per month · Upgrade for unlimited"}
              </p>
            </div>
            {!subscribed && (
              <Button variant="outline" size="sm" onClick={startCheckout} className="gap-1.5 shrink-0">
                $10/mo
              </Button>
            )}
          </div>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-border/50 card-gradient p-6 space-y-5"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-primary/10 p-3.5">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-display font-bold truncate">{user.team_number || "No Team"}</h2>
              <p className="text-sm text-muted-foreground truncate">
                {teamData?.team_name || (user.team_number ? "VEX Robotics Team" : "Browse-only account")}
              </p>
            </div>
          </div>
          <div className="grid gap-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium ml-auto truncate max-w-[200px]">{user.email || "—"}</span>
            </div>
            {user.team_number && (
              <div className="flex items-center gap-3 text-sm">
                <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Team</span>
                <span className="font-medium ml-auto">{user.team_number}</span>
              </div>
            )}
            {isLoading && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading team details...
              </div>
            )}
            {teamData?.location && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Location</span>
                <span className="font-medium ml-auto truncate max-w-[200px]">
                  {teamData.location.city}, {teamData.location.region}
                </span>
              </div>
            )}
            {teamData?.organization && (
              <div className="flex items-center gap-3 text-sm">
                <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">Organization</span>
                <span className="font-medium ml-auto truncate max-w-[200px]">{teamData.organization}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Team Members */}
        {user.team_number && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-border/50 card-gradient p-6 space-y-4"
          >
            <button
              type="button"
              onClick={() => setShowMembers(!showMembers)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold">Team Members</h3>
                  <p className="text-xs text-muted-foreground">
                    {approvedMembers.length} member{approvedMembers.length !== 1 ? "s" : ""} on this team
                  </p>
                </div>
              </div>
              {showMembers ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {isTeamOwner && pendingRequests.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[hsl(var(--chart-4))]">
                  {pendingRequests.length} Pending Request{pendingRequests.length !== 1 ? "s" : ""}
                </p>
                {pendingRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between bg-[hsl(var(--chart-4))]/5 border border-[hsl(var(--chart-4))]/20 rounded-lg px-4 py-2.5">
                    <span className="text-sm font-medium">{(req as any).email || req.user_id.slice(0, 8) + "..."}</span>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-[hsl(var(--success))]"
                        onClick={() => handleApproveRequest(req.id, req.team_number, req.user_id)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive"
                        onClick={() => handleRejectRequest(req.id)}>
                        <XIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showMembers && (
              <div className="space-y-1.5 border-t border-border/30 pt-3">
                {approvedMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between text-sm py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col min-w-0">
                      <span className={cn("truncate", member.user_id === user.id && "text-primary font-medium")}>
                        {member.user_id === user.id ? "You" : ((member as any).email || `Member ${member.user_id.slice(0, 8)}...`)}
                      </span>
                      {(member as any).email && member.user_id !== user.id && (
                        <span className="text-[11px] text-muted-foreground truncate">{(member as any).email}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-medium",
                        member.role === "owner" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {member.role === "owner" ? "Leader" : "Member"}
                      </span>
                      {isTeamOwner && member.user_id !== user.id && (
                        <div className="flex gap-1">
                          {member.role !== "owner" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] text-primary px-2"
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
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-destructive"
                            onClick={() => setRemoveMember({ id: member.id, email: (member as any).email })}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Join Team (no team) */}
        {!user.team_number && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-border/50 card-gradient p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Users className="h-4 w-4 text-primary" />
              </div>
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

        {/* Settings: Grade + Season */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-border/50 card-gradient p-6 space-y-5"
        >
          <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">Preferences</h3>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Grade Level</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {gradeLevel === "Both" ? "All Teams" : gradeLevel}
              </span>
            </div>
            <div className="flex gap-2">
              {GRADE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={gradeLevel === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGradeLevel(opt.value)}
                  className="text-xs flex-1"
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="border-t border-border/30" />
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Active Season</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {seasonInfo.name} ({seasonInfo.year})
              </span>
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
          </div>
        </motion.div>
      </div>

      {/* Remove Member Confirmation Dialog */}
      <Dialog open={!!removeMember} onOpenChange={() => setRemoveMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {removeMember?.email || "this member"} from the team? They will need to request to join again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveMember(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => removeMember && handleRemoveMember(removeMember.id)}>
              Remove Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}