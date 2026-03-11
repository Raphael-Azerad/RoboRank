import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Calendar as CalendarIcon, MapPin, Search, Loader2, Filter, ArrowUpDown, List, Star, CalendarDays, ChevronLeft, ChevronRight, Map as MapIcon, Users, Navigation, GitCompare, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { fetchAllPages, getTeamByNumber, getTeamEvents, SEASONS, US_STATES, type SeasonKey } from "@/lib/robotevents";
import { useSeason } from "@/contexts/SeasonContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { EventMap } from "@/components/events/EventMap";

type Tab = "all" | "my" | "watchlist";
type ViewMode = "list" | "calendar" | "map";

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
  if (lower.includes("signature") || lower.includes("sig")) return { label: "SIG", className: "bg-primary/15 text-primary" };
  if (lower.includes("world")) return { label: "WORLDS", className: "bg-[hsl(var(--chart-2))]/15 text-[hsl(var(--chart-2))]" };
  if ((lower.includes("state") && lower.includes("championship")) || lower.includes("state championship")) return { label: "STATE", className: "bg-[hsl(var(--chart-4))]/15 text-[hsl(var(--chart-4))]" };
  if (lower.includes("league")) return { label: "LEAGUE", className: "bg-[hsl(var(--chart-3))]/15 text-[hsl(var(--chart-3))]" };
  return null;
}

function formatDateRange(start: string, end?: string): string {
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (e && e.toDateString() !== s.toDateString()) {
    return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
  }
  return s.toLocaleDateString("en-US", { ...opts, year: "numeric" });
}

function daysUntil(date: string): string {
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 0) return `in ${diff} days`;
  if (diff === -1) return "Yesterday";
  return `${Math.abs(diff)} days ago`;
}

export default function Events() {
  const navigate = useNavigate();
  const { season } = useSeason();
  const [tab, setTab] = useState<Tab>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [teamNumber, setTeamNumber] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(new Date());
  const { watchlist, toggle: toggleWatchlist, isWatched } = useWatchlist();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sortByNearby, setSortByNearby] = useState(false);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const seasonInfo = SEASONS[season];

  // Live search debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const { data: allEventsData, isLoading: allLoading } = useQuery({
    queryKey: ["events", "all", season, stateFilter],
    queryFn: () => fetchAllPages("/events", {
      "program[]": "1",
      "season[]": SEASONS[season].id,
      ...(stateFilter !== "all" ? { region: stateFilter } : {}),
    }),
    enabled: tab === "all" || tab === "watchlist",
    staleTime: 5 * 60 * 1000,
  });

  const { data: myEvents, isLoading: myLoading } = useQuery({
    queryKey: ["myEvents", teamId, season],
    queryFn: () => getTeamEvents(teamId!, season),
    enabled: tab === "my" && !!teamId,
  });

  let events = tab === "all" || tab === "watchlist" ? (allEventsData || []) : (myEvents || []);
  const isLoading = tab === "all" || tab === "watchlist" ? allLoading : myLoading;

  // Client-side search filter (live)
  if (debouncedSearch) {
    const q = debouncedSearch.toLowerCase();
    events = events.filter((e: any) => {
      const name = (e.name || "").toLowerCase();
      const city = (e.location?.city || "").toLowerCase();
      const region = (e.location?.region || "").toLowerCase();
      return name.includes(q) || city.includes(q) || region.includes(q);
    });
  }

  if (tab === "watchlist") {
    events = events.filter((e: any) => watchlist.includes(e.id));
  }

  const now = new Date();

  if (statusFilter === "upcoming") {
    events = events.filter((e: any) => new Date(e.start) > now);
  } else if (statusFilter === "completed") {
    events = events.filter((e: any) => new Date(e.end || e.start) < now);
  }

  // Date range filter
  if (dateFrom) {
    events = events.filter((e: any) => new Date(e.start) >= dateFrom);
  }
  if (dateTo) {
    const toEnd = new Date(dateTo);
    toEnd.setHours(23, 59, 59, 999);
    events = events.filter((e: any) => new Date(e.start) <= toEnd);
  }

  if (levelFilter !== "all") {
    events = events.filter((e: any) => {
      const name = (e.name || "").toLowerCase();
      switch (levelFilter) {
        case "signature": return name.includes("signature") || name.includes("sig");
        case "worlds": return name.includes("world");
        case "league": return name.includes("league");
        case "championship": return name.includes("state") && name.includes("championship");
        default: return true;
      }
    });
  }

  // Distance calculation for nearby sorting
  const getDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 3959; // miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, []);

  const requestLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setSortByNearby(true);
        },
        () => setSortByNearby(false)
      );
    }
  }, []);

  const toggleCompare = useCallback((eventId: number) => {
    setCompareIds((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : prev.length < 4
          ? [...prev, eventId]
          : prev
    );
  }, []);

  events = [...events].sort((a: any, b: any) => {
    // Nearby sorting
    if (sortByNearby && userLocation) {
      const aCoords = a.location?.coordinates;
      const bCoords = b.location?.coordinates;
      if (aCoords?.lat && bCoords?.lat) {
        const aDist = getDistance(userLocation.lat, userLocation.lng, aCoords.lat, aCoords.lon);
        const bDist = getDistance(userLocation.lat, userLocation.lng, bCoords.lat, bCoords.lon);
        return aDist - bDist;
      }
    }
    // Default: upcoming first, then by date
    const aDate = new Date(a.start);
    const bDate = new Date(b.start);
    const aUp = aDate > now;
    const bUp = bDate > now;
    if (aUp && !bUp) return -1;
    if (!aUp && bUp) return 1;
    if (aUp && bUp) return aDate.getTime() - bDate.getTime();
    return bDate.getTime() - aDate.getTime();
  });

  const compareEvents = useMemo(() => {
    return events.filter((e: any) => compareIds.includes(e.id));
  }, [events, compareIds]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    events.forEach((e: any) => {
      const start = new Date(e.start);
      const end = e.end ? new Date(e.end) : start;
      // Normalize to local dates to avoid timezone shifts
      const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      const cursor = new Date(startDay);
      while (cursor <= endDay) {
        const dateKey = cursor.toDateString();
        if (!map.has(dateKey)) map.set(dateKey, []);
        map.get(dateKey)!.push(e);
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return map;
  }, [events]);

  const calendarEvents = calendarDate ? (eventsByDate.get(calendarDate.toDateString()) || []) : [];

  const eventDates = useMemo(() => {
    return new Set(Array.from(eventsByDate.keys()));
  }, [eventsByDate]);

  // Stats
  const upcomingCount = events.filter((e: any) => new Date(e.start) > now).length;
  const completedCount = events.filter((e: any) => new Date(e.end || e.start) < now).length;

  // Pagination
  const totalPages = Math.ceil(events.length / PAGE_SIZE);
  const paginatedEvents = events.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [tab, debouncedSearch, stateFilter, statusFilter, levelFilter, dateFrom, dateTo]);

  const handleEventClick = useCallback((eventId: number) => {
    navigate(`/event/${eventId}`);
  }, [navigate]);

  const renderEventCard = (event: any, i: number) => {
    const eventStart = new Date(event.start);
    const isUpcoming = eventStart > now;
    const levelBadge = getLevelBadge(event.name || "");
    const location = event.location;
    const city = location?.city;
    const region = location?.region;
    const locationStr = [city, region].filter(Boolean).join(", ");
    const teamCount = event.teams_count || event.stats?.teams;

    return (
      <motion.div
        key={event.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(i * 0.02, 0.4) }}
        onClick={() => navigate(`/event/${event.id}`)}
        className={cn(
          "rounded-xl border border-border/50 card-gradient p-4 hover:border-primary/30 transition-all cursor-pointer group",
          !isUpcoming && "opacity-70"
        )}
      >
        <div className="flex items-start gap-3">
          {/* Date block */}
          <div className={cn(
            "shrink-0 w-12 h-12 rounded-lg flex flex-col items-center justify-center text-center",
            isUpcoming ? "bg-primary/10" : "bg-muted"
          )}>
            <span className={cn("text-[10px] font-semibold uppercase", isUpcoming ? "text-primary" : "text-muted-foreground")}>
              {eventStart.toLocaleDateString("en-US", { month: "short" })}
            </span>
            <span className={cn("text-lg font-display font-bold leading-none", isUpcoming ? "text-primary" : "text-muted-foreground")}>
              {eventStart.getDate()}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-display font-semibold text-sm leading-tight line-clamp-1">{event.name}</h3>
              {levelBadge && (
                <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0", levelBadge.className)}>
                  {levelBadge.label}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
              {locationStr && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {locationStr}
                </span>
              )}
              <span className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {formatDateRange(event.start, event.end)}
              </span>
              {teamCount && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {teamCount} teams
                </span>
              )}
              {isUpcoming && (
                <span className="text-primary font-medium">{daysUntil(event.start)}</span>
              )}
              {!isUpcoming && (
                <span className="text-muted-foreground/60 text-[10px] uppercase font-medium">Completed</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {showCompare && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleCompare(event.id); }}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  compareIds.includes(event.id) ? "bg-primary/20 text-primary" : "hover:bg-accent text-muted-foreground/40"
                )}
              >
                <GitCompare className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggleWatchlist(event.id); }}
              className="p-1.5 rounded-lg hover:bg-accent transition-colors"
            >
              {isWatched(event.id) ? (
                <Star className="h-4 w-4 text-[hsl(var(--chart-4))] fill-[hsl(var(--chart-4))]" />
              ) : (
                <Star className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
              )}
            </button>
          </div>
        </div>

        {/* Nearby distance */}
        {sortByNearby && userLocation && event.location?.coordinates?.lat && (
          <div className="mt-2 text-[10px] text-muted-foreground flex items-center gap-1 ml-[60px]">
            <Navigation className="h-3 w-3" />
            {Math.round(getDistance(userLocation.lat, userLocation.lng, event.location.coordinates.lat, event.location.coordinates.lon))} mi away
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-display font-bold">Events</h1>
          <p className="text-muted-foreground mt-1">
            {seasonInfo.name} {seasonInfo.year}
          </p>
        </div>

        {/* Quick stats */}
        {!isLoading && tab === "all" && (
          <div className="flex gap-3 flex-wrap">
            <div className="rounded-lg border border-border/50 card-gradient px-3 py-2 text-center">
              <div className="text-lg stat-number text-primary">{events.length}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Total</div>
            </div>
            <div className="rounded-lg border border-border/50 card-gradient px-3 py-2 text-center">
              <div className="text-lg stat-number text-[hsl(var(--success))]">{upcomingCount}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Upcoming</div>
            </div>
            <div className="rounded-lg border border-border/50 card-gradient px-3 py-2 text-center">
              <div className="text-lg stat-number text-muted-foreground">{completedCount}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Completed</div>
            </div>
          </div>
        )}

        {/* Tabs + View Toggle */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            <Button variant={tab === "all" ? "default" : "outline"} size="sm" onClick={() => setTab("all")}>
              All Events
            </Button>
            <Button variant={tab === "my" ? "default" : "outline"} size="sm" onClick={() => setTab("my")} className="gap-1.5">
              <Filter className="h-3.5 w-3.5" /> My Events
            </Button>
            <Button variant={tab === "watchlist" ? "default" : "outline"} size="sm" onClick={() => setTab("watchlist")} className="gap-1.5">
              <Star className="h-3.5 w-3.5" /> Watchlist
              {watchlist.length > 0 && (
                <span className="text-[10px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{watchlist.length}</span>
              )}
            </Button>
            <Button
              variant={sortByNearby ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (sortByNearby) {
                  setSortByNearby(false);
                } else {
                  requestLocation();
                }
              }}
              className="gap-1.5"
            >
              <Navigation className="h-3.5 w-3.5" /> Nearby
            </Button>
            <Button
              variant={compareIds.length > 0 ? "default" : "outline"}
              size="sm"
              onClick={() => setShowCompare(!showCompare)}
              className="gap-1.5"
            >
              <GitCompare className="h-3.5 w-3.5" /> Compare
              {compareIds.length > 0 && (
                <span className="text-[10px] font-bold bg-primary-foreground/20 px-1.5 py-0.5 rounded-full">{compareIds.length}</span>
              )}
            </Button>
          </div>

          <div className="flex gap-1 border border-border rounded-lg p-0.5">
            {([
              { mode: "list" as ViewMode, icon: List },
              { mode: "calendar" as ViewMode, icon: CalendarDays },
              { mode: "map" as ViewMode, icon: MapIcon },
            ]).map(({ mode, icon: Icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn("p-1.5 rounded-md transition-colors", viewMode === mode ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground")}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search events, cities..."
                className="pl-10 bg-card"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-[160px] bg-card">
              <MapPin className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {US_STATES.map((state) => (
                <SelectItem key={state} value={state}>{state}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] bg-card">
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
            <SelectTrigger className="w-[150px] bg-card">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="signature">Signature</SelectItem>
              <SelectItem value="championship">State Champ</SelectItem>
              <SelectItem value="league">League</SelectItem>
              <SelectItem value="worlds">Worlds</SelectItem>
            </SelectContent>
          </Select>

          {/* Date range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-1.5 bg-card", (dateFrom || dateTo) && "border-primary text-primary")}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {dateFrom && dateTo ? `${format(dateFrom, "MMM d")} – ${format(dateTo, "MMM d")}` :
                 dateFrom ? `From ${format(dateFrom, "MMM d")}` :
                 dateTo ? `Until ${format(dateTo, "MMM d")}` :
                 "Date Range"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4 space-y-3" align="end">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">From</label>
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-0 pointer-events-auto" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">To</label>
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-0 pointer-events-auto" />
              </div>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
                  Clear dates
                </Button>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center gap-2 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading all events...</p>
            <p className="text-xs text-muted-foreground/60">This may take a moment</p>
          </div>
        )}

        {/* Map View */}
        {!isLoading && viewMode === "map" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Showing {events.filter((e: any) => e.location?.coordinates?.lat).length} of {events.length} events with coordinates
            </p>
            <EventMap events={events} onEventClick={handleEventClick} />
          </div>
        )}

        {/* Calendar View */}
        {!isLoading && viewMode === "calendar" && (
          <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
            <div className="rounded-xl border border-border/50 card-gradient p-3 self-start">
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
                {calendarEvents.length > 0 && (
                  <span className="ml-2 text-primary">({calendarEvents.length} events)</span>
                )}
              </h3>
              {calendarEvents.length === 0 ? (
                <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-6 text-center">
                  No events on this date.
                </div>
              ) : (
                <div className="grid gap-2">
                  {calendarEvents.map((event: any, i: number) => renderEventCard(event, i))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* List View */}
        {!isLoading && viewMode === "list" && (
          events.length === 0 ? (
            <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
              {tab === "my" ? "You haven't registered for any events this season yet." :
               tab === "watchlist" ? "No events in your watchlist. Star events to track them here." :
               "No events found. Try adjusting your filters."}
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                {paginatedEvents.map((event: any, i: number) => renderEventCard(event, i))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-xs text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, events.length)} of {events.length} events
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 7) { pageNum = i + 1; }
                      else if (page <= 4) { pageNum = i + 1; }
                      else if (page >= totalPages - 3) { pageNum = totalPages - 6 + i; }
                      else { pageNum = page - 3 + i; }
                      return (
                        <Button key={pageNum} variant={page === pageNum ? "default" : "outline"} size="icon" className="h-8 w-8 text-xs"
                          onClick={() => setPage(pageNum)}>
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )
        )}
        {/* Compare Panel */}
        {showCompare && compareEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-border bg-card shadow-xl p-4 max-w-3xl w-[95vw]"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-display font-semibold">Comparing {compareEvents.length} Events</h3>
              <Button variant="ghost" size="sm" onClick={() => { setCompareIds([]); setShowCompare(false); }}>
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(compareEvents.length, 4)}, 1fr)` }}>
              {compareEvents.map((event: any) => {
                const loc = event.location;
                return (
                  <div key={event.id} className="rounded-lg border border-border/50 p-3 text-xs space-y-1.5">
                    <div className="font-display font-semibold text-sm line-clamp-2">{event.name}</div>
                    <div className="text-muted-foreground flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {formatDateRange(event.start, event.end)}
                    </div>
                    {loc?.city && (
                      <div className="text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {loc.city}, {loc.region}
                      </div>
                    )}
                    {(event.teams_count || event.stats?.teams) && (
                      <div className="text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {event.teams_count || event.stats?.teams} teams
                      </div>
                    )}
                    <Button variant="outline" size="sm" className="w-full mt-2 text-xs" onClick={() => navigate(`/event/${event.id}`)}>
                      View Details
                    </Button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
