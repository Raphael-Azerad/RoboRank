/**
 * Pinned section on the Dashboard — quick-access list of the user's
 * starred events, teams, and views. Personal-only (RLS).
 */
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Pin as PinIcon, Calendar, Users, Eye, X } from "lucide-react";
import { usePins } from "@/hooks/usePins";
import { cn } from "@/lib/utils";

const KIND_ICON = {
  event: Calendar,
  team: Users,
  view: Eye,
} as const;

export function PinnedSection() {
  const { pins, removePin, loading, signedIn } = usePins();

  if (!signedIn || loading || pins.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-xl border border-border/50 card-gradient overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <PinIcon className="h-4 w-4 text-primary" />
          <h3 className="font-display font-semibold text-sm">Pinned</h3>
          <span className="text-[11px] text-muted-foreground tabular-nums">{pins.length}</span>
        </div>
        <span className="text-[11px] text-muted-foreground hidden sm:inline">Tap a pin to jump back</span>
      </div>
      <div className="p-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false}>
          {pins.map((pin) => {
            const Icon = KIND_ICON[pin.kind] ?? PinIcon;
            return (
              <motion.div
                key={pin.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                className="group relative"
              >
                <Link
                  to={pin.route}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border border-border/50 bg-background/40 px-3 py-2.5",
                    "transition-all duration-150 hover:border-primary/40 hover:bg-accent/40 active:scale-[0.98]",
                  )}
                >
                  <div className="rounded-md bg-primary/10 ring-1 ring-primary/20 p-1.5 shrink-0">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{pin.label}</div>
                    {pin.sublabel && (
                      <div className="text-[11px] text-muted-foreground truncate">{pin.sublabel}</div>
                    )}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); removePin(pin.id); }}
                  className={cn(
                    "absolute top-1.5 right-1.5 rounded-md p-1 opacity-0 group-hover:opacity-100 transition-opacity",
                    "hover:bg-destructive/15 text-muted-foreground hover:text-destructive",
                  )}
                  aria-label={`Remove pin ${pin.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
