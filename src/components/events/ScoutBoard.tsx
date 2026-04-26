/**
 * Shared scout board — team-wide collaborative observations on teams at an event.
 * Approved teammates can add/view/edit; realtime sync; admins can moderate.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  Plus,
  Loader2,
  Trash2,
  Pencil,
  Star,
  Users as UsersIcon,
  Wifi,
  Search,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type Category = "auto" | "teleop" | "defense" | "driver" | "notes";

const CATEGORIES: { value: Category | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "auto", label: "Auto" },
  { value: "teleop", label: "Teleop" },
  { value: "defense", label: "Defense" },
  { value: "driver", label: "Driver" },
  { value: "notes", label: "Notes" },
];

const CATEGORY_TINT: Record<Category, string> = {
  auto: "bg-[hsl(var(--chart-1))]/15 text-[hsl(var(--chart-1))]",
  teleop: "bg-[hsl(var(--chart-2))]/15 text-[hsl(var(--chart-2))]",
  defense: "bg-[hsl(var(--chart-3))]/15 text-[hsl(var(--chart-3))]",
  driver: "bg-[hsl(var(--chart-4))]/15 text-[hsl(var(--chart-4))]",
  notes: "bg-muted text-muted-foreground",
};

interface ScoutEntry {
  id: string;
  team_number: string;
  event_id: number;
  event_name: string | null;
  watched_team: string;
  category: Category;
  rating: number | null;
  body: string;
  author_id: string;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  eventId: number;
  eventName: string;
  /** Teams shown in the watched-team picker; should be teams in this event. */
  candidateTeams: { number: string; team_name?: string | null }[];
}

export function ScoutBoard({ eventId, eventName, candidateTeams }: Props) {
  const qc = useQueryClient();
  const [user, setUser] = useState<{
    id?: string;
    teamNumber?: string | null;
    displayName?: string | null;
  }>({});
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<Category | "all">("all");
  const [composeOpen, setComposeOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    watched_team: "",
    category: "notes" as Category,
    rating: null as number | null,
    body: "",
  });

  // Resolve current user + their team
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || cancelled) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("team_number, display_name")
        .eq("id", u.user.id)
        .maybeSingle();
      if (cancelled) return;
      setUser({
        id: u.user.id,
        teamNumber: p?.team_number || null,
        displayName: p?.display_name || u.user.email?.split("@")[0] || null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const myTeam = user.teamNumber;

  const { data: entries, isLoading } = useQuery({
    queryKey: ["scoutBoard", myTeam, eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scout_board_entries")
        .select("*")
        .eq("team_number", myTeam!)
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ScoutEntry[];
    },
    enabled: !!myTeam,
  });

  // Realtime: refetch on any change to this team's entries at this event
  useEffect(() => {
    if (!myTeam) return;
    const channel = supabase
      .channel(`scout_board:${myTeam}:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scout_board_entries",
          filter: `team_number=eq.${myTeam}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["scoutBoard", myTeam, eventId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [myTeam, eventId, qc]);

  const filtered = useMemo(() => {
    const list = entries || [];
    return list.filter((e) => {
      if (filterCategory !== "all" && e.category !== filterCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !e.watched_team.toLowerCase().includes(q) &&
          !e.body.toLowerCase().includes(q) &&
          !(e.author_name || "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [entries, filterCategory, search]);

  const resetDraft = () => {
    setDraft({ watched_team: "", category: "notes", rating: null, body: "" });
    setEditingId(null);
  };

  const startEdit = (e: ScoutEntry) => {
    setEditingId(e.id);
    setDraft({
      watched_team: e.watched_team,
      category: e.category,
      rating: e.rating,
      body: e.body,
    });
    setComposeOpen(true);
  };

  const submit = async () => {
    if (!user.id || !myTeam) return;
    if (!draft.watched_team.trim() || !draft.body.trim()) {
      toast.error("Pick a team and write something");
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from("scout_board_entries")
        .update({
          category: draft.category,
          rating: draft.rating,
          body: draft.body.trim(),
          watched_team: draft.watched_team.trim().toUpperCase(),
        })
        .eq("id", editingId);
      if (error) return toast.error(error.message);
      toast.success("Entry updated");
    } else {
      const { error } = await supabase.from("scout_board_entries").insert({
        team_number: myTeam,
        event_id: eventId,
        event_name: eventName,
        watched_team: draft.watched_team.trim().toUpperCase(),
        category: draft.category,
        rating: draft.rating,
        body: draft.body.trim(),
        author_id: user.id,
        author_name: user.displayName,
      });
      if (error) return toast.error(error.message);
      toast.success("Posted to scout board");
    }
    setComposeOpen(false);
    resetDraft();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("scout_board_entries").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
  };

  // ===== Render =====

  if (!myTeam) {
    return (
      <EmptyState
        icon={UsersIcon}
        title="Join a team to use the Scout Board"
        description="The scout board is shared with approved teammates. Add your team number on Profile to unlock it."
        action={
          <Button asChild variant="hero" size="sm">
            <Link to="/profile">Open Profile</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start sm:items-center gap-3 flex-col sm:flex-row sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" strokeWidth={1.75} />
            <h2 className="font-display text-lg font-bold">Scout Board</h2>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--success))] bg-[hsl(var(--success))]/15 px-2 py-0.5 rounded-full">
              <Wifi className="h-2.5 w-2.5" /> Live
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Shared with team {myTeam} · syncs in real time
          </p>
        </div>
        <Button
          variant="hero"
          size="sm"
          onClick={() => {
            resetDraft();
            setComposeOpen(true);
          }}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" /> Add observation
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by team, text, or author…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Tabs value={filterCategory} onValueChange={(v) => setFilterCategory(v as any)}>
          <TabsList className="h-9">
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c.value} value={c.value} className="text-xs px-2.5">
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={entries?.length ? "No matching entries" : "No observations yet"}
          description={
            entries?.length
              ? "Try clearing the search or category filter."
              : "Be the first to post. Quick observations now save your team time during alliance selection."
          }
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <AnimatePresence initial={false}>
            {filtered.map((e) => {
              const mine = e.author_id === user.id;
              return (
                <motion.div
                  key={e.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.18 }}
                  className="group rounded-xl border border-border/50 card-gradient p-3.5 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link
                        to={`/team/${e.watched_team}`}
                        className="font-display font-bold text-primary text-sm hover:underline tabular-nums"
                      >
                        {e.watched_team}
                      </Link>
                      <span
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded",
                          CATEGORY_TINT[e.category],
                        )}
                      >
                        {e.category}
                      </span>
                      {e.rating != null && (
                        <span className="flex items-center gap-0.5 text-[hsl(var(--chart-4))]">
                          {Array.from({ length: e.rating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-current" />
                          ))}
                        </span>
                      )}
                    </div>
                    {mine && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => startEdit(e)}
                          aria-label="Edit"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 hover:text-destructive"
                          onClick={() => remove(e.id)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{e.body}</p>
                  <div className="flex items-center justify-between mt-2 text-[11px] text-muted-foreground">
                    <span className="truncate">
                      {e.author_name || "Teammate"}
                      {mine && <span className="ml-1 text-primary/80">· you</span>}
                    </span>
                    <span className="tabular-nums shrink-0">
                      {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Compose */}
      <AnimatePresence>
        {composeOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setComposeOpen(false)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-border/60 card-gradient overflow-hidden"
            >
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-base">
                    {editingId ? "Edit observation" : "New observation"}
                  </h3>
                  <button
                    onClick={() => setComposeOpen(false)}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Team picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Team
                  </label>
                  <Input
                    list="scout-board-teams"
                    placeholder="e.g. 12345A"
                    value={draft.watched_team}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, watched_team: e.target.value.toUpperCase() }))
                    }
                    className="h-9 text-sm uppercase"
                  />
                  <datalist id="scout-board-teams">
                    {candidateTeams.slice(0, 200).map((t) => (
                      <option key={t.number} value={t.number}>
                        {t.team_name || ""}
                      </option>
                    ))}
                  </datalist>
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Category
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(["auto", "teleop", "defense", "driver", "notes"] as Category[]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, category: c }))}
                        className={cn(
                          "text-xs px-2.5 py-1 rounded-md border transition-colors capitalize",
                          draft.category === c
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border/50 text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rating */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Rating <span className="text-muted-foreground/60 normal-case">(optional)</span>
                  </label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({ ...d, rating: d.rating === n ? null : n }))
                        }
                        aria-label={`Rate ${n}`}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={cn(
                            "h-5 w-5",
                            (draft.rating ?? 0) >= n
                              ? "fill-[hsl(var(--chart-4))] text-[hsl(var(--chart-4))]"
                              : "text-muted-foreground/40",
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Body */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Observation
                  </label>
                  <Textarea
                    rows={4}
                    placeholder="e.g. Strong autonomous, bot tipped during defense in Q12."
                    value={draft.body}
                    onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                    autoFocus
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="ghost" size="sm" onClick={() => setComposeOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="hero" size="sm" onClick={submit} className="gap-1.5">
                    <Save className="h-3.5 w-3.5" /> {editingId ? "Save" : "Post"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
