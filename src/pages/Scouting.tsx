import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Search, FileText, Lock, Loader2, Download, ChevronDown, ChevronUp, Trophy, Target, Zap, Medal, BarChart3, Clock } from "lucide-react";
import { useTeamStatus } from "@/hooks/useTeamStatus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAllPages, getTeamByNumber, getTeamEvents, SEASONS } from "@/lib/robotevents";
import { useSeason } from "@/contexts/SeasonContext";

import { generateScoutingReport, downloadCSV, downloadExcel, type ScoutingReport } from "@/lib/scoutingReport";
import { RoboRankScore } from "@/components/dashboard/RoboRankScore";
import { toast } from "sonner";

type SortField = "roboRank" | "matches" | "winPct" | "wins" | "totalAwards" | "combinedSkills";

export default function Scouting() {
  const navigate = useNavigate();
  const { season } = useSeason();
  
  const queryClient = useQueryClient();
  const { status: teamStatus } = useTeamStatus();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [teamNumber, setTeamNumber] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [viewingReport, setViewingReport] = useState<ScoutingReport | null>(null);
  const [sortField, setSortField] = useState<SortField>("roboRank");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedLeaderboard, setExpandedLeaderboard] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Get user info
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const tn = data.user?.user_metadata?.team_number;
      setTeamNumber(tn || null);
    });
  }, []);

  const { data: teamData } = useQuery({
    queryKey: ["team", teamNumber],
    queryFn: () => getTeamByNumber(teamNumber!),
    enabled: !!teamNumber,
  });

  useEffect(() => {
    if (teamData?.id) setTeamId(teamData.id);
  }, [teamData]);

  // Get team's events
  const { data: myEvents } = useQuery({
    queryKey: ["myEventsForScouting", teamId, season],
    queryFn: () => getTeamEvents(teamId!, season),
    enabled: !!teamId,
  });

  // Get existing reports
  const { data: existingReports } = useQuery({
    queryKey: ["scoutingReports"],
    queryFn: async () => {
      const { data } = await supabase.from("scouting_reports").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Free for everyone — unlimited reports
  const canGenerate = true;

  // Check if team has events this season
  const hasSeasonEvents = myEvents && myEvents.length > 0;

  // Filter events by search
  const filteredEvents = useMemo(() => {
    if (!myEvents) return [];
    if (!debouncedSearch) return myEvents;
    const q = debouncedSearch.toLowerCase();
    return myEvents.filter((e: any) => {
      const name = (e.name || "").toLowerCase();
      const sku = (e.sku || "").toLowerCase();
      return name.includes(q) || sku.includes(q);
    });
  }, [myEvents, debouncedSearch]);

  // Generate report mutation
  const generateMutation = useMutation({
    mutationFn: async (event: any) => {
      const divId = event.divisions?.[0]?.id || 1;
      const report = await generateScoutingReport(
        event.id, divId, event.name,
        new Date(event.start).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        season
      );
      // Save to DB
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("scouting_reports").insert({
          event_id: event.id,
          event_name: event.name,
          user_id: user.id,
          report_data: report as any,
        });
      }
      return report;
    },
    onSuccess: (report) => {
      setViewingReport(report);
      queryClient.invalidateQueries({ queryKey: ["scoutingReports"] });
      toast.success("Scouting report generated!");
    },
    onError: (err: Error) => {
      toast.error(`Failed: ${err.message}`);
    },
  });

  const handleGenerate = (event: any) => {
    if (teamStatus === "pending") {
      toast.error("Your team membership is pending approval. You can't generate reports yet.");
      return;
    }
    if (!teamNumber) {
      toast.error("You need a team to generate scouting reports");
      return;
    }
    if (!hasSeasonEvents) {
      toast.error("Your team has no events this season.");
      return;
    }
    if (!canGenerate) {
      toast.error("Free tier limit reached (1 report/month). Upgrade for unlimited.");
      return;
    }
    // Check if already have a report for this event
    const existing = existingReports?.find(r => r.event_id === event.id);
    if (existing) {
      setViewingReport(existing.report_data as any);
      return;
    }
    generateMutation.mutate(event);
  };

  const sortedTeams = useMemo(() => {
    if (!viewingReport) return [];
    const teams = [...viewingReport.teams];
    teams.sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortField) {
        case "matches": aVal = a.matches; bVal = b.matches; break;
        case "winPct": aVal = parseFloat(a.winPct); bVal = parseFloat(b.winPct); break;
        case "wins": aVal = a.wins; bVal = b.wins; break;
        case "totalAwards": aVal = a.totalAwards; bVal = b.totalAwards; break;
        case "combinedSkills": aVal = a.combinedSkills; bVal = b.combinedSkills; break;
        default: aVal = a.roboRank; bVal = b.roboRank;
      }
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
    return teams;
  }, [viewingReport, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  };

  // If viewing a report, show it
  if (viewingReport) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <Button variant="ghost" size="sm" className="mb-2" onClick={() => setViewingReport(null)}>
                ← Back to Reports
              </Button>
              <h1 className="text-2xl font-display font-bold">{viewingReport.eventName}</h1>
              <p className="text-sm text-muted-foreground">{viewingReport.eventDate} · {viewingReport.teams.length} teams</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => downloadCSV(viewingReport)} className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => downloadExcel(viewingReport)} className="gap-1.5">
                <Download className="h-3.5 w-3.5" /> Excel
              </Button>
            </div>
          </div>

          {/* Main Stats Table */}
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <div className="px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              All Teams - Click column headers to sort
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-xs">
                <thead>
                  <tr className="border-b border-border/30 bg-muted/30">
                    {[
                      { label: "Team", field: null },
                      { label: "RoboRank", field: "roboRank" as SortField },
                      { label: "Record", field: null },
                      { label: "Matches", field: "matches" as SortField },
                      { label: "Win %", field: "winPct" as SortField },
                      { label: "Skills", field: "combinedSkills" as SortField },
                      { label: "Driver", field: null },
                      { label: "Auton", field: null },
                      { label: "Awards", field: "totalAwards" as SortField },
                      { label: "Global", field: null },
                    ].map(({ label, field }) => (
                      <th
                        key={label}
                        onClick={() => field && handleSort(field)}
                        className={cn(
                          "py-2 px-3 text-left text-[10px] uppercase tracking-wider font-medium",
                          field ? "cursor-pointer hover:text-primary" : "",
                          sortField === field ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        <span className="flex items-center gap-1">
                          {label}
                          {sortField === field && (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedTeams.map((t, i) => (
                    <tr
                      key={t.teamNumber}
                      onClick={() => navigate(`/team/${t.teamNumber}`)}
                      className="border-b border-border/10 hover:bg-accent/30 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-display font-semibold text-sm">{t.teamNumber}</div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{t.teamName}</div>
                      </td>
                      <td className="py-2.5 px-3"><RoboRankScore score={t.roboRank} size="sm" /></td>
                      <td className="py-2.5 px-3 stat-number">{t.record}</td>
                      <td className="py-2.5 px-3 stat-number">{t.matches}</td>
                      <td className="py-2.5 px-3 stat-number">{t.winPct}</td>
                      <td className="py-2.5 px-3 stat-number text-primary">{t.combinedSkills}</td>
                      <td className="py-2.5 px-3 stat-number">{t.highestDriver}</td>
                      <td className="py-2.5 px-3 stat-number">{t.highestAuton}</td>
                      <td className="py-2.5 px-3 stat-number">{t.totalAwards}</td>
                      <td className="py-2.5 px-3 stat-number text-muted-foreground">{t.globalRank}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ranked Leaderboards */}
          {[
            { key: "matches", label: "By Matches Played", icon: Target, sort: (a: any, b: any) => b.matches - a.matches, display: (t: any) => `${t.matches} matches` },
            { key: "winPct", label: "By Win Rate", icon: Trophy, sort: (a: any, b: any) => parseFloat(b.winPct) - parseFloat(a.winPct), display: (t: any) => t.winPct },
            { key: "wins", label: "By Total Wins", icon: Trophy, sort: (a: any, b: any) => b.wins - a.wins, display: (t: any) => `${t.wins} wins` },
            { key: "awards", label: "By Awards", icon: Medal, sort: (a: any, b: any) => b.totalAwards - a.totalAwards, display: (t: any) => `${t.totalAwards} awards` },
            { key: "skills", label: "By Skills", icon: Zap, sort: (a: any, b: any) => b.combinedSkills - a.combinedSkills, display: (t: any) => `${t.combinedSkills} (D:${t.highestDriver} P:${t.highestAuton})` },
          ].map(({ key, label, icon: Icon, sort, display }) => {
            const sorted = [...viewingReport.teams].sort(sort);
            const isExpanded = expandedLeaderboard === key;
            return (
              <div key={key} className="rounded-xl border border-border/50 overflow-hidden">
                <button
                  onClick={() => setExpandedLeaderboard(isExpanded ? null : key)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    <Icon className="h-3.5 w-3.5 text-primary" /> {label}
                  </span>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                {isExpanded && (
                  <div className="divide-y divide-border/10">
                    {sorted.map((t, i) => (
                      <div key={t.teamNumber} className="flex items-center justify-between px-4 py-2 text-xs hover:bg-accent/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="stat-number text-muted-foreground w-6">{i + 1}</span>
                          <span className="font-display font-semibold">{t.teamNumber}</span>
                          <span className="text-muted-foreground truncate max-w-[150px]">{t.teamName}</span>
                        </div>
                        <span className="stat-number text-primary">{display(t)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Scouting Reports</h1>
          <p className="text-muted-foreground mt-1">Generate detailed reports for your events</p>
        </div>

        {teamStatus === "pending" && (
          <div className="rounded-lg border border-[hsl(var(--chart-4))]/30 bg-[hsl(var(--chart-4))]/5 px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-[hsl(var(--chart-4))] shrink-0" />
            Your team membership is pending approval. You can view existing reports but can't generate new ones until approved.
          </div>
        )}

        {!teamNumber && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-muted-foreground">
            <Lock className="h-4 w-4 inline mr-2 text-destructive" />
            You need a team to generate scouting reports. Connect a team in your profile.
          </div>
        )}

        {teamNumber && !hasSeasonEvents && myEvents !== undefined && (
          <div className="rounded-lg border border-[hsl(var(--chart-4))]/30 bg-[hsl(var(--chart-4))]/5 px-4 py-3 text-sm text-muted-foreground">
            Your team has no events this season yet.
          </div>
        )}

        {/* Search */}
        {teamNumber && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search your events by name or SKU..."
              className="pl-10 bg-card"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {/* My Events to Scout */}
        {teamNumber && filteredEvents && filteredEvents.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Your Events</h2>
            <div className="grid gap-2">
              {filteredEvents.map((event: any) => {
                const hasReport = existingReports?.some(r => r.event_id === event.id);
                const isCompleted = new Date(event.end || event.start) < new Date();
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-border/50 card-gradient p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <h3 className="font-display font-semibold text-sm truncate">{event.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>{new Date(event.start).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        {event.location && <span>{event.location.city}, {event.location.region}</span>}
                        <span className={isCompleted ? "text-muted-foreground/60" : "text-primary"}>
                          {isCompleted ? "Completed" : "Upcoming"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {hasReport ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const report = existingReports?.find(r => r.event_id === event.id);
                            if (report) setViewingReport(report.report_data as any);
                          }}
                          className="gap-1.5"
                        >
                          <FileText className="h-3.5 w-3.5" /> View Report
                        </Button>
                      ) : (
                        <Button
                          variant="hero"
                          size="sm"
                          onClick={() => handleGenerate(event)}
                          disabled={generateMutation.isPending || !canGenerate}
                          className="gap-1.5"
                        >
                          {generateMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <BarChart3 className="h-3.5 w-3.5" />
                          )}
                          Generate
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/event/${event.id}`)}>
                        Details
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Previous Reports */}
        {existingReports && existingReports.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Previous Reports</h2>
            <div className="grid gap-2">
              {existingReports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => setViewingReport(report.report_data as any)}
                  className="rounded-xl border border-border/50 card-gradient p-4 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-all"
                >
                  <div>
                    <h3 className="font-display font-semibold text-sm">{report.event_name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Generated {new Date(report.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <FileText className="h-5 w-5 text-primary" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state if no team or no events */}
        {(!teamNumber || !filteredEvents || filteredEvents.length === 0) && (!existingReports || existingReports.length === 0) && (
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
              {teamNumber
                ? "Your team's events will appear above. Generate a scouting report for any event you're registered for."
                : "Connect a team to your account to start generating scouting reports."}
            </p>
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Reports are private to your team
            </div>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
}
