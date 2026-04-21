import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Trophy, Loader2, Flame } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  getWorldSkillsRankings,
  getTeamRankings,
  SEASONS,
  type SeasonKey,
} from "@/lib/robotevents";
import { useSeason } from "@/contexts/SeasonContext";
import type { GradeLevel } from "@/contexts/SeasonContext";

interface HighScoreEntry {
  teamId: number;
  teamNumber: string;
  teamName: string;
  region: string;
  gradeLevel: string;
  highScore: number;
  eventId: number | null;
  eventName: string;
  divisionName: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function buildHighScoresPool(
  season: SeasonKey,
  gradeLevel: GradeLevel,
  onProgress: (entries: HighScoreEntry[], processed: number, total: number) => void,
): Promise<HighScoreEntry[]> {
  const fetchGrades: string[] =
    gradeLevel === "Both" ? ["High School", "Middle School"] : [gradeLevel];

  // Pull skills pool to identify top teams
  const skillsResults = await Promise.all(
    fetchGrades.map((g) => getWorldSkillsRankings(season, g).then((raw) => ({ raw, grade: g }))),
  );

  const teamMap = new Map<number, { id: number; number: string; name: string; region: string; grade: string; combined: number }>();
  skillsResults.forEach(({ raw, grade }) => {
    const arr = Array.isArray(raw) ? raw : [];
    arr.forEach((entry: any) => {
      const id = entry?.team?.id;
      const number = entry?.team?.team || entry?.team?.number;
      if (!id || !number) return;
      const combined = Number(entry?.scores?.score || 0);
      const existing = teamMap.get(id);
      if (!existing || combined > existing.combined) {
        teamMap.set(id, {
          id,
          number,
          name: entry?.team?.teamName || entry?.team?.team_name || "",
          region: entry?.team?.eventRegion || "",
          grade,
          combined,
        });
      }
    });
  });

  const candidates = Array.from(teamMap.values())
    .sort((a, b) => b.combined - a.combined)
    .slice(0, 500); // cap for performance

  const results: HighScoreEntry[] = [];

  for (let i = 0; i < candidates.length; i += 25) {
    const batch = candidates.slice(i, i + 25);
    await Promise.all(
      batch.map(async (team) => {
        try {
          const rankings = await getTeamRankings(team.id, season);
          if (!rankings || rankings.length === 0) return;
          // Find the ranking entry with the highest high_score
          let best: any = null;
          rankings.forEach((r: any) => {
            const hs = Number(r.high_score || 0);
            if (hs > 0 && (!best || hs > Number(best.high_score || 0))) best = r;
          });
          if (!best) return;
          results.push({
            teamId: team.id,
            teamNumber: team.number,
            teamName: team.name,
            region: team.region,
            gradeLevel: team.grade,
            highScore: Number(best.high_score),
            eventId: best.event?.id ?? null,
            eventName: best.event?.name || "Unknown event",
            divisionName: best.division?.name || "",
          });
        } catch {
          // ignore
        }
      }),
    );

    const sorted = [...results].sort((a, b) => b.highScore - a.highScore);
    onProgress(sorted, Math.min(i + 25, candidates.length), candidates.length);
    if (i + 25 < candidates.length) await sleep(50);
  }

  return results.sort((a, b) => b.highScore - a.highScore);
}

export default function HighScores() {
  const navigate = useNavigate();
  const { season, gradeLevel } = useSeason();
  const seasonInfo = SEASONS[season];

  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(50);
  const [streamed, setStreamed] = useState<HighScoreEntry[]>([]);
  const [progress, setProgress] = useState({ processed: 0, total: 0, done: false });

  const { data, isLoading } = useQuery({
    queryKey: ["highScoresGlobal", season, gradeLevel],
    queryFn: async () => {
      setStreamed([]);
      setProgress({ processed: 0, total: 0, done: false });
      const results = await buildHighScoresPool(season, gradeLevel, (entries, processed, total) => {
        setStreamed(entries);
        setProgress({ processed, total, done: false });
      });
      setProgress((p) => ({ ...p, done: true }));
      return results;
    },
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
  });

  const active = data ?? streamed;
  const filtered = active.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      e.teamNumber.toLowerCase().includes(q) ||
      e.teamName.toLowerCase().includes(q) ||
      e.region.toLowerCase().includes(q) ||
      e.eventName.toLowerCase().includes(q)
    );
  });

  const gradeBadge = gradeLevel === "Both" ? "All" : gradeLevel === "High School" ? "HS" : "MS";
  const top3 = active.slice(0, 3);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Flame className="h-7 w-7 text-primary" />
            Highest Scores
          </h1>
          <p className="text-muted-foreground mt-1">
            {seasonInfo.name} {seasonInfo.year} · Global record matches ·{" "}
            <span className="text-primary font-medium">{gradeBadge}</span>
          </p>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs text-muted-foreground leading-relaxed">
          <strong className="text-primary">How this works:</strong> The highest single-match qualification score posted by each team
          across the season's top 500 skills teams. These are the eye-popping numbers the elite teams have put up. Click any team or event for details.
        </div>

        {/* Top 3 podium */}
        {top3.length === 3 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {top3.map((entry, idx) => {
              const rank = idx + 1;
              const colors = [
                "border-yellow-500/40 bg-yellow-500/5",
                "border-zinc-400/40 bg-zinc-400/5",
                "border-orange-600/40 bg-orange-600/5",
              ];
              return (
                <motion.div
                  key={entry.teamId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => navigate(`/team/${entry.teamNumber}`)}
                  className={`rounded-xl border p-4 cursor-pointer hover:scale-[1.02] transition-transform ${colors[idx]}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className={rank === 1 ? "h-5 w-5 text-yellow-500" : rank === 2 ? "h-5 w-5 text-zinc-400" : "h-5 w-5 text-orange-600"} />
                    <span className="text-xs font-medium text-muted-foreground">#{rank}</span>
                  </div>
                  <div className="text-3xl stat-number text-primary">{entry.highScore}</div>
                  <div className="font-display font-semibold mt-1">{entry.teamNumber}</div>
                  <div className="text-xs text-muted-foreground truncate">{entry.teamName}</div>
                  <div className="text-xs text-muted-foreground mt-2 truncate">{entry.eventName}</div>
                </motion.div>
              );
            })}
          </div>
        )}

        <div className="relative max-w-md">
          <Input
            placeholder="Filter by team, region, or event..."
            className="bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isLoading && streamed.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Pulling high scores from the top teams worldwide...</p>
          </div>
        )}

        {isLoading && streamed.length > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Processing teams... {progress.processed}/{progress.total}</span>
              <span>{streamed.length} scores collected</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${(progress.processed / Math.max(progress.total, 1)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {filtered.length > 0 && (
          <>
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-1">#</div>
                <div className="col-span-2 text-center">Score</div>
                <div className="col-span-3">Team</div>
                <div className="col-span-4 hidden sm:block">Event</div>
                <div className="col-span-2 text-center hidden sm:block">Region</div>
              </div>
              {filtered.slice(0, displayCount).map((entry, i) => (
                <motion.div
                  key={`${entry.teamId}-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.01, 0.4) }}
                  className="grid grid-cols-12 gap-2 px-6 py-4 items-center border-t border-border/30 hover:bg-accent/30 transition-colors"
                >
                  <div className="col-span-1 stat-number text-muted-foreground">{i + 1}</div>
                  <div className="col-span-2 text-center">
                    <span className="stat-number text-primary text-lg">{entry.highScore}</span>
                  </div>
                  <div className="col-span-3">
                    <button
                      onClick={() => navigate(`/team/${entry.teamNumber}`)}
                      className="text-left w-full"
                    >
                      <div className="font-display font-semibold hover:text-primary transition-colors">{entry.teamNumber}</div>
                      <div className="text-xs text-muted-foreground truncate">{entry.teamName}</div>
                    </button>
                  </div>
                  <div className="col-span-4 hidden sm:block">
                    {entry.eventId ? (
                      <Link
                        to={`/event/${entry.eventId}`}
                        className="text-sm hover:text-primary transition-colors truncate block"
                      >
                        {entry.eventName}
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground truncate block">{entry.eventName}</span>
                    )}
                    {entry.divisionName && (
                      <div className="text-xs text-muted-foreground truncate">{entry.divisionName}</div>
                    )}
                  </div>
                  <div className="col-span-2 text-center text-xs text-muted-foreground hidden sm:block truncate">
                    {entry.region || "-"}
                  </div>
                </motion.div>
              ))}
            </div>
            {filtered.length > displayCount && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={() => setDisplayCount((c) => c + 50)}>
                  Show More ({filtered.length - displayCount} remaining)
                </Button>
              </div>
            )}
          </>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-sm text-muted-foreground rounded-lg border border-border/50 card-gradient p-8 text-center">
            No high scores found for {seasonInfo.name}.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
