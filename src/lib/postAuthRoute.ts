import { supabase } from "@/integrations/supabase/client";

export async function getPostAuthRoute() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return "/login";
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership) {
    return "/dashboard";
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("followed_team")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.followed_team) {
    return "/dashboard";
  }

  const metadataTeam = String(user.user_metadata?.team_number || "").trim();
  const metadataFollowedTeam = String(user.user_metadata?.followed_team || "").trim();

  if (metadataTeam || metadataFollowedTeam) {
    return "/join-team";
  }

  return "/join-team";
}