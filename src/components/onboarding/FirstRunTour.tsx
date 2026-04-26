/**
 * Lightweight first-run tour shown once on the Dashboard.
 * Stores dismissal in localStorage; no backend needed.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Pin, Radio, Target, ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const STORAGE_KEY = "roborank-first-run-tour-v1";

const STEPS = [
  {
    icon: Sparkles,
    title: "Welcome to RoboRank",
    body: "Your scouting and analytics command center for VEX V5. Let's take a 20-second tour of what's new.",
  },
  {
    icon: Pin,
    title: "Pin anything",
    body: "Star events, teams, or views to bring them to the top of your dashboard. Look for the pin icon in headers.",
  },
  {
    icon: Radio,
    title: "Live event mode",
    body: "Open any active event to see a sticky countdown to your next match — rankings auto-refresh every 30 seconds.",
  },
  {
    icon: Target,
    title: "Switch dashboard mode",
    body: "Use the toggle in the hero to swap to “At-event” for quick-access scouting tools when you're on the field.",
    cta: { label: "Open Help & Tips", to: "/help" },
  },
] as const;

export function FirstRunTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(STORAGE_KEY)) {
      // Slight delay so the dashboard paints first
      const t = setTimeout(() => setOpen(true), 700);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setOpen(false);
  };

  if (!open) return null;
  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-background/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        onClick={dismiss}
      >
        <motion.div
          initial={{ y: 24, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 12, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md rounded-2xl border border-border/60 card-gradient shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.4)] overflow-hidden"
        >
          {/* Ambient glow */}
          <div className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />

          <button
            onClick={dismiss}
            aria-label="Skip tour"
            className="absolute top-3 right-3 z-10 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative p-6 sm:p-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-primary/15 ring-1 ring-primary/30 p-2.5">
                <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground tabular-nums">
                Step {step + 1} of {STEPS.length}
              </div>
            </div>

            <h2 className="font-display text-xl font-bold mb-2">{s.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>

            {/* Progress dots */}
            <div className="flex items-center gap-1.5 mt-5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? "w-8 bg-primary" : i < step ? "w-1.5 bg-primary/50" : "w-1.5 bg-border"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between gap-2 mt-6">
              <Button variant="ghost" size="sm" onClick={dismiss}>
                Skip
              </Button>
              <div className="flex items-center gap-2">
                {"cta" in s && s.cta && isLast && (
                  <Button asChild variant="outline" size="sm" onClick={dismiss}>
                    <Link to={s.cta.to}>{s.cta.label}</Link>
                  </Button>
                )}
                {!isLast ? (
                  <Button size="sm" variant="hero" onClick={() => setStep((n) => n + 1)} className="gap-1.5">
                    Next <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button size="sm" variant="hero" onClick={dismiss} className="gap-1.5">
                    <Check className="h-3.5 w-3.5" /> Got it
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
