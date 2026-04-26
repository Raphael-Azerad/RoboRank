/**
 * Personal pins — a user can star events, teams, or arbitrary views.
 * Pins are private (RLS), synced realtime across devices.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PinKind = "event" | "team" | "view";

export interface Pin {
  id: string;
  user_id: string;
  kind: PinKind;
  ref: string;
  label: string;
  sublabel: string | null;
  route: string;
  icon: string | null;
  position: number;
  created_at: string;
}

export interface PinInput {
  kind: PinKind;
  ref: string;
  label: string;
  sublabel?: string | null;
  route: string;
  icon?: string | null;
}

export function usePins() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Resolve current user
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUserId(data.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) { setPins([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("user_pins")
      .select("*")
      .eq("user_id", userId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });
    if (!error && data) setPins(data as Pin[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime sync (other tabs / devices)
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`user_pins:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_pins", filter: `user_id=eq.${userId}` },
        () => { refresh(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, refresh]);

  const isPinned = useCallback(
    (kind: PinKind, ref: string) => pins.some(p => p.kind === kind && p.ref === ref),
    [pins],
  );

  const togglePin = useCallback(async (input: PinInput) => {
    if (!userId) {
      toast.error("Sign in to pin items");
      return false;
    }
    const existing = pins.find(p => p.kind === input.kind && p.ref === input.ref);
    if (existing) {
      const { error } = await supabase.from("user_pins").delete().eq("id", existing.id);
      if (error) { toast.error("Couldn't unpin"); return false; }
      toast.success("Unpinned");
      return false;
    }
    const { error } = await supabase.from("user_pins").insert({
      user_id: userId,
      kind: input.kind,
      ref: input.ref,
      label: input.label,
      sublabel: input.sublabel ?? null,
      route: input.route,
      icon: input.icon ?? null,
      position: pins.length,
    });
    if (error) { toast.error("Couldn't pin"); return false; }
    toast.success(`Pinned "${input.label}"`);
    return true;
  }, [userId, pins]);

  const removePin = useCallback(async (id: string) => {
    const { error } = await supabase.from("user_pins").delete().eq("id", id);
    if (error) toast.error("Couldn't remove pin");
  }, []);

  return { pins, isPinned, togglePin, removePin, loading, signedIn: !!userId };
}
