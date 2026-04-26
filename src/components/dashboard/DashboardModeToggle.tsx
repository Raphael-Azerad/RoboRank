/**
 * Compact toggle to switch between Dashboard layout presets.
 * "Default" — full overview. "At-event" — live HUD + pins + quick scout up top.
 */
import { LayoutDashboard, Radio } from "lucide-react";
import { useDashboardMode, type DashboardMode } from "@/hooks/useDashboardMode";
import { cn } from "@/lib/utils";

const OPTIONS: { value: DashboardMode; label: string; icon: typeof Radio; hint: string }[] = [
  { value: "default", label: "Default", icon: LayoutDashboard, hint: "Full overview" },
  { value: "at-event", label: "At-event", icon: Radio, hint: "Live match focus" },
];

export function DashboardModeToggle() {
  const { mode, setMode } = useDashboardMode();
  return (
    <div
      role="tablist"
      aria-label="Dashboard layout"
      className="inline-flex items-center gap-0.5 rounded-lg border border-border/60 bg-background/60 p-0.5"
    >
      {OPTIONS.map((opt) => {
        const active = mode === opt.value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => setMode(opt.value)}
            title={opt.hint}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
              "press-soft",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40",
            )}
          >
            <opt.icon className="h-3.5 w-3.5" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
