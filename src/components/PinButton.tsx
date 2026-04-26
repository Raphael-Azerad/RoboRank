/**
 * Universal Pin button — drop into any page header to let users
 * star the current view to their personal pins.
 */
import { Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePins, type PinInput } from "@/hooks/usePins";
import { cn } from "@/lib/utils";

interface PinButtonProps extends PinInput {
  size?: "default" | "sm" | "icon";
  variant?: "ghost" | "outline" | "secondary";
  className?: string;
  showLabel?: boolean;
}

export function PinButton({
  kind, ref: refId, label, sublabel, route, icon,
  size = "sm",
  variant = "outline",
  className,
  showLabel = false,
}: PinButtonProps) {
  const { isPinned, togglePin, signedIn } = usePins();
  const pinned = isPinned(kind, refId);

  if (!signedIn) return null;

  return (
    <Button
      type="button"
      variant={pinned ? "secondary" : variant}
      size={size}
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); togglePin({ kind, ref: refId, label, sublabel, route, icon }); }}
      className={cn(
        "gap-1.5 transition-all",
        pinned && "border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20",
        className,
      )}
      title={pinned ? "Unpin" : "Pin to dashboard"}
      aria-pressed={pinned}
    >
      {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
      {showLabel && (pinned ? "Pinned" : "Pin")}
    </Button>
  );
}
