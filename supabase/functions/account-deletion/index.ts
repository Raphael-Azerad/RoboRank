import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Account deletion endpoint.
 * Body: { action: "request" | "cancel" | "purge" }
 *
 * - "request": marks the caller's profile for deletion (sets deletion_requested_at = now()).
 *              Account + data remain for a 30-day grace window.
 * - "cancel" : clears deletion_requested_at, restoring the account.
 * - "purge"  : (service role only — no user JWT) hard-deletes any users whose
 *              deletion_requested_at is older than 30 days. Intended for cron.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json().catch(() => ({}));
    const action = body?.action as "request" | "cancel" | "purge" | undefined;

    if (action === "purge") {
      // Cron-style invocation. Hard-delete users past their 30-day window.
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: rows, error } = await admin
        .from("profiles")
        .select("id, deletion_requested_at")
        .lt("deletion_requested_at", cutoff)
        .not("deletion_requested_at", "is", null);
      if (error) throw error;

      const purged: string[] = [];
      for (const row of rows ?? []) {
        const { error: delErr } = await admin.auth.admin.deleteUser(row.id);
        if (!delErr) purged.push(row.id);
      }
      return new Response(JSON.stringify({ purged: purged.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // User actions require auth.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");
    const userId = userData.user.id;

    if (action === "request") {
      const { error } = await admin
        .from("profiles")
        .update({ deletion_requested_at: new Date().toISOString() })
        .eq("id", userId);
      if (error) throw error;
      return new Response(
        JSON.stringify({ ok: true, deletion_requested_at: new Date().toISOString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "cancel") {
      const { error } = await admin
        .from("profiles")
        .update({ deletion_requested_at: null })
        .eq("id", userId);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
