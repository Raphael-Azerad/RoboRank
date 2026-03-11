import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Calendar as CalendarIcon, MapPin, Search, Loader2, Filter, ArrowUpDown, Flame, List, Star, StarOff, Users, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { useQuery } from "@tanstack/react-query";
import { fetchRobotEvents, getTeamByNumber, getTeamEvents, getEventSkills, SEASONS, US_STATES, type SeasonKey } from "@/lib/robotevents";
import { useSeason } from "@/contexts/SeasonContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Tab = "all" | "my" | "hot" | "watchlist";
type ViewMode = "list" | "calendar";

function useWatchlist() {
  const [watchlist, setWatchlist] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("event_watchlist") || "[]");
    } catch { return []; }
  });

  const toggle = (eventId: number) => {
    setWatchlist((prev) => {
      const next = prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId];
      localStorage.setItem("event_watchlist", JSON.stringify(next));
      return next;
    });
  };

  return { watchlist, toggle, isWatched: (id: number) => watchlist.includes(id) };
}

function getLevelBadge(name: string): { label: string; className: string } | null {
  const lower = name.toLowerCase();
  if (lower.includes("signature") || lower.includes("sig")) return { label: "Signature", className: "bg-primary/10 text-primary" };
  if (lower.includes("world")) return { label: "Worlds", className: "bg-chart-2/10 text-[hsl(var(--chart-2))]" };
  if (lower.includes("state") || lower.includes("championship")) return { label: "Championship", className: "bg-chart-4/10 text-[hsl(var(--chart-4))]" };
  if (lower.includes("league")) return { label: "League", className: "bg-chart-3/10 text-[hsl(var(--chart-3))]" };
  return null;
}

export default function Events() {
  const navigate = useNavigate();
  const { season } = useSeason();
  const [tab, setTab] = useState<Tab>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [search, setSearch] = useState("");
  const [teamNumber, setTeamNumber] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(new Date());
  const { watchlist, toggle: toggleWatchlist, isWatched } = useWatchlist();

  const seasonInfo = SEASONS[season];

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setTeamNumber(data.user?.user_metadata?.team_number || "");
    });
  }, []);

  const { data: teamData } = useQuery({
    queryKey: ["team", teamNumber],
    queryFn: () => getTeamByNumber(teamNumber),
    enabled: !!teamNumber,
  });

  const teamId = teamData?.id || null;

  // All events
  const { data: allEventsData, isLoading: allLoading } = useQuery({
    queryKey: ["events", "all", search, season, stateFilter],
    queryFn: () => fetchRobotEvents("/events", {
      "program[]": "1",
      "season[]": SEASONS[season].id,
      ...(search ? { name: search } : {}),
      ...(stateFilter !== "all" ? { region: stateFilter } : {}),
      per_page: "100",
    }),
    enabled: tab === "all" || tab === "hot" || tab === "watchlist",
  });

  // My events
  const { data: myEvents, isLoading: myLoading } = useQuery({
    queryKey: ["myEvents", teamId, season],
    queryFn: () => getTeamEvents(teamId!, season),
    enabled: tab === "my" && !!teamId,
  });

  // Hot events
  const { data: hotEvents, isLoading: hotLoading } = useQuery({
    queryKey: ["hotEvents", season, stateFilter],
    queryFn: async () => {
      const params: Record<string, string> = {
        "program[]": "1",
        "season[]": SEASONS[season].id,
        per_page: "30",
      };
      if (stateFilter !== "all") params.region = stateFilter;
      const result = await fetchRobotEvents("/events", params);
      const allEvents = result?.data || [];

      const now = new Date();
      const upcoming = allEvents.filter((e: any) => new Date(e.start) > now);
      const eventsToAnalyze = upcoming.slice(0, 8);

      const scored: { event: any; avgScore: number; teamCount: number }[] = [];

      await Promise.all(eventsToAnalyze.map(async (evt: any) => {
        try {
          const skills = await getEventSkills(evt.id);
          if (skills.length === 0) {
            const teamsResult = await fetchRobotEvents(`/events/${evt.id}/teams`, { per_page: "5" });
            const count = teamsResult?.meta?.total || 0;
            scored.push({ event: evt, avgScore: 0, teamCount: count });
            return;
          }
          const teamScores = new Map<number, number>();
          skills.forEach((s: any) => {
            const tid = s.team?.id;
            if (!tid) return;
            teamScores.set(tid, (teamScores.get(tid) || 0) + s.score);
          });
          const scores = Array.from(teamScores.values());
          const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
          scored.push({ event: evt, avgScore: avg, teamCount: scores.length });
        } catch {
          scored.push({ event: evt, avgScore: 0, teamCount: 0 });
        }
      }));

      return scored.sort((a, b) => b.avgScore - a.avgScore || b.teamCount - a.teamCount);
    },
    enabled: tab === "hot",
    staleTime: 10 * 60 * 1000,
  });

  let events = tab === "all" || tab === "watchlist" ? (allEventsData?.data || []) : tab === "my" ? (myEvents || []) : [];
  const isLoading = tab === "all" || tab === "watchlist" ? allLoading : tab === "my" ? myLoading : hotLoading;

  // Watchlist filter
  if (tab === "watchlist") {
    events = events.filter((e: any) => watchlist.includes(e.id));
  }

  // Client-side filters
  const now = new Date();
  if (tab !== "hot") {
    if (statusFilter === "upcoming") {
      events = events.filter((e: any) => new Date(e.start) > now);
    } else if (statusFilter === "completed") {
      events = events.filter((e: any) => new Date(e.end || e.start) < now);
    }

    if (levelFilter !== "all") {
      events = events.filter((e: any) => {
        const name = (e.name || "").toLowerCase();
        switch (levelFilter) {
          case "signature": return name.includes("signature") || name.includes("sig");
          case "worlds": return name.includes("world");
          case "league": return name.includes("league");
          case "championship": return name.includes("state") || name.includes("championship");
          default: return true;
        }
      });
    }

    events = [...events].sort((a: any, b: any) => {
      const aDate = new Date(a.start);
      const bDate = new Date(b.start);
      const aUp = aDate > now;
      const bUp = bDate > now;
      if (aUp && !bUp) return -1;
      if (!aUp && bUp) return 1;
      if (aUp && bUp) return aDate.getTime() - bDate.getTime();
      return bDate.getTime() - aDate.getTime();
    });
  }

  // Calendar: group events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    events.forEach((e: any) => {
      const dateKey = new Date(e.start).toDateString();
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(e);
    });
    return map;
  }, [events]);

  const calendarEvents = calendarDate ? (eventsByDate.get(calendarDate.toDateString()) || []) : [];

  // Dates with events for calendar highlighting
  const eventDates = useMemo(() => {
    return new Set(Array.from(eventsByDate.keys()));
  }, [eventsByDate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchQuery);
  };

  const renderEventCard = (event: any, i: number) => {
    const eventDate = new Date(event.start);
    const isUpcoming = eventDate > now;
    const levelBadge = getLevelBadge(event.name || "");

    return (
      <motion.div
        key={event.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.02 }}
        className="rounded-xl border border-border/50 card-gradient p-5 hover:border-primary/30 transition-all cursor-pointer group"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0" onClick={() => navigate(`/event/${event.id}`)}>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-semibold text-base truncate">{event.name}</h3>
              {isUpcoming && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success/10 text-[hsl(var(--success))] shrink-0">
                  UPCOMING
                </span>
              )}
              {levelBadge && (
                <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0", levelBadge.className)}>
                  {levelBadge.label}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1.5">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {event.location?.city}, {event.location?.region}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5" />
                {eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right" onClick={() => navigate(`/event/${event.id}`)}>
              <div className="text-xs text-muted-foreground">SKU</div>
              <div className="text-sm stat-number text-primary">{event.sku}</div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleWatchlist(event.id); }}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors"
            >
              {isWatched(event.id) ? (
                <Star className="h-4 w-4 text-chart-4 fill-[hsl(var(--chart-4))]" />
              ) : (
                <StarOff className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Events</h1>
          <p className="text-muted-foreground mt-1">
            {seasonInfo.name} {seasonInfo.year} · Browse and scout competitions
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            <Button variant={tab === "all" ? "default" : "outline"} size="sm" onClick={() => setTab("all")}>
              All Events
            </Button>
            <Button variant={tab === "my" ? "default" : "outline"} size="sm" onClick={() => setTab("my")} className="gap-1.5">
              <Filter className="h-3.5 w-3.5" /> My Events
            </Button>
            <Button variant={tab === "hot" ? "default" : "outline"} size="sm" onClick={() => setTab("hot")} className="gap-1.5">
              <Flame className="h-3.5 w-3.5" /> Top Competition
            </Button>
            <Button variant={tab === "watchlist" ? "default" : "outline"} size="sm" onClick={() => setTab("watchlist")} className="gap-1.5">
              <Star className="h-3.5 w-3.5" /> Watchlist
              {watchlist.length > 0 && (
                <span className="text-[10px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{watchlist.length}</span>
              )}
            </Button>
          </div>

          {tab !== "hot" && (
            <div className="flex gap-1 border border-border rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("list")}
                className={cn("p-1.5 rounded-md transition-colors", viewMode === "list" ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground")}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={cn("p-1.5 rounded-md transition-colors", viewMode === "calendar" ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground")}
              >
                <CalendarDays className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Filters */}
        {(tab === "all" || tab === "hot") && (
          <div className="flex flex-wrap gap-3">
            {tab === "all" && (
              <form onSubmit={handleSearch} className="flex gap-3 flex-1 min-w-[200px]">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search events by name..." className="pl-10 bg-card" value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
              </form>
            )}
          </div>
        )}

        {(tab === "all" || tab === "hot") && (
          <div className="flex flex-wrap gap-3">
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-[180px] bg-card">
                <MapPin className="h-3.5 w-3.5 mr-1.5" />
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {US_STATES.map((state) => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {tab === "all" && (
              <>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px] bg-card">
                    <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-[180px] bg-card">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="signature">Signature</SelectItem>
                    <SelectItem value="championship">Championship</SelectItem>
                    <SelectItem value="league">League</SelectItem>
                    <SelectItem value="worlds">Worlds</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center gap-2 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {tab === "hot" ? "Analyzing competition levels..." : "Loading events..."}
            </p>
          </div>
        )}

        {/* Calendar View */}
        {!isLoading && viewMode === "calendar" && tab !== "hot" && (
          <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
            <div className="rounded-xl border border-border/50 card-gradient p-4 self-start">
              <Calendar
                mode="single"
                selected={calendarDate}
                onSelect={setCalendarDate}
                className="p-3 pointer-events-auto"
                modifiers={{
                  hasEvent: (date) => eventDates.has(date.toDateString()),
                }}
                modifiersClassNames={{
                  hasEvent: "bg-primary/20 text-primary font-bold",
                }}
              />
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                {calendarDate
                  ? calendarDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
                  : "Select a date"}
              </h3>
              {calendarEvents.length === 0 ? (
                <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-6 text-center">
                  No events on this date.
                </div>
              ) : (
                <div className="grid gap-3">
                  {calendarEvents.map((event: any, i: number) => renderEventCard(event, i))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hot events display */}
        {!isLoading && tab === "hot" && hotEvents && (
          hotEvents.length === 0 ? (
            <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
              No upcoming events found to analyze.
            </div>
          ) : (
            <div className="grid gap-4">
              {hotEvents.map((item, i) => (
                <motion.div
                  key={item.event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-xl border border-border/50 card-gradient p-5 hover:border-primary/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0" onClick={() => navigate(`/event/${item.event.id}`)}>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-semibold text-base truncate">{item.event.name}</h3>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                          🔥 HOT
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1.5">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {item.event.location?.city}, {item.event.location?.region}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {new Date(item.event.start).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        {item.avgScore > 0 ? (
                          <>
                            <div className="text-xs text-muted-foreground">Avg Skills</div>
                            <div className="text-lg stat-number text-primary">{Math.round(item.avgScore)}</div>
                          </>
                        ) : (
                          <>
                            <div className="text-xs text-muted-foreground">Teams</div>
                            <div className="text-lg stat-number text-primary">{item.teamCount}</div>
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleWatchlist(item.event.id); }}
                        className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                      >
                        {isWatched(item.event.id) ? (
                          <Star className="h-4 w-4 text-chart-4 fill-[hsl(var(--chart-4))]" />
                        ) : (
                          <StarOff className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        )}

        {/* Regular events display (list view) */}
        {!isLoading && viewMode === "list" && tab !== "hot" && (
          events.length === 0 ? (
            <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
              {tab === "my" ? "You haven't registered for any events this season yet." :
               tab === "watchlist" ? "No events in your watchlist yet. Star events to add them here." :
               "No events found. Try adjusting your filters."}
            </div>
          ) : (
            <div className="grid gap-3">
              {events.map((event: any, i: number) => renderEventCard(event, i))}
            </div>
          )
        )}
      </div>
    </AppLayout>
  );
}
