import { Loader2, ArrowDown } from "lucide-react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface Props {
  onRefresh: () => void | Promise<unknown>;
  children: React.ReactNode;
  className?: string;
}

/**
 * Drop-in pull-to-refresh wrapper. Listens to document scroll on mobile only;
 * desktop pass-through.
 */
export function PullToRefresh({ onRefresh, children, className }: Props) {
  const isMobile = useIsMobile();
  const { pull, refreshing, threshold } = usePullToRefresh({
    onRefresh,
    disabled: !isMobile,
  });

  const ready = pull > threshold;

  return (
    <div className={cn("relative", className)}>
      {/* Indicator */}
      <div
        aria-hidden
        className="md:hidden pointer-events-none fixed left-0 right-0 z-40 flex justify-center"
        style={{
          top: "env(safe-area-inset-top)",
          transform: `translateY(${Math.max(0, pull - 24)}px)`,
          opacity: pull > 8 || refreshing ? 1 : 0,
          transition: refreshing ? "transform 200ms ease" : pull === 0 ? "transform 250ms ease, opacity 200ms ease" : "none",
        }}
      >
        <div
          className={cn(
            "h-9 w-9 rounded-full border bg-card/95 backdrop-blur-md shadow-lg flex items-center justify-center transition-colors",
            ready || refreshing ? "border-primary/60 text-primary" : "border-border text-muted-foreground"
          )}
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowDown
              className={cn(
                "h-4 w-4 transition-transform",
                ready && "rotate-180"
              )}
            />
          )}
        </div>
      </div>
      {/* Push content down slightly while pulling for tactile feedback */}
      <div
        style={{
          transform: pull > 0 || refreshing ? `translateY(${Math.min(pull * 0.4, 24)}px)` : undefined,
          transition: pull === 0 ? "transform 250ms ease" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
