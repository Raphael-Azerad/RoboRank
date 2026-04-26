import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import {
  Search,
  Pin,
  Radio,
  Target,
  Trophy,
  Swords,
  StickyNote,
  Users,
  TrendingUp,
  Calendar,
  Sparkles,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

interface Tip {
  icon: typeof Pin;
  title: string;
  body: string;
  link?: { label: string; to: string };
  tags: string[];
}

const TIPS: Tip[] = [
  {
    icon: Pin,
    title: "Pin events, teams & views",
    body: "Tap the pin icon on any event or team header to bookmark it. Pinned items appear at the top of your dashboard and sync across devices.",
    tags: ["pins", "dashboard", "bookmarks"],
  },
  {
    icon: Radio,
    title: "Live event mode",
    body: "When viewing an in-progress event, RoboRank shows a sticky HUD with your countdown, alliance partners, and on-deck match. Rankings auto-refresh every 30 seconds.",
    tags: ["live", "events", "matches"],
  },
  {
    icon: Target,
    title: "At-event dashboard preset",
    body: "Switch the dashboard mode toggle to “At-event” to surface quick-access scouting, prediction, and notes tools — perfect for the pit.",
    link: { label: "Open Dashboard", to: "/dashboard" },
    tags: ["dashboard", "modes", "scouting"],
  },
  {
    icon: Trophy,
    title: "Understanding RoboRank Score",
    body: "RoboRank is a 0–100 composite of win rate, skills score, awards, and schedule difficulty. Higher = stronger relative performance this season.",
    tags: ["roborank", "score", "analytics"],
  },
  {
    icon: TrendingUp,
    title: "Schedule Difficulty",
    body: "Shown on team profiles, this 0–100 metric averages the RoboRank of every opponent you faced in qualifications. High = brutal schedule.",
    tags: ["analytics", "matches"],
  },
  {
    icon: Swords,
    title: "Match Predictor",
    body: "Stack four teams into a 2v2 matchup and we'll project the win probability using a weighted sigmoid of RoboRank scores.",
    link: { label: "Try Predictor", to: "/predictor" },
    tags: ["predictor", "alliance"],
  },
  {
    icon: StickyNote,
    title: "Team notes & quick scout",
    body: "Notes are shared with approved teammates and tagged to specific teams. Open Comp Mode on any event for an inline note-taking flow.",
    link: { label: "Open Notes", to: "/notes" },
    tags: ["notes", "scouting", "teammates"],
  },
  {
    icon: Users,
    title: "Joining a team",
    body: "Add your team number on Profile → Team. The first member becomes Owner; later joiners need approval. Followers can view a team without joining it.",
    link: { label: "Open Profile", to: "/profile" },
    tags: ["account", "team"],
  },
  {
    icon: Calendar,
    title: "Browsing events",
    body: "Use Events to filter by season, region, or status. Open any event for divisions, brackets, rankings, and a livestream link when available.",
    link: { label: "Browse Events", to: "/events" },
    tags: ["events"],
  },
  {
    icon: Sparkles,
    title: "Season & grade filters",
    body: "Top-right of every page: pick a season and grade level (HS / MS / Both). Your selection is saved locally and applied everywhere.",
    tags: ["filters", "season"],
  },
];

export default function Help() {
  const [q, setQ] = useState("");
  useDocumentMeta({
    title: "Help & Tips · RoboRank",
    description: "Quick tips and how-tos for getting the most out of RoboRank — pins, live mode, scouting, and more.",
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return TIPS;
    return TIPS.filter(
      (t) =>
        t.title.toLowerCase().includes(needle) ||
        t.body.toLowerCase().includes(needle) ||
        t.tags.some((tag) => tag.includes(needle)),
    );
  }, [q]);

  return (
    <AppLayout>
      <div className="container max-w-5xl py-6 sm:py-10 px-4 space-y-6">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl border border-border/60 card-gradient overflow-hidden"
        >
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative p-6 sm:p-8">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary mb-2">
              <HelpCircle className="h-3.5 w-3.5" /> Help center
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Tips & How-Tos</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-xl">
              Short guides for the things people miss most. Search, or scroll the whole list.
            </p>
            <div className="relative mt-5 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search tips… (e.g. pins, live, schedule)"
                className="pl-9 h-11"
              />
            </div>
          </div>
        </motion.section>

        {/* Tips grid */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-border/50 card-gradient p-10 text-center">
            <div className="text-sm text-muted-foreground">No tips match “{q}”.</div>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            {filtered.map((tip, i) => {
              const Icon = tip.icon;
              return (
                <motion.div
                  key={tip.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.2) }}
                  className="group rounded-xl border border-border/50 card-gradient p-5 transition-all hover:border-primary/40 hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.3)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 ring-1 ring-primary/20 p-2 shrink-0">
                      <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display font-semibold text-sm sm:text-base">{tip.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">{tip.body}</p>
                      {tip.link && (
                        <Link
                          to={tip.link.to}
                          className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-primary hover:underline"
                        >
                          {tip.link.label} <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Footer CTA */}
        <div className="rounded-xl border border-border/50 card-gradient p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div>
            <h3 className="font-display font-semibold">Still stuck?</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Reach out and we'll get back within a day.
            </p>
          </div>
          <Link
            to="/contact"
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 h-10 text-sm font-semibold hover:bg-primary/90 transition-colors active:scale-[0.97]"
          >
            Contact support <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
