import { AppLayout } from "@/components/layout/AppLayout";
import { Search, FileText, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

export default function Scouting() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Scouting Reports</h1>
          <p className="text-muted-foreground mt-1">Generate detailed reports for upcoming events</p>
        </div>

        {/* Search */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search events by name or SKU..." className="pl-10 bg-card" />
          </div>
          <Button variant="hero">Generate Report</Button>
        </div>

        <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-4">
          Connect your RobotEvents API key to search real events and generate scouting reports.
        </div>

        {/* Empty State */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border/50 card-gradient p-12 text-center"
        >
          <div className="mx-auto mb-4 inline-flex rounded-full bg-primary/10 p-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-display font-semibold mb-2">No Reports Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Search for an event above to generate your first scouting report. Reports include team ratings,
            match predictions, and schedule difficulty analysis.
          </p>
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            Reports are private to your team
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
