import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Calendar, MapPin, Users, Search, Loader2, Filter, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { fetchRobotEvents, getTeamByNumber, getTeamEvents, SEASONS, SEASON_LIST, US_STATES, type SeasonKey } from "@/lib/robotevents";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

type Tab = "all" | "my";

export default function Events() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [search, setSearch] = useState("");
  const [teamNumber, setTeamNumber] = useState("");
  const [season, setSeason] = useState<SeasonKey>("current");
  const [stateFilter, setStateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // all, upcoming, completed
  const [levelFilter, setLevelFilter] = useState("all"); // all, tournament, league, signature, worlds

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
  const seasonInfo = SEASONS[season];

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
    enabled: tab === "all",
  });

  // My events
  const { data: myEvents, isLoading: myLoading } = useQuery({
    queryKey: ["myEvents", teamId, season],
    queryFn: () => getTeamEvents(teamId!, season),
    enabled: tab === "my" && !!teamId,
  });

  let events = tab === "all" ? (allEventsData?.data || []) : (myEvents || []);
  const isLoading = tab === "all" ? allLoading : myLoading;

  // Client-side filters
  const now = new Date();
  if (statusFilter === "upcoming") {
    events = events.filter((e: any) => new Date(e.start) > now);
  } else if (statusFilter === "completed") {
    events = events.filter((e: any) => new Date(e.end || e.start) < now);
  }

  if (levelFilter !== "all") {
    events = events.filter((e: any) => {
      const name = (e.name || "").toLowerCase();
      const sku = (e.sku || "").toUpperCase();
      switch (levelFilter) {
        case "signature": return name.includes("signature") || sku.startsWith("RE-VIQRC") || name.includes("sig");
        case "worlds": return name.includes("world") || name.includes("vex worlds");
        case "league": return name.includes("league");
        default: return true; // tournament
      }
    });
  }

  // Sort: upcoming first, then by date
  events = [...events].sort((a: any, b: any) => {
    const aDate = new Date(a.start);
    const bDate = new Date(b.start);
    const aUpcoming = aDate > now;
    const bUpcoming = bDate > now;
    if (aUpcoming && !bUpcoming) return -1;
    if (!aUpcoming && bUpcoming) return 1;
    if (aUpcoming && bUpcoming) return aDate.getTime() - bDate.getTime(); // soonest first
    return bDate.getTime() - aDate.getTime(); // most recent first
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchQuery);
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

        {/* Season Selector */}
        <div className="flex flex-wrap gap-2">
          {SEASON_LIST.map((s) => (
            <Button key={s.key} variant={season === s.key ? "default" : "outline"} size="sm"
              onClick={() => setSeason(s.key)} className="text-xs">
              {s.name}
            </Button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          <Button variant={tab === "all" ? "default" : "outline"} size="sm" onClick={() => setTab("all")}>
            All Events
          </Button>
          <Button variant={tab === "my" ? "default" : "outline"} size="sm" onClick={() => setTab("my")} className="gap-1.5">
            <Filter className="h-3.5 w-3.5" /> My Events
          </Button>
        </div>

        {/* Filters */}
        {tab === "all" && (
          <div className="flex flex-wrap gap-3">
            <form onSubmit={handleSearch} className="flex gap-3 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search events by name..." className="pl-10 bg-card" value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <Button type="submit" variant="hero">Search</Button>
            </form>
          </div>
        )}

        {tab === "all" && (
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
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && events.length === 0 && (
          <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
            {tab === "my" ? "You haven't registered for any events this season yet." :
             "No events found. Try adjusting your filters."}
          </div>
        )}

        <div className="grid gap-4">
          {events.map((event: any, i: number) => {
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
          })}
        </div>
      </div>
    </AppLayout>
  );
}
