import {
  fetchAllPages, fetchRobotEvents, getEventTeams, getEventSkills,
  getEventRankings, getTeamRankings, getTeamSkillsScore, getTeamAwards,
  calculateRoboRank, calculateRecordFromRankings,
  type SeasonKey, SEASONS,
} from "./robotevents";

export interface ScoutingTeamData {
  teamNumber: string;
  teamName: string;
  teamId: number;
  record: string;
  matches: number;
  winPct: string;
  combinedSkills: number;
  highestDriver: number;
  highestAuton: number;
  globalRank: number | string;
  tournChamp: number;
  excAwrs: number;
  designAwrs: number;
  totalAwards: number;
  wins: number;
  roboRank: number;
}

export interface ScoutingReport {
  eventId: number;
  eventName: string;
  eventDate: string;
  teams: ScoutingTeamData[];
  generatedAt: string;
}

export async function generateScoutingReport(
  eventId: number,
  divisionId: number,
  eventName: string,
  eventDate: string,
  season: SeasonKey = "current"
): Promise<ScoutingReport> {
  // 1. Get all teams at the event
  const teams = await getEventTeams(eventId);
  if (!teams || teams.length === 0) throw new Error("No teams found at this event");

  // 2. Get event skills
  const eventSkills = await getEventSkills(eventId).catch(() => []);
  const skillsMap = new Map<number, { driver: number; prog: number }>();
  (eventSkills || []).forEach((s: any) => {
    const tid = s.team?.id;
    if (!tid) return;
    if (!skillsMap.has(tid)) skillsMap.set(tid, { driver: 0, prog: 0 });
    const e = skillsMap.get(tid)!;
    if (s.type === "driver" && s.score > e.driver) e.driver = s.score;
    if (s.type === "programming" && s.score > e.prog) e.prog = s.score;
  });

  // 3. Get event rankings
  const rankingsData = await getEventRankings(eventId, divisionId).catch(() => null);
  const eventRankings = rankingsData?.data || rankingsData || [];
  const rankingsMap = new Map<number, any>();
  if (Array.isArray(eventRankings)) {
    eventRankings.forEach((r: any) => {
      if (r.team?.id) rankingsMap.set(r.team.id, r);
    });
  }

  // 4. Get global skills rankings for the season
  let globalSkillsRankings: any[] = [];
  try {
    const seasonId = SEASONS[season].id;
    const result = await fetchRobotEvents(`/seasons/${seasonId}/skills`, { grade_level: "High School" });
    globalSkillsRankings = result || [];
  } catch { /* ignore */ }

  const globalRankMap = new Map<number, number>();
  if (Array.isArray(globalSkillsRankings)) {
    globalSkillsRankings.forEach((entry: any, idx: number) => {
      if (entry.team?.id) globalRankMap.set(entry.team.id, idx + 1);
    });
  }

  // 5. For each team, gather stats (batched)
  const teamResults: ScoutingTeamData[] = [];

  for (let i = 0; i < teams.length; i += 10) {
    const batch = teams.slice(i, i + 10);
    await Promise.all(batch.map(async (team: any) => {
      try {
        const [seasonRankings, seasonSkills, seasonAwards] = await Promise.all([
          getTeamRankings(team.id, season),
          getTeamSkillsScore(team.id, season),
          getTeamAwards(team.id, season).catch(() => []),
        ]);

        const record = calculateRecordFromRankings(seasonRankings);
        const rr = calculateRoboRank(seasonRankings, seasonSkills);

        // Skills from event
        const teamSkills = skillsMap.get(team.id) || { driver: 0, prog: 0 };

        // Use season-best skills if event skills are 0
        let highDriver = teamSkills.driver;
        let highProg = teamSkills.prog;
        if (highDriver === 0 && highProg === 0) {
          // Fetch team's season skills directly
          try {
            const allSkills = await fetchAllPages(`/teams/${team.id}/skills`, { "season[]": SEASONS[season].id });
            allSkills.forEach((s: any) => {
              if (s.type === "driver" && s.score > highDriver) highDriver = s.score;
              if (s.type === "programming" && s.score > highProg) highProg = s.score;
            });
          } catch { /* ignore */ }
        }

        // Awards counting
        let tournChamp = 0, excAwrs = 0, designAwrs = 0, totalAwards = 0;
        if (Array.isArray(seasonAwards)) {
          seasonAwards.forEach((a: any) => {
            const title = (a.title || "").toLowerCase();
            // Check if this team actually won the award
            const isWinner = a.teamWinners?.some((w: any) =>
              w.team?.id === team.id || w.team?.name === team.number
            ) || a.qualifications?.some((q: any) =>
              q.team?.id === team.id || q.team?.name === team.number
            );
            if (!isWinner) return;
            
            totalAwards++;
            if (title.includes("tournament champion") || title.includes("division champion")) tournChamp++;
            if (title.includes("excellence")) excAwrs++;
            if (title.includes("design")) designAwrs++;
          });
        }

        const globalRank = globalRankMap.get(team.id) || "N/A";

        teamResults.push({
          teamNumber: team.number || team.name || "",
          teamName: team.team_name || "",
          teamId: team.id,
          record: `${record.wins}-${record.losses}-${record.ties}`,
          matches: record.total,
          winPct: record.total > 0 ? `${record.winRate}%` : "0%",
          combinedSkills: highDriver + highProg,
          highestDriver: highDriver,
          highestAuton: highProg,
          globalRank,
          tournChamp,
          excAwrs,
          designAwrs,
          totalAwards,
          wins: record.wins,
          roboRank: rr,
        });
      } catch {
        teamResults.push({
          teamNumber: team.number || team.name || "",
          teamName: team.team_name || "",
          teamId: team.id,
          record: "0-0-0",
          matches: 0,
          winPct: "0%",
          combinedSkills: 0,
          highestDriver: 0,
          highestAuton: 0,
          globalRank: "N/A",
          tournChamp: 0,
          excAwrs: 0,
          designAwrs: 0,
          totalAwards: 0,
          wins: 0,
          roboRank: 0,
        });
      }
    }));
  }

  return {
    eventId,
    eventName,
    eventDate,
    teams: teamResults.sort((a, b) => b.roboRank - a.roboRank),
    generatedAt: new Date().toISOString(),
  };
}

// Export to CSV
export function reportToCSV(report: ScoutingReport): string {
  const headers = [
    "Team", "Team Name", "RoboRank", "Tourn Champ", "Exc Awrs", "Design Awrs",
    "Total Awards", "Record", "Matches", "Win %", "Combined Skills",
    "Highest Driver", "Highest Auton", "Global Rank"
  ];
  
  const rows = report.teams.map(t => [
    t.teamNumber, `"${t.teamName}"`, t.roboRank, t.tournChamp, t.excAwrs, t.designAwrs,
    t.totalAwards, t.record, t.matches, t.winPct, t.combinedSkills,
    t.highestDriver, t.highestAuton, t.globalRank,
  ].join(","));
  
  // Add ranked leaderboards
  const byMatches = [...report.teams].sort((a, b) => b.matches - a.matches);
  const byWinPct = [...report.teams].sort((a, b) => parseFloat(b.winPct) - parseFloat(a.winPct));
  const byWins = [...report.teams].sort((a, b) => b.wins - a.wins);
  const byAwards = [...report.teams].sort((a, b) => b.totalAwards - a.totalAwards);
  const bySkills = [...report.teams].sort((a, b) => b.combinedSkills - a.combinedSkills);
  
  let csv = headers.join(",") + "\n" + rows.join("\n");
  
  csv += "\n\n--- Ranked by Matches ---\nRank,Team #,Team Name,Matches\n";
  byMatches.forEach((t, i) => csv += `${i+1},${t.teamNumber},"${t.teamName}",${t.matches}\n`);
  
  csv += "\n--- Ranked by Win % ---\nRank,Team #,Team Name,Win %\n";
  byWinPct.forEach((t, i) => csv += `${i+1},${t.teamNumber},"${t.teamName}",${t.winPct}\n`);
  
  csv += "\n--- Ranked by Wins ---\nRank,Team #,Team Name,Wins\n";
  byWins.forEach((t, i) => csv += `${i+1},${t.teamNumber},"${t.teamName}",${t.wins}\n`);
  
  csv += "\n--- Ranked by Total Awards ---\nRank,Team #,Team Name,Total Awards\n";
  byAwards.forEach((t, i) => csv += `${i+1},${t.teamNumber},"${t.teamName}",${t.totalAwards}\n`);
  
  csv += "\n--- Ranked by Skills ---\nRank,Team #,Team Name,Combined,High Driver,High Auto,Global Rank\n";
  bySkills.forEach((t, i) => csv += `${i+1},${t.teamNumber},"${t.teamName}",${t.combinedSkills},${t.highestDriver},${t.highestAuton},${t.globalRank}\n`);
  
  return csv;
}

export function downloadCSV(report: ScoutingReport) {
  const csv = reportToCSV(report);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Scouting_${report.eventName.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadExcel(report: ScoutingReport) {
  // Excel-compatible CSV with BOM for proper encoding
  const csv = "\uFEFF" + reportToCSV(report);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Scouting_${report.eventName.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
