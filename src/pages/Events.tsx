import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Calendar, MapPin, Users, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { fetchRobotEvents } from "@/lib/robotevents";
import { motion } from "framer-motion";

export default function Events() {
  const [searchQuery, setSearchQuery] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["events", search],
    queryFn: () =>
      fetchRobotEvents("/events", {
        "program[]": "1",
        "start": new Date().toISOString().split("T")[0] + "T00:00:00Z",
        ...(search ? { "name": search } : {}),
      }),
    enabled: true,
  });

  const events = data?.data || [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchQuery);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Events</h1>
          <p className="text-muted-foreground mt-1">Browse upcoming VRC competitions</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search events by name..."
              className="pl-10 bg-card"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button type="submit" variant="hero">Search</Button>
        </form>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && events.length === 0 && (
          <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
            No upcoming events found. Try a different search term.
          </div>
        )}

        <div className="grid gap-4">
          {events.map((event: any, i: number) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border/50 card-gradient p-6 hover:border-primary/30 transition-all cursor-pointer"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="font-display font-semibold text-lg">{event.name}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {event.location?.city}, {event.location?.region}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(event.start).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    {event.teams_count != null && (
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />{event.teams_count} teams
                      </span>
                    )}
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
