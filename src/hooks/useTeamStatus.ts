import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TeamStatus = "loading" | "no-team" | "pending" | "approved";

export function useTeamStatus() {
  const [status, setStatus] = useState<TeamStatus>("loading");
  const [teamNumber, setTeamNumber] = useState<string | null>(null);
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

      // Always check team_members table (single source of truth)
      const { data: membership } = await supabase
        .from("team_members")
        .select("team_number, status, role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (!membership) {
        setStatus("no-team");
        return;
      }

      setTeamNumber(membership.team_number);
      setRole(membership.role);
      setStatus(membership.status === "approved" ? "approved" : "pending");
      return;

      setTeamNumber(tn);

      // Check team_members for approval status
      const { data: membership } = await supabase
        .from("team_members")
        .select("status, role")
        .eq("user_id", user.id)
        .eq("team_number", tn)
        .maybeSingle();

      if (cancelled) return;

      if (!membership) {
        setStatus("no-team");
        return;
      }

      setRole(membership.role);
      setStatus(membership.status === "approved" ? "approved" : "pending");
    }

    check();
    return () => { cancelled = true; };
  }, []);

  return { status, teamNumber, userId, role };
}
