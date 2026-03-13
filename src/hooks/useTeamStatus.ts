import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TeamStatus = "loading" | "no-team" | "pending" | "approved" | "follower";

export function useTeamStatus() {
  const [status, setStatus] = useState<TeamStatus>("loading");
  const [teamNumber, setTeamNumber] = useState<string | null>(null);
  const [followedTeam, setFollowedTeam] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setStatus("no-team");
        return;
      }

      setUserId(user.id);

      // Check team_members for actual membership
      const { data: membership, error: membershipError } = await supabase
        .from("team_members")
        .select("team_number, status, role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (membershipError) {
        // Fall through to check follower status
      }

      let resolvedMembership = membership;

      // Safety net: if profile metadata has a team but membership row is missing,
      // create it now (covers post-email-verification and older accounts).
      if (!resolvedMembership) {
        const metaTeam = String(user.user_metadata?.team_number || "").trim().toUpperCase();
        if (metaTeam) {
          const { data: createdMembership, error: createError } = await supabase
            .from("team_members")
            .insert({ team_number: metaTeam, user_id: user.id })
            .select("team_number, status, role")
            .single();

          if (!createError && createdMembership) {
            resolvedMembership = createdMembership;
          } else if (createError?.code === "23505") {
            const { data: existingMembership } = await supabase
              .from("team_members")
              .select("team_number, status, role")
              .eq("user_id", user.id)
              .limit(1)
              .maybeSingle();
            resolvedMembership = existingMembership;
          }
        }
      }

      if (cancelled) return;

      if (resolvedMembership) {
        setTeamNumber(resolvedMembership.team_number);
        setRole(resolvedMembership.role);
        setStatus(resolvedMembership.status === "approved" ? "approved" : "pending");
        return;
      }

      // Check if user is a follower (has followed_team in profile)
      const { data: profile } = await supabase
        .from("profiles")
        .select("followed_team")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profile?.followed_team) {
        setFollowedTeam(profile.followed_team);
        setTeamNumber(profile.followed_team);
        setRole(null);
        setStatus("follower");
        return;
      }

      setTeamNumber(null);
      setRole(null);
      setStatus("no-team");
    }

    check();
    return () => { cancelled = true; };
  }, []);

  return { status, teamNumber, followedTeam, userId, role };
}
