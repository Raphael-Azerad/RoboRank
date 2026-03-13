import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // 0. Check if the user's team is permanently premium
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("team_number")
      .eq("id", user.id)
      .single();

    const PERMANENT_PREMIUM_TEAMS = ["17505B", "76426M"];
    if (profile?.team_number && PERMANENT_PREMIUM_TEAMS.includes(profile.team_number.toUpperCase())) {
      return new Response(JSON.stringify({
        subscribed: true,
        subscription_end: null,
        source: "permanent",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Also check via team_members table
    const { data: membership } = await supabaseClient
      .from("team_members")
      .select("team_number")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .limit(1)
      .single();

    if (membership?.team_number && PERMANENT_PREMIUM_TEAMS.includes(membership.team_number.toUpperCase())) {
      return new Response(JSON.stringify({
        subscribed: true,
        subscription_end: null,
        source: "permanent",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 1. Check if the user themselves has an active subscription
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });
      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        return new Response(JSON.stringify({
          subscribed: true,
          subscription_end: new Date(subscription.current_period_end * 1000).toISOString(),
          source: "personal",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // 2. Check if any teammate has an active subscription (team-wide premium)
    // Find user's team
    const { data: teamMembership } = await supabaseClient
      .from("team_members")
      .select("team_number")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .limit(1)
      .single();

    if (teamMembership?.team_number) {
      // Get all approved teammates
      const { data: teammates } = await supabaseClient
        .from("team_members")
        .select("user_id")
        .eq("team_number", teamMembership.team_number)
        .eq("status", "approved")
        .neq("user_id", user.id);

      if (teammates && teammates.length > 0) {
        // Get teammate emails from profiles
        const teammateIds = teammates.map(t => t.user_id);
        const { data: profiles } = await supabaseClient
          .from("profiles")
          .select("email")
          .in("id", teammateIds);

        if (profiles) {
          for (const profile of profiles) {
            if (!profile.email) continue;
            const tmCustomers = await stripe.customers.list({ email: profile.email, limit: 1 });
            if (tmCustomers.data.length > 0) {
              const tmSubs = await stripe.subscriptions.list({
                customer: tmCustomers.data[0].id,
                status: "active",
                limit: 1,
              });
              if (tmSubs.data.length > 0) {
                const sub = tmSubs.data[0];
                return new Response(JSON.stringify({
                  subscribed: true,
                  subscription_end: new Date(sub.current_period_end * 1000).toISOString(),
                  source: "team",
                }), {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                  status: 200,
                });
              }
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ subscribed: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});