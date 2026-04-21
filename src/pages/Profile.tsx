import { useEffect, useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { getTeamByNumber, SEASONS, SEASON_LIST } from "@/lib/robotevents";
import { useSeason, type GradeLevel } from "@/contexts/SeasonContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { User, Mail, Hash, MapPin, Building, Loader2, Calendar, GraduationCap, Users, Check, X as XIcon, Clock, Crown, ChevronDown, ChevronUp, Trash2, Shield, Key, LogOut, Camera, CreditCard, Eye, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { validateTeamNumber } from "@/lib/robotevents";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { AlliancesTab } from "@/components/profile/AlliancesTab";

const GRADE_OPTIONS: { value: GradeLevel; label: string }[] = [
  { value: "Both", label: "All Teams" },
  { value: "High School", label: "High School" },
  { value: "Middle School", label: "Middle School" },
];

function getInitials(teamNumber?: string | null, email?: string) {
  if (teamNumber) return teamNumber.slice(0, 3).toUpperCase();
  if (email) return email[0].toUpperCase();
  return "?";
}

function getAvatarColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 45%)`;
}

export default function Profile() {
  const { season, setSeason, gradeLevel, setGradeLevel } = useSeason();
  
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id?: string; email?: string; team_number?: string | null }>({});
  const [joinTeamNumber, setJoinTeamNumber] = useState("");
  const [joiningTeam, setJoiningTeam] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [removeMember, setRemoveMember] = useState<{ id: string; email: string | null } | null>(null);

  // Display name
  const [displayName, setDisplayName] = useState("");
  const [savedDisplayName, setSavedDisplayName] = useState("");
  const [savingDisplayName, setSavingDisplayName] = useState(false);

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Role switching
  const [viewMode, setViewMode] = useState<"team_member" | "viewer">("team_member");
  const [showSwitchWarning, setShowSwitchWarning] = useState(false);

  // Logo upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data: authData } = await supabase.auth.getUser();
      const u = authData.user;
      if (!u) return;

      // Get team from team_members (source of truth)
      const { data: membership } = await supabase
        .from("team_members")
        .select("team_number")
        .eq("user_id", u.id)
        .eq("status", "approved")
        .limit(1)
        .maybeSingle();

      // Get followed team, view_mode, display_name from profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("followed_team, view_mode, display_name")
        .eq("id", u.id)
        .maybeSingle();

      const resolvedTeam = membership?.team_number || u.user_metadata?.team_number || profile?.followed_team || null;

      setUser({
        id: u.id,
        email: u.email,
        team_number: resolvedTeam,
      });

      setViewMode(((profile as any)?.view_mode as "team_member" | "viewer") || "team_member");
      const initialName = ((profile as any)?.display_name as string) || "";
      setDisplayName(initialName);
      setSavedDisplayName(initialName);

      // Load logo
      const { data: files } = supabase.storage.from("team-logos").getPublicUrl(`${u.id}/logo`);
      fetch(files.publicUrl, { method: "HEAD" }).then(res => {
        if (res.ok) setLogoUrl(files.publicUrl + "?t=" + Date.now());
      }).catch(() => {});
    }
    loadUser();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user.id) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    setUploadingLogo(true);
    const { error } = await supabase.storage.from("team-logos").upload(`${user.id}/logo`, file, { upsert: true });
    if (error) {
      toast.error("Upload failed: " + error.message);
    } else {
      const { data } = supabase.storage.from("team-logos").getPublicUrl(`${user.id}/logo`);
      setLogoUrl(data.publicUrl + "?t=" + Date.now());
      toast.success("Logo updated!");
    }
    setUploadingLogo(false);
  };

  const { data: teamData, isLoading } = useQuery({
    queryKey: ["teamProfile", user.team_number],
    queryFn: () => getTeamByNumber(user.team_number!),
    enabled: !!user.team_number,
  });

  const { data: teamMembers, refetch: refetchMembers } = useQuery({
    queryKey: ["teamMembers", user.team_number, user.id],
    queryFn: async () => {
      if (!user.team_number || !user.id) return [];
      const { data: members } = await supabase.from("team_members")
        .select("*")
        .eq("team_number", user.team_number);
      if (!members || members.length === 0) return [];
      const allUserIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase.from("profiles")
        .select("id, email, display_name")
        .in("id", allUserIds);
      const profileMap = new Map((profiles || []).map(p => [p.id, p as any]));
      return members.map(m => {
        const p = profileMap.get(m.user_id);
        return { ...m, email: p?.email || null, display_name: p?.display_name || null };
      });
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

  const handleSaveDisplayName = async () => {
    if (!user.id) return;
    const trimmed = displayName.trim();
    if (trimmed.length > 60) {
      toast.error("Display name must be 60 characters or fewer");
      return;
    }
    setSavingDisplayName(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed || null } as any)
      .eq("id", user.id);
    setSavingDisplayName(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSavedDisplayName(trimmed);
      toast.success(trimmed ? "Display name updated" : "Display name cleared");
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  const handleSwitchRole = async (mode: "team_member" | "viewer") => {
    if (!user.id) return;
    await applyRoleSwitch(mode);
  };

  const applyRoleSwitch = async (mode: "team_member" | "viewer") => {
    if (!user.id) return;
    setViewMode(mode);
    setShowSwitchWarning(false);
    await supabase.from("profiles").update({ view_mode: mode } as any).eq("id", user.id);
    toast.success(mode === "viewer" ? "Switched to Viewer mode" : "Switched to Team Member mode");
    // Reload page to reflect changes across the app
    window.location.reload();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
    navigate("/");
  };

  const seasonInfo = SEASONS[season];
  const avatarStr = user.team_number || user.email || "?";

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border/50 card-gradient p-6"
        >
          <div className="flex items-center gap-5">
            <div className="relative group">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Team logo"
                  className="w-16 h-16 rounded-2xl object-cover shrink-0"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-display font-bold text-primary-foreground shrink-0"
                  style={{ background: getAvatarColor(avatarStr) }}
                >
                  {getInitials(user.team_number, user.email)}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-2xl bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                {uploadingLogo ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-display font-bold truncate">
                {savedDisplayName || user.team_number || "Welcome"}
              </h1>
              <p className="text-sm text-muted-foreground truncate">
                {savedDisplayName && user.team_number
                  ? `Team ${user.team_number}${teamData?.team_name ? ` · ${teamData.team_name}` : ""}`
                  : teamData?.team_name || (user.team_number ? "VEX Robotics Team" : "Browse-only account")}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
            </div>
            <div className="shrink-0 flex flex-col gap-1.5 items-end">
              <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider bg-primary/15 text-primary">
                Full Access
              </span>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="account" className="w-full">
          <TabsList className="w-full grid grid-cols-4 bg-muted/50">
            <TabsTrigger value="account" className="gap-1.5 text-xs"><User className="h-3.5 w-3.5" /> Account</TabsTrigger>
            <TabsTrigger value="team" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" /> Team</TabsTrigger>
            <TabsTrigger value="alliances" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" /> Alliances</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 text-xs"><GraduationCap className="h-3.5 w-3.5" /> Settings</TabsTrigger>
          </TabsList>

          {/* ACCOUNT TAB */}
          <TabsContent value="account" className="space-y-4 mt-4">
            {/* Display Name */}
            <div className="rounded-xl border border-border/50 card-gradient p-5 space-y-3">
              <div>
                <h3 className="text-sm font-display font-semibold uppercase tracking-wider text-muted-foreground">Display Name</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Shown to teammates instead of your email. Leave blank to fall back to your email.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex M."
                  maxLength={60}
                  className="bg-card"
                />
                <Button
                  size="sm"
                  onClick={handleSaveDisplayName}
                  disabled={savingDisplayName || displayName.trim() === savedDisplayName.trim()}
                  className="gap-1.5 sm:w-auto"
                >
                  {savingDisplayName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Save
                </Button>
              </div>
            </div>

            {/* Profile Info */}
            <div className="rounded-xl border border-border/50 card-gradient p-5 space-y-4">
              <h3 className="text-sm font-display font-semibold uppercase tracking-wider text-muted-foreground">Profile Info</h3>
              <div className="grid gap-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium ml-auto truncate max-w-[250px]">{user.email || "-"}</span>
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
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading...
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
            </div>

            {/* Plan — RoboRank is free for everyone */}
            <div className="rounded-xl border border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-full p-2.5 bg-primary/15">
                  <Crown className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold">All Features Unlocked</h3>
                  <p className="text-xs text-muted-foreground">
                    RoboRank is currently free for everyone — every feature, no limits.
                  </p>
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="rounded-xl border border-border/50 card-gradient p-5 space-y-4">
              <h3 className="text-sm font-display font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Security
              </h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-xs">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-xs">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-card"
                  />
                </div>
                <Button
                  size="sm"
                  disabled={changingPassword || !newPassword || !confirmPassword}
                  onClick={handleChangePassword}
                  className="gap-1.5"
                >
                  {changingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
                  Update Password
                </Button>
              </div>
              <div className="border-t border-border/30 pt-4">
                <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={handleLogout}>
                  <LogOut className="h-3.5 w-3.5" /> Sign Out
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* TEAM TAB */}
          <TabsContent value="team" className="space-y-4 mt-4">
            {/* Role Switch */}
            <div className="rounded-xl border border-border/50 card-gradient p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <ArrowRightLeft className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-sm">Active Role</h3>
                  <p className="text-xs text-muted-foreground">
                    {viewMode === "team_member" ? "Team Member — full access to scouting & notes" : "Viewer — stats, rankings & schedules only"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSwitchRole("team_member")}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all text-center",
                    viewMode === "team_member"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/50 hover:border-primary/30"
                  )}
                >
                  <Users className={cn("h-4 w-4", viewMode === "team_member" ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-xs font-semibold">Team Member</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchRole("viewer")}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all text-center",
                    viewMode === "viewer"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/50 hover:border-primary/30"
                  )}
                >
                  <Eye className={cn("h-4 w-4", viewMode === "viewer" ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-xs font-semibold">Viewer</span>
                </button>
              </div>
            </div>

            {user.team_number ? (
              <div className="rounded-xl border border-border/50 card-gradient p-5 space-y-4">
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
                        {approvedMembers.length} member{approvedMembers.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  {showMembers ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                {isTeamOwner && pendingRequests.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-[hsl(var(--chart-4))]">
                      {pendingRequests.length} Pending Request{pendingRequests.length !== 1 ? "s" : ""}
                    </p>
                    {pendingRequests.map((req) => (
                      <div key={req.id} className="flex items-center justify-between bg-[hsl(var(--chart-4))]/5 border border-[hsl(var(--chart-4))]/20 rounded-lg px-4 py-2.5">
                        <span className="text-sm font-medium">{(req as any).display_name || (req as any).email || req.user_id.slice(0, 8) + "..."}</span>
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
                    {approvedMembers.map((member) => {
                      const memberName = (member as any).display_name || (member as any).email || null;
                      const memberInitial = (memberName || "?")[0].toUpperCase();
                      return (
                      <div key={member.id} className="flex items-center justify-between text-sm py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0"
                            style={{ background: getAvatarColor(memberName || member.user_id) }}
                          >
                            {memberInitial}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className={cn("truncate", member.user_id === user.id && "text-primary font-medium")}>
                              {member.user_id === user.id ? "You" : (memberName || `Member ${member.user_id.slice(0, 8)}...`)}
                            </span>
                            {(member as any).display_name && (member as any).email && member.user_id !== user.id && (
                              <span className="text-[10px] text-muted-foreground truncate">{(member as any).email}</span>
                            )}
                          </div>
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
                                  size="sm" variant="ghost" className="h-6 text-[10px] text-primary px-2"
                                  onClick={async () => {
                                    // Transfer leadership: demote self, promote target
                                    const { error: demoteErr } = await supabase.from("team_members").update({ role: "member" }).eq("user_id", user.id!).eq("team_number", user.team_number!);
                                    if (demoteErr) { toast.error(demoteErr.message); return; }
                                    const { error: promoteErr } = await supabase.from("team_members").update({ role: "owner" }).eq("id", member.id);
                                    if (promoteErr) { toast.error(promoteErr.message); return; }
                                    toast.success("Leadership transferred!");
                                    queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
                                  }}
                                >
                                  Transfer Leader
                                </Button>
                              )}
                              <Button
                                size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive"
                                onClick={() => setRemoveMember({ id: member.id, email: (member as any).email })}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border/50 card-gradient p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold">Join a Team</h3>
                    <p className="text-xs text-muted-foreground">Request to join an existing team</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Team number (e.g. 1234A)"
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
                        <span className="text-xs text-muted-foreground">- Awaiting approval</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ALLIANCES TAB */}
          <TabsContent value="alliances" className="space-y-4 mt-4">
            <AlliancesTab teamNumber={user.team_number || null} />
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="space-y-4 mt-4">
            <div className="rounded-xl border border-border/50 card-gradient p-5 space-y-5">
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
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Remove Member Dialog */}
      <Dialog open={!!removeMember} onOpenChange={() => setRemoveMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {removeMember?.email || "this member"} from the team?
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

      {/* Role Switch Warning Dialog */}
      <Dialog open={showSwitchWarning} onOpenChange={setShowSwitchWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Switch to Viewer Mode?
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <p>You are currently the premium subscriber for your team. Switching to Viewer mode means:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Your team will <strong>lose premium access</strong> to scouting reports</li>
                <li>You'll only see stats, rankings, and schedules</li>
                <li>You can switch back to Team Member at any time to restore access</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSwitchWarning(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => applyRoleSwitch("viewer")}>
              Switch to Viewer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
