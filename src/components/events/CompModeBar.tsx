import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Radio,
  Users,
  StickyNote,
  Swords,
  Plus,
  X,
  Loader2,
  Search,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getTeamByNumber, getTeamMatches } from "@/lib/robotevents";
import { useSeason } from "@/contexts/SeasonContext";

interface CompModeBarProps {
  eventId: number;
  eventName: string;
  divisionTeamStats: any[]; // teams with roboRank in current division
  currentDivisionLabel: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Comp Mode panel for an event. Filters to teams actually in your division,
 * surfaces alliance candidates ranked by RoboRank, flags prior partners,
 * and gives a fast inline note-taking flow tied to team_notes.
 */
export function CompModeBar({
  eventId,
  eventName,
  divisionTeamStats,
  currentDivisionLabel,
  open,
  onClose,
}: CompModeBarProps) {
  const queryClient = useQueryClient();
  const { season } = useSeason();
  const [user, setUser] = useState<{ id?: string; team_number?: string | null }>({});
  const [search, setSearch] = useState("");
  const [noteTeam, setNoteTeam] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"picker" | "notes">("picker");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: p } = await supabase
        .from("profiles")
        .select("team_number")
        .eq("id", u.user.id)
        .single();
      setUser({ id: u.user.id, team_number: p?.team_number || null });
    })();
  }, []);

  const myTeamNumber = user.team_number || null;

  // My team's prior alliance partners (for the "we've allianced before" badge)
  const { data: myTeamData } = useQuery({
    queryKey: ["compModeMyTeam", myTeamNumber],
    queryFn: () => getTeamByNumber(myTeamNumber!),
    enabled: !!myTeamNumber && open,
  });

  const { data: myMatches } = useQuery({
    queryKey: ["compModeMyMatches", myTeamData?.id, season],
    queryFn: () => getTeamMatches(myTeamData!.id, season),
    enabled: !!myTeamData?.id && open,
  });

  const priorPartners = useMemo(() => {
    const set = new Set<string>();
    if (!myMatches || !myTeamNumber) return set;
    myMatches.forEach((m: any) => {
      const myAlliance = m.alliances?.find((a: any) =>
        a.teams?.some((t: any) => t.team?.name === myTeamNumber)
      );
      myAlliance?.teams?.forEach((t: any) => {
        if (t.team?.name && t.team.name !== myTeamNumber) set.add(t.team.name);
      });
    });
    return set;
  }, [myMatches, myTeamNumber]);

  // Existing notes on teams in this division
  const teamNumbersInDivision = useMemo(() => {
    return (divisionTeamStats || []).map((t: any) => t.number).filter(Boolean);
  }, [divisionTeamStats]);

  const { data: notes } = useQuery({
    queryKey: ["compModeNotes", myTeamNumber, eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_notes")
        .select("*")
        .eq("team_number", myTeamNumber!)
        .not("tagged_team", "is", null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!myTeamNumber && open,
  });

  const notesByTeam = useMemo(() => {
    const map = new Map<string, any[]>();
    (notes || []).forEach((n: any) => {
      if (!n.tagged_team) return;
      if (!map.has(n.tagged_team)) map.set(n.tagged_team, []);
      map.get(n.tagged_team)!.push(n);
    });
    return map;
  }, [notes]);

  // Alliance picker: teams in division, sorted by RoboRank, excluding my team
  const candidates = useMemo(() => {
    return (divisionTeamStats || [])
      .filter((t: any) => t.number !== myTeamNumber)
      .filter((t: any) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          t.number?.toLowerCase().includes(q) ||
          t.team_name?.toLowerCase().includes(q)
        );
      })
      .sort((a: any, b: any) => (b.roboRank || 0) - (a.roboRank || 0));
  }, [divisionTeamStats, myTeamNumber, search]);

  const openNoteEditor = (team: string) => {
    setNoteTeam(team);
    const mine = notesByTeam.get(team)?.find((n: any) => n.user_id === user.id);
    if (mine) {
      setNoteId(mine.id);
      setNoteText(mine.content);
    } else {
      setNoteId(null);
      setNoteText("");
    }
  };

  const saveNote = async () => {
    if (!user.id || !myTeamNumber || !noteTeam) return;
    if (noteId) {
      const { error } = await supabase
        .from("team_notes")
        .update({ content: noteText, updated_at: new Date().toISOString() })
        .eq("id", noteId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("team_notes").insert({
        user_id: user.id,
        team_number: myTeamNumber,
        tagged_team: noteTeam,
        title: `Notes on ${noteTeam} @ ${eventName}`,
        content: noteText,
        category: "strategy",
      });
      if (error) return toast.error(error.message);
    }
    toast.success("Note saved");
    setNoteTeam(null);
    setNoteId(null);
    setNoteText("");
    queryClient.invalidateQueries({ queryKey: ["compModeNotes"] });
    queryClient.invalidateQueries({ queryKey: ["allianceTeamNotes"] });
  };

  const addToWatchlist = async (team: string) => {
    if (!user.id || !myTeamNumber) return;
    const { error } = await supabase.from("alliance_watchlist").insert({
      user_id: user.id,
      team_number: myTeamNumber,
      watched_team: team,
      event_id: eventId,
      event_name: eventName,
    });
    if (error) {
      if (error.code === "23505") {
        toast.info(`${team} is already on your watchlist`);
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success(`Added ${team} to watchlist`);
    queryClient.invalidateQueries({ queryKey: ["allianceWatchlist"] });
  };

  if (!open) return null;

  if (!myTeamNumber) {
    return (
      <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 text-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary" />
          <span>Join a team to use Comp Mode.</span>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-card/50">
          <div className="relative">
            <Radio className="h-4 w-4 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Comp Mode
          </span>
          <span className="text-xs text-muted-foreground truncate">
            · {currentDivisionLabel} · Team {myTeamNumber}
          </span>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="ml-auto h-7 w-7"
            aria-label="Close Comp Mode"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <div className="px-4 pt-3">
            <TabsList className="grid grid-cols-2 w-full max-w-xs">
              <TabsTrigger value="picker" className="gap-1.5 text-xs">
                <Users className="h-3.5 w-3.5" /> Alliance picker
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-1.5 text-xs">
                <StickyNote className="h-3.5 w-3.5" /> Quick scout
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Alliance picker */}
          <TabsContent value="picker" className="px-4 pb-4 pt-2 space-y-3 mt-0">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search teams in this division…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Link to="/predictor">
                <Button variant="outline" size="sm" className="gap-1.5 h-9">
                  <Swords className="h-3.5 w-3.5" /> Predictor
                </Button>
              </Link>
            </div>

            {candidates.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                {divisionTeamStats?.length === 0
                  ? "Loading division team RoboRanks..."
                  : "No matching teams."}
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-border/20 rounded-lg border border-border/30 bg-card/30">
                {candidates.slice(0, 50).map((t: any) => {
                  const noteCount = notesByTeam.get(t.number)?.length || 0;
                  const wasPartner = priorPartners.has(t.number);
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-accent/30 transition-colors"
                    >
                      <Link
                        to={`/team/${t.number}`}
                        className="text-sm font-display font-bold text-primary hover:underline w-16 shrink-0"
                      >
                        {t.number}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs truncate">{t.team_name || ""}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={cn(
                              "text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded",
                              (t.roboRank || 0) >= 75
                                ? "bg-[hsl(var(--success))]/15 text-[hsl(var(--success))]"
                                : (t.roboRank || 0) >= 50
                                ? "bg-primary/15 text-primary"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            RR {t.roboRank || 0}
                          </span>
                          {wasPartner && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--chart-4))]/15 text-[hsl(var(--chart-4))] flex items-center gap-1">
                              <Star className="h-2.5 w-2.5 fill-current" /> Past partner
                            </span>
                          )}
                          {t.record && (
                            <span className="text-[10px] text-muted-foreground">
                              {t.record.wins}-{t.record.losses}-{t.record.ties}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openNoteEditor(t.number)}
                        className="h-7 w-7 relative"
                        title="Quick note"
                      >
                        <StickyNote className="h-3.5 w-3.5" />
                        {noteCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center">
                            {noteCount}
                          </span>
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => addToWatchlist(t.number)}
                        className="h-7 w-7"
                        title="Add to watchlist"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Quick scout — list teams with notes */}
          <TabsContent value="notes" className="px-4 pb-4 pt-2 space-y-3 mt-0">
            <p className="text-xs text-muted-foreground">
              Teams in this division you've already taken notes on. Tap to edit.
            </p>
            {(() => {
              const noted = (divisionTeamStats || []).filter((t: any) =>
                notesByTeam.has(t.number)
              );
              if (noted.length === 0) {
                return (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    No notes yet for teams in this division.
                  </div>
                );
              }
              return (
                <div className="max-h-80 overflow-y-auto divide-y divide-border/20 rounded-lg border border-border/30 bg-card/30">
                  {noted.map((t: any) => {
                    const teamNotes = notesByTeam.get(t.number) || [];
                    return (
                      <button
                        key={t.id}
                        onClick={() => openNoteEditor(t.number)}
                        className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-accent/30 transition-colors"
                      >
                        <span className="text-sm font-display font-bold text-primary w-16 shrink-0">
                          {t.number}
                        </span>
                        <span className="flex-1 min-w-0 text-xs text-muted-foreground truncate">
                          {teamNotes[0]?.content || "—"}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {teamNotes.length} note{teamNotes.length !== 1 ? "s" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>
      </div>

      {/* Note editor */}
      <Dialog open={!!noteTeam} onOpenChange={(o) => !o && setNoteTeam(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Note on team {noteTeam}</DialogTitle>
            <DialogDescription>
              Saved to your shared team notes — visible everywhere.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="e.g. Strong autonomous, weak defense…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={5}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteTeam(null)}>
              Cancel
            </Button>
            <Button onClick={saveNote} disabled={!noteText.trim()}>
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
