import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Award } from "lucide-react";

interface AwardsHeatmapProps {
  awards: any[] | undefined;
  className?: string;
}

interface HeatCell {
  category: string;
  count: number;
  intensity: number; // 0-1
}

/**
 * Categorizes an award title into a coarse bucket so we can group
 * "Tournament Champion (1st place)" with "Tournament Champions" etc.
 */
function categorize(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("tournament champion")) return "Tournament Champion";
  if (t.includes("excellence")) return "Excellence";
  if (t.includes("design")) return "Design";
  if (t.includes("judges")) return "Judges";
  if (t.includes("think")) return "Think";
  if (t.includes("innovate")) return "Innovate";
  if (t.includes("create")) return "Create";
  if (t.includes("amaze")) return "Amaze";
  if (t.includes("build")) return "Build";
  if (t.includes("inspire")) return "Inspire";
  if (t.includes("energy")) return "Energy";
  if (t.includes("sportsmanship")) return "Sportsmanship";
  if (t.includes("skills") && t.includes("champion")) return "Robot Skills Champion";
  if (t.includes("skills")) return "Skills";
  if (t.includes("finalist")) return "Tournament Finalist";
  if (t.includes("semifinal")) return "Semifinalist";
  if (t.includes("division")) return "Division";
  if (t.includes("alliance")) return "Alliance Selection";
  if (t.includes("service")) return "Service";
  if (t.includes("teacher") || t.includes("mentor")) return "Mentor";
  if (t.includes("community")) return "Community";
  return "Other";
}

export function AwardsHeatmap({ awards, className }: AwardsHeatmapProps) {
  const cells: HeatCell[] = useMemo(() => {
    if (!awards || awards.length === 0) return [];
    const counts = new Map<string, number>();
    awards.forEach((a: any) => {
      const cat = categorize(a.title || "Other");
      counts.set(cat, (counts.get(cat) || 0) + 1);
    });
    const max = Math.max(...counts.values(), 1);
    return Array.from(counts.entries())
      .map(([category, count]) => ({
        category,
        count,
        intensity: count / max,
      }))
      .sort((a, b) => b.count - a.count);
  }, [awards]);

  if (cells.length === 0) return null;

  return (
    <div className={cn("rounded-xl border border-border/50 card-gradient p-5", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          <h3 className="font-display font-semibold text-sm">Awards Heatmap</h3>
        </div>
        <span className="text-xs text-muted-foreground">{cells.length} categories</span>
      </div>
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
        {cells.map((cell) => (
          <div
            key={cell.category}
            className="rounded-lg border border-border/30 px-3 py-2.5 flex flex-col gap-1 transition-colors"
            style={{
              backgroundColor: `hsl(var(--primary) / ${0.08 + cell.intensity * 0.32})`,
              borderColor: `hsl(var(--primary) / ${0.2 + cell.intensity * 0.4})`,
            }}
            title={`${cell.category}: ${cell.count} award${cell.count === 1 ? "" : "s"}`}
          >
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
              {cell.category}
            </span>
            <span className="stat-number text-lg leading-none text-foreground">{cell.count}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Color intensity reflects how often this team has won each award category.
      </p>
    </div>
  );
}
