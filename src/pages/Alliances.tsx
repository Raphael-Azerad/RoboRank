import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Users, Loader2, Trophy, Plus, Trash2, Eye, EyeOff, StickyNote, Search, Calendar, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSeason } from "@/contexts/SeasonContext";
import { getTeamByNumber, getTeamMatches, SEASONS, SEASON_LIST, type SeasonKey } from "@/lib/robotevents";
import { EmptyState } from "@/components/ui/empty-state";

interface AllianceEntry {
  eventName: string;
  eventId?: number;
  matchName: string;
  partner: string; // single partner per row (flattened)
  result: "win" | "loss" | "tie";
  myScore: number;
  oppScore: number;
  round: "Qualification" | "Elimination";
}

interface PartnerAggregate {
  team: string;
  matches: number;
  wins: number;
  losses: number;
  ties: number;
  events: Set<string>;
  lastPlayed: string;
}

function extractAlliances(matches: any[], teamNumber: string): AllianceEntry[] {
  const entries: AllianceEntry[] = [];
  matches.forEach((m: any) => {
    const myAlliance = m.alliances?.find((a: any) =>
      a.teams?.some((t: any) => t.team?.name === teamNumber)
    );
    const oppAlliance = m.alliances?.find((a: any) => a.color !== myAlliance?.color);
    if (!myAlliance || !oppAlliance) return;
    const partners = myAlliance.teams
      ?.filter((t: any) => t.team?.name && t.team.name !== teamNumber)
      .map((t: any) => t.team.name) || [];
    if (partners.length === 0) return;
    const myScore = myAlliance.score ?? 0;
    const oppScore = oppAlliance.score ?? 0;
    const result: "win" | "loss" | "tie" =
      myScore > oppScore ? "win" : myScore < oppScore ? "loss" : "tie";
    const roundName = m.round === 2 ? "Qualification" : m.round >= 3 ? "Elimination" : "Practice";
    if (roundName === "Practice") return;
    partners.forEach((p: string) => {
      entries.push({
        eventName: m.event?.name || "Unknown Event",
        eventId: m.event?.id,
        matchName: m.name || `Match ${m.matchnum}`,
        partner: p,
        result,
        myScore,
        oppScore,
        round: roundName as "Qualification" | "Elimination",
      });
    });
  });
  return entries;
}

export default function Alliances() {
  const queryClient = useQueryClient();
  const { season } = useSeason();
  const [filterSeason, setFilterSeason] = useState<SeasonKey>(season);
  const [user, setUser] = useState<{ id?: string; team_number?: string | null }>({});
  const [hiddenPartners, setHiddenPartners] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newWatchTeam, setNewWatchTeam] = useState("");
  const [newWatchNotes, setNewWatchNotes] = useState("");
  const [noteEditId, setNoteEditId] = useState<string | null>(null);
  const [noteEditText, setNoteEditText] = useState("");
  const [noteEditTeam, setNoteEditTeam] = useState("");

  // Load user + team
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
      // Load hidden partner pref
      try {
        const stored = localStorage.getItem(`alliances-hidden-${u.user.id}`);
        if (stored) setHiddenPartners(new Set(JSON.parse(stored)));
      } catch {}
    })();
  }, []);

  const teamNumber = user.team_number || null;

  // Resolve team id
  const { data: teamData } = useQuery({
    queryKey: ["alliancesTeamProfile", teamNumber],
    queryFn: () => getTeamByNumber(teamNumber!),
    enabled: !!teamNumber,
  });

  // All matches for season
  const { data: matches, isLoading: loadingMatches } = useQuery({
    queryKey: ["alliancesMatches", teamData?.id, filterSeason],
    queryFn: () => getTeamMatches(teamData!.id, filterSeason),
    enabled: !!teamData?.id,
  });

  const allEntries = useMemo(() => {
    if (!matches || !teamNumber) return [];
    return extractAlliances(matches, teamNumber);
  }, [matches, teamNumber]);

  // PARTNERS aggregate
  const partnerAggregates: PartnerAggregate[] = useMemo(() => {
    const map = new Map<string, PartnerAggregate>();
    allEntries.forEach((e) => {
      let agg = map.get(e.partner);
      if (!agg) {
        agg = { team: e.partner, matches: 0, wins: 0, losses: 0, ties: 0, events: new Set(), lastPlayed: "" };
        map.set(e.partner, agg);
      }
      agg.matches++;
      if (e.result === "win") agg.wins++;
      else if (e.result === "loss") agg.losses++;
      else agg.ties++;
      agg.events.add(e.eventName);
    });
    return Array.from(map.values()).sort((a, b) => b.matches - a.matches);
  }, [allEntries]);

  const visiblePartners = useMemo(() => {
    return partnerAggregates.filter((p) => {
      const hidden = hiddenPartners.has(p.team);
      if (!showHidden && hidden) return false;
      if (showHidden && !hidden) return false;
      if (partnerSearch && !p.team.toLowerCase().includes(partnerSearch.toLowerCase())) return false;
      return true;
    });
  }, [partnerAggregates, hiddenPartners, showHidden, partnerSearch]);

  const togglePartnerHidden = (team: string) => {
    const next = new Set(hiddenPartners);
    if (next.has(team)) next.delete(team);
    else next.add(team);
    setHiddenPartners(next);
    if (user.id) {
      localStorage.setItem(`alliances-hidden-${user.id}`, JSON.stringify(Array.from(next)));
    }
    toast.success(next.has(team) ? "Partner hidden" : "Partner restored");
  };

  // EVENTS grouping
  const groupedByEvent = useMemo(() => {
    const map = new Map<string, AllianceEntry[]>();
    allEntries.forEach((e) => {
      if (!map.has(e.eventName)) map.set(e.eventName, []);
      map.get(e.eventName)!.push(e);
    });
    return Array.from(map.entries());
  }, [allEntries]);

  // WATCHLIST
  const { data: watchlist } = useQuery({
    queryKey: ["allianceWatchlist", teamNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alliance_watchlist")
        .select("*")
        .eq("team_number", teamNumber!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!teamNumber,
  });

  // Notes for tagged teams (reuse team_notes)
  const { data: teamNotes } = useQuery({
    queryKey: ["allianceTeamNotes", teamNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_notes")
        .select("*")
        .eq("team_number", teamNumber!)
        .not("tagged_team", "is", null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!teamNumber,
  });

  const notesByTeam = useMemo(() => {
    const map = new Map<string, any[]>();
    (teamNotes || []).forEach((n: any) => {
      if (!n.tagged_team) return;
      if (!map.has(n.tagged_team)) map.set(n.tagged_team, []);
      map.get(n.tagged_team)!.push(n);
    });
    return map;
  }, [teamNotes]);

  const addToWatchlist = async () => {
    if (!user.id || !teamNumber || !newWatchTeam.trim()) return;
    const { error } = await supabase.from("alliance_watchlist").insert({
      user_id: user.id,
      team_number: teamNumber,
      watched_team: newWatchTeam.trim().toUpperCase(),
      notes: newWatchNotes.trim() || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Added ${newWatchTeam.trim().toUpperCase()} to watchlist`);
    setNewWatchTeam("");
    setNewWatchNotes("");
    setAddOpen(false);
    queryClient.invalidateQueries({ queryKey: ["allianceWatchlist"] });
  };

  const removeFromWatchlist = async (id: string) => {
    const { error } = await supabase.from("alliance_watchlist").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Removed from watchlist");
    queryClient.invalidateQueries({ queryKey: ["allianceWatchlist"] });
  };

  const openNoteEditor = (taggedTeam: string) => {
    setNoteEditTeam(taggedTeam);
    const existing = notesByTeam.get(taggedTeam)?.find((n: any) => n.user_id === user.id);
    if (existing) {
      setNoteEditId(existing.id);
      setNoteEditText(existing.content);
    } else {
      setNoteEditId(null);
      setNoteEditText("");
    }
  };

  const saveNote = async () => {
    if (!user.id || !teamNumber || !noteEditTeam) return;
    if (noteEditId) {
      const { error } = await supabase
        .from("team_notes")
        .update({ content: noteEditText, updated_at: new Date().toISOString() })
        .eq("id", noteEditId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("team_notes").insert({
        user_id: user.id,
        team_number: teamNumber,
        tagged_team: noteEditTeam,
        title: `Notes on ${noteEditTeam}`,
        content: noteEditText,
        category: "strategy",
      });
      if (error) return toast.error(error.message);
    }
    toast.success("Note saved");
    setNoteEditId(null);
    setNoteEditTeam("");
    setNoteEditText("");
    queryClient.invalidateQueries({ queryKey: ["allianceTeamNotes"] });
  };

  if (!teamNumber) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto py-12">
          <EmptyState
            icon={Users}
            title="Join a team to use Alliances"
            description="Set your team number in your profile to track alliance partners and build a watchlist."
          />
        </div>
      </AppLayout>
    );
  }

  const seasonInfo = SEASONS[filterSeason];

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            Alliances
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Team {teamNumber} · {seasonInfo.name}
          </p>
        </div>

        {/* Season filter */}
        <div className="flex flex-wrap gap-2">
          {SEASON_LIST.map((s) => (
            <Button
              key={s.key}
              variant={filterSeason === s.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterSeason(s.key)}
              className="text-xs"
            >
              {s.name}
            </Button>
          ))}
        </div>

        <Tabs defaultValue="partners" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="partners">Partners</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
          </TabsList>

          {/* PARTNERS TAB */}
          <TabsContent value="partners" className="space-y-4 mt-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search partner team…"
                  value={partnerSearch}
                  onChange={(e) => setPartnerSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHidden(!showHidden)}
                className="gap-2"
              >
                {showHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {showHidden
                  ? `Showing hidden (${hiddenPartners.size})`
                  : `Hidden: ${hiddenPartners.size}`}
              </Button>
            </div>

            {loadingMatches ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : visiblePartners.length === 0 ? (
              <div className="rounded-xl border border-border/50 card-gradient p-8 text-center text-sm text-muted-foreground">
                {showHidden ? "No hidden partners." : "No alliance partners for this season."}
              </div>
            ) : (
              <div className="grid gap-2">
                {visiblePartners.map((p) => {
                  const winRate = p.matches > 0 ? Math.round((p.wins / p.matches) * 100) : 0;
                  const noteCount = notesByTeam.get(p.team)?.length || 0;
                  return (
                    <div
                      key={p.team}
                      className="rounded-xl border border-border/50 card-gradient p-3 flex items-center gap-3"
                    >
                      <Link
                        to={`/team/${p.team}`}
                        className="text-base font-display font-bold text-primary hover:underline shrink-0 w-20"
                      >
                        {p.team}
                      </Link>
                      <div className="flex-1 min-w-0 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">Record</div>
                          <div className="font-semibold">
                            {p.wins}-{p.losses}-{p.ties}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Win rate</div>
                          <div
                            className={cn(
                              "font-semibold",
                              winRate >= 60
                                ? "text-[hsl(var(--success))]"
                                : winRate < 40
                                ? "text-destructive"
                                : ""
                            )}
                          >
                            {winRate}%
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Events</div>
                          <div className="font-semibold">{p.events.size}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openNoteEditor(p.team)}
                          title="Edit note"
                          className="relative"
                        >
                          <StickyNote className="h-4 w-4" />
                          {noteCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                              {noteCount}
                            </span>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => togglePartnerHidden(p.team)}
                          title={hiddenPartners.has(p.team) ? "Unhide" : "Hide"}
                        >
                          {hiddenPartners.has(p.team) ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* EVENTS TAB */}
          <TabsContent value="events" className="space-y-3 mt-4">
            {loadingMatches ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : groupedByEvent.length === 0 ? (
              <div className="rounded-xl border border-border/50 card-gradient p-8 text-center text-sm text-muted-foreground">
                No events for this season.
              </div>
            ) : (
              groupedByEvent.map(([eventName, entries]) => {
                const wins = entries.filter((e) => e.result === "win").length;
                const losses = entries.filter((e) => e.result === "loss").length;
                const uniquePartners = new Set(entries.map((e) => e.partner));
                const eventId = entries[0]?.eventId;
                return (
                  <div
                    key={eventName}
                    className="rounded-xl border border-border/50 card-gradient overflow-hidden"
                  >
                    <div className="px-4 py-3 bg-muted/30 border-b border-border/30 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-display font-semibold truncate">
                          {eventName}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {entries.length} matches · {wins}W-{losses}L · {uniquePartners.size}{" "}
                          partner{uniquePartners.size !== 1 ? "s" : ""}
                        </p>
                      </div>
                      {eventId && (
                        <Link to={`/event/${eventId}`}>
                          <Button variant="ghost" size="icon" title="Open event">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </div>
                    <div className="divide-y divide-border/20">
                      {entries.map((entry, i) => (
                        <div
                          key={i}
                          className="px-4 py-2 flex items-center gap-3 text-sm hover:bg-muted/20 transition-colors"
                        >
                          <div
                            className={cn(
                              "w-1.5 h-7 rounded-full shrink-0",
                              entry.result === "win"
                                ? "bg-[hsl(var(--success))]"
                                : entry.result === "loss"
                                ? "bg-destructive"
                                : "bg-muted-foreground"
                            )}
                          />
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-16 shrink-0">
                              {entry.matchName}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded-full shrink-0",
                                entry.round === "Elimination"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {entry.round === "Elimination" ? "Elim" : "Qual"}
                            </span>
                            <Link
                              to={`/team/${entry.partner}`}
                              className="text-xs font-medium text-primary hover:underline truncate"
                            >
                              {entry.partner}
                            </Link>
                          </div>
                          <div className="text-right shrink-0 text-xs">
                            <span
                              className={cn(
                                "font-semibold",
                                entry.result === "win"
                                  ? "text-[hsl(var(--success))]"
                                  : entry.result === "loss"
                                  ? "text-destructive"
                                  : ""
                              )}
                            >
                              {entry.myScore}
                            </span>
                            <span className="text-muted-foreground mx-1">-</span>
                            <span className="text-muted-foreground">{entry.oppScore}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* WATCHLIST TAB */}
          <TabsContent value="watchlist" className="space-y-3 mt-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Track teams you'd like to alliance with.
              </p>
              <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Add team
              </Button>
            </div>

            {!watchlist || watchlist.length === 0 ? (
              <div className="rounded-xl border border-border/50 card-gradient p-8 text-center text-sm text-muted-foreground">
                No teams on your watchlist yet.
              </div>
            ) : (
              <div className="grid gap-2">
                {watchlist.map((w: any) => {
                  const noteCount = notesByTeam.get(w.watched_team)?.length || 0;
                  return (
                    <div
                      key={w.id}
                      className="rounded-xl border border-border/50 card-gradient p-3 flex items-center gap-3"
                    >
                      <Link
                        to={`/team/${w.watched_team}`}
                        className="text-base font-display font-bold text-primary hover:underline shrink-0 w-20"
                      >
                        {w.watched_team}
                      </Link>
                      <div className="flex-1 min-w-0 text-xs text-muted-foreground truncate">
                        {w.notes || w.event_name || "—"}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openNoteEditor(w.watched_team)}
                          title="Edit note"
                          className="relative"
                        >
                          <StickyNote className="h-4 w-4" />
                          {noteCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                              {noteCount}
                            </span>
                          )}
                        </Button>
                        {w.user_id === user.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFromWatchlist(w.id)}
                            title="Remove"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Add to watchlist dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add team to watchlist</DialogTitle>
              <DialogDescription>
                Track a team you're considering for alliance.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Team number (e.g. 12345A)"
                value={newWatchTeam}
                onChange={(e) => setNewWatchTeam(e.target.value)}
                autoFocus
              />
              <Textarea
                placeholder="Notes (optional)…"
                value={newWatchNotes}
                onChange={(e) => setNewWatchNotes(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={addToWatchlist} disabled={!newWatchTeam.trim()}>
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Note editor */}
        <Dialog open={!!noteEditTeam} onOpenChange={(o) => !o && setNoteEditTeam("")}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Note on team {noteEditTeam}</DialogTitle>
              <DialogDescription>
                Saved to your shared team notes — visible across the app.
              </DialogDescription>
            </DialogHeader>
            <Textarea
              placeholder="e.g. Strong autonomous, weak defense…"
              value={noteEditText}
              onChange={(e) => setNoteEditText(e.target.value)}
              rows={5}
              autoFocus
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setNoteEditTeam("")}>
                Cancel
              </Button>
              <Button onClick={saveNote} disabled={!noteEditText.trim()}>
                Save note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
