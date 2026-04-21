import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Reusable empty-state component used across pages instead of bare "No data" strings.
 * Provides a soft icon badge, title, optional description and optional CTA slot.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = "md",
}: EmptyStateProps) {
  const padding = size === "sm" ? "p-6" : size === "lg" ? "p-12" : "p-8";
  const iconSize = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-10 w-10";
  const iconWrap = size === "sm" ? "h-12 w-12" : size === "lg" ? "h-20 w-20" : "h-16 w-16";

  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 card-gradient text-center flex flex-col items-center gap-3",
        padding,
        className,
      )}
    >
      <div
        className={cn(
          "rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/20",
          iconWrap,
        )}
      >
        <Icon className={cn("text-primary/80", iconSize)} />
      </div>
      <div className="space-y-1">
        <h3 className="font-display font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
