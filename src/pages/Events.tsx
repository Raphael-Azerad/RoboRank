import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Calendar, MapPin, Search, Loader2, Filter, ArrowUpDown, Flame } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { fetchRobotEvents, getTeamByNumber, getTeamEvents, getEventSkills, SEASONS, US_STATES, type SeasonKey } from "@/lib/robotevents";
import { useSeason } from "@/contexts/SeasonContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

type Tab = "all" | "my" | "hot";

export default function Events() {
  const navigate = useNavigate();
  const { season } = useSeason();
  const [tab, setTab] = useState<Tab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [search, setSearch] = useState("");
  const [teamNumber, setTeamNumber] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");

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
    enabled: tab === "all" || tab === "hot",
  });

  // My events
  const { data: myEvents, isLoading: myLoading } = useQuery({
    queryKey: ["myEvents", teamId, season],
    queryFn: () => getTeamEvents(teamId!, season),
    enabled: tab === "my" && !!teamId,
  });

  // Hot events - upcoming events ranked by avg team strength
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
            // No skills data yet, use team count as proxy
            const teamsResult = await fetchRobotEvents(`/events/${evt.id}/teams`, { per_page: "5" });
            const count = teamsResult?.meta?.total || 0;
            scored.push({ event: evt, avgScore: 0, teamCount: count });
            return;
          }
          // Calculate avg combined skills score
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

  let events = tab === "all" ? (allEventsData?.data || []) : tab === "my" ? (myEvents || []) : [];
  const isLoading = tab === "all" ? allLoading : tab === "my" ? myLoading : hotLoading;

  // Client-side filters (for all/my tabs)
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchQuery);
  };

  const renderEventCard = (event: any, i: number) => {
    const eventDate = new Date(event.start);
    const isUpcoming = eventDate > now;
    return (
      <motion.div
        key={event.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.02 }}
        onClick={() => navigate(`/event/${event.id}`)}
        className="rounded-xl border border-border/50 card-gradient p-6 hover:border-primary/30 transition-all cursor-pointer"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-lg truncate">{event.name}</h3>
              {isUpcoming && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                  UPCOMING
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {event.location?.city}, {event.location?.region}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-muted-foreground">SKU</div>
            <div className="text-sm stat-number text-primary">{event.sku}</div>
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
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-[160px] bg-card">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="signature">Signature</SelectItem>
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
                  onClick={() => navigate(`/event/${item.event.id}`)}
                  className="rounded-xl border border-border/50 card-gradient p-6 hover:border-primary/30 transition-all cursor-pointer"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-semibold text-lg truncate">{item.event.name}</h3>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                          🔥 HOT
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {item.event.location?.city}, {item.event.location?.region}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(item.event.start).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
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
                  </div>
                </motion.div>
              ))}
            </div>
          )
        )}

        {/* Regular events display */}
        {!isLoading && tab !== "hot" && events.length === 0 && (
          <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
            {tab === "my" ? "You haven't registered for any events this season yet." :
             "No events found. Try adjusting your filters."}
          </div>
        )}

        {!isLoading && tab !== "hot" && (
          <div className="grid gap-4">
            {events.map((event: any, i: number) => renderEventCard(event, i))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
