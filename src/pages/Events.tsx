import { AppLayout } from "@/components/layout/AppLayout";
import { Calendar, MapPin, Users } from "lucide-react";
import { motion } from "framer-motion";

const placeholderEvents = [
  { id: 1, name: "VEX Robotics State Championship", location: "Dallas, TX", date: "Mar 15, 2026", teams: 48 },
  { id: 2, name: "Spring Showdown Tournament", location: "Austin, TX", date: "Mar 22, 2026", teams: 32 },
  { id: 3, name: "Lone Star Classic", location: "Houston, TX", date: "Apr 5, 2026", teams: 40 },
];

export default function Events() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Events</h1>
          <p className="text-muted-foreground mt-1">Browse upcoming VEX competitions</p>
        </div>

        <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-4">
          Connect your RobotEvents API key to load real event data. These are placeholder events.
        </div>

        <div className="grid gap-4">
          {placeholderEvents.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border/50 card-gradient p-6 hover:border-primary/30 transition-all cursor-pointer"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="font-display font-semibold text-lg">{event.name}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{event.location}</span>
                    <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{event.date}</span>
                    <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{event.teams} teams</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Event Strength</div>
                  <div className="text-2xl stat-number text-primary">—</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
