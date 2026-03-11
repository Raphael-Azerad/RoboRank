import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Calendar, MapPin, Users, Search, Loader2, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { fetchRobotEvents, getTeamByNumber, getTeamEvents, SEASONS } from "@/lib/robotevents";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

type Tab = "all" | "my" | "region";

export default function Events() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [search, setSearch] = useState("");
  const [teamNumber, setTeamNumber] = useState("");
  const [region, setRegion] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setTeamNumber(data.user?.user_metadata?.team_number || "");
    });
  }, []);

  // Get user's team for region
  const { data: teamData } = useQuery({
    queryKey: ["team", teamNumber],
    queryFn: () => getTeamByNumber(teamNumber),
    enabled: !!teamNumber,
  });

  useEffect(() => {
    if (teamData?.location?.region) setRegion(teamData.location.region);
  }, [teamData]);

  const teamId = teamData?.id || null;

  // All events (with search)
  const { data: allEventsData, isLoading: allLoading } = useQuery({
    queryKey: ["events", "all", search],
    queryFn: () => fetchRobotEvents("/events", {
      "program[]": "1",
      "season[]": SEASONS.current.id,
      ...(search ? { name: search } : {}),
      per_page: "50",
    }),
    enabled: tab === "all",
  });

  // My events
  const { data: myEvents, isLoading: myLoading } = useQuery({
    queryKey: ["myEvents", teamId],
    queryFn: () => getTeamEvents(teamId!, "current"),
    enabled: tab === "my" && !!teamId,
  });

  // Region events
  const { data: regionEventsData, isLoading: regionLoading } = useQuery({
    queryKey: ["events", "region", region],
    queryFn: () => fetchRobotEvents("/events", {
      "program[]": "1",
      "season[]": SEASONS.current.id,
      region,
      per_page: "50",
    }),
    enabled: tab === "region" && !!region,
  });

  const events = tab === "all" ? (allEventsData?.data || []) :
    tab === "my" ? (myEvents || []) :
    (regionEventsData?.data || []);
  const isLoading = tab === "all" ? allLoading : tab === "my" ? myLoading : regionLoading;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchQuery);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All Events" },
    { key: "my", label: "My Events" },
    { key: "region", label: region ? `${region} Events` : "Regional" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Events</h1>
          <p className="text-muted-foreground mt-1">
            {SEASONS.current.name} {SEASONS.current.year} · Browse and scout competitions
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {tabs.map((t) => (
            <Button
              key={t.key}
              variant={tab === t.key ? "default" : "outline"}
              size="sm"
              onClick={() => setTab(t.key)}
              className="gap-1.5"
            >
              {t.key === "my" && <Filter className="h-3.5 w-3.5" />}
              {t.label}
            </Button>
          ))}
        </div>

        {/* Search (all events tab) */}
        {tab === "all" && (
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search events by name..." className="pl-10 bg-card" value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <Button type="submit" variant="hero">Search</Button>
          </form>
        )}

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && events.length === 0 && (
          <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
            {tab === "my" ? "You haven't registered for any events this season yet." :
             tab === "region" ? `No events found in ${region}.` :
             "No events found. Try a different search term."}
          </div>
        )}

        <div className="grid gap-4">
          {events.map((event: any, i: number) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => navigate(`/event/${event.id}`)}
              className="rounded-xl border border-border/50 card-gradient p-6 hover:border-primary/30 transition-all cursor-pointer"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <h3 className="font-display font-semibold text-lg truncate">{event.name}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {event.location?.city}, {event.location?.region}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(event.start).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-muted-foreground">SKU</div>
                  <div className="text-sm stat-number text-primary">{event.sku}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
