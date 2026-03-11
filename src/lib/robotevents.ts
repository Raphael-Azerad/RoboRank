import { supabase } from "@/integrations/supabase/client";

const CURRENT_SEASON_V5RC = "190"; // High Stakes 2024-2025

export async function fetchRobotEvents(endpoint: string, params?: Record<string, string>) {
  const { data, error } = await supabase.functions.invoke("robotevents-proxy", {
    body: { endpoint, params },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

/** Fetch all pages of a paginated endpoint */
export async function fetchAllPages(endpoint: string, params?: Record<string, string>) {
  const allData: any[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const result = await fetchRobotEvents(endpoint, { ...params, page: String(page), per_page: "250" });
    if (result?.data) {
      allData.push(...result.data);
    }
    lastPage = result?.meta?.last_page || 1;
    page++;
  } while (page <= lastPage);

  return allData;
}

/** Validate a team number exists via RobotEvents */
export async function validateTeamNumber(teamNumber: string): Promise<{ valid: boolean; teamId?: number; teamName?: string }> {
  try {
    const result = await fetchRobotEvents("/teams", { "number[]": teamNumber, "program[]": "1" });
    if (result?.data?.length > 0) {
      return { valid: true, teamId: result.data[0].id, teamName: result.data[0].team_name };
    }
    return { valid: false };
  } catch {
    return { valid: true };
  }
}

/** Get team details by team number */
export async function getTeamByNumber(teamNumber: string) {
  const result = await fetchRobotEvents("/teams", { "number[]": teamNumber, "program[]": "1" });
  return result?.data?.[0] || null;
}

/** Get upcoming events (VRC, current season) */
export async function getUpcomingEvents(params?: Record<string, string>) {
  return fetchRobotEvents("/events", {
    start: new Date().toISOString().split("T")[0] + "T00:00:00Z",
    "program[]": "1",
    ...params,
  });
}

/** Get teams at an event */
export async function getEventTeams(eventId: number) {
  return fetchAllPages(`/events/${eventId}/teams`);
}

/** Get matches for an event division */
export async function getEventMatches(eventId: number, divisionId: number) {
  return fetchAllPages(`/events/${eventId}/divisions/${divisionId}/matches`);
}

/** Get skills data for an event */
export async function getEventSkills(eventId: number) {
  return fetchRobotEvents(`/events/${eventId}/skills`);
}

/** Get a team's match history (current season) */
export async function getTeamMatches(teamId: number) {
  return fetchAllPages(`/teams/${teamId}/matches`, { "season[]": CURRENT_SEASON_V5RC });
}

/** Get a team's rankings across events (current season) - SOURCE OF TRUTH for W/L/T */
export async function getTeamRankings(teamId: number) {
  return fetchAllPages(`/teams/${teamId}/rankings`, { "season[]": CURRENT_SEASON_V5RC });
}

/** Get a team's awards */
export async function getTeamAwards(teamId: number) {
  return fetchAllPages(`/teams/${teamId}/awards`, { "season[]": CURRENT_SEASON_V5RC });
}

/** Get a team's skills scores */
export async function getTeamSkills(teamId: number) {
  return fetchRobotEvents(`/teams/${teamId}/skills`, { "season[]": CURRENT_SEASON_V5RC });
}

/**
 * Calculate record from RANKINGS data (official source of truth).
 * Rankings endpoint provides per-event W/L/T directly.
 */
export function calculateRecordFromRankings(rankings: any[]) {
  let wins = 0, losses = 0, ties = 0;
  let totalWP = 0, totalAP = 0, totalSP = 0;
  let highScore = 0;
  let totalAvgPoints = 0;

  rankings.forEach((r: any) => {
    wins += r.wins || 0;
    losses += r.losses || 0;
    ties += r.ties || 0;
    totalWP += r.wp || 0;
    totalAP += r.ap || 0;
    totalSP += r.sp || 0;
    if (r.high_score > highScore) highScore = r.high_score;
    totalAvgPoints += r.average_points || 0;
  });

  const total = wins + losses + ties;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const avgPointsPerEvent = rankings.length > 0 ? Math.round(totalAvgPoints / rankings.length * 10) / 10 : 0;

  return {
    wins, losses, ties, total, winRate,
    totalWP, totalAP, totalSP, highScore,
    avgPointsPerEvent, eventsAttended: rankings.length,
  };
}

/**
 * Calculate a RoboRank composite score (0-100).
 * Components:
 *   - Win rate (30%)
 *   - Average event ranking percentile (25%)
 *   - Average points per match (15%)
 *   - Event volume / experience (10%)
 *   - SP strength of schedule (10%)
 *   - High score bonus (10%)
 */
export function calculateRoboRank(rankings: any[]) {
  if (!rankings || rankings.length === 0) return 0;

  const record = calculateRecordFromRankings(rankings);

  // 1. Win rate (30%)
  const winComponent = record.winRate * 0.3;

  // 2. Average ranking percentile across events (25%)
  let totalPercentile = 0;
  let rankedEvents = 0;
  rankings.forEach((r: any) => {
    if (r.rank && r.rank > 0) {
      // Estimate field size from total qualifications played
      const qualMatches = (r.wins || 0) + (r.losses || 0) + (r.ties || 0);
      // Rough field size: typical events have 20-60 teams
      // Use rank directly - lower rank = better
      const estimatedFieldSize = Math.max(r.rank, 30); // conservative estimate
      const percentile = Math.max(0, (1 - (r.rank - 1) / estimatedFieldSize) * 100);
      totalPercentile += percentile;
      rankedEvents++;
    }
  });
  const avgPercentile = rankedEvents > 0 ? totalPercentile / rankedEvents : 50;
  const rankComponent = avgPercentile * 0.25;

  // 3. Average points per match (15%) - normalized to ~60 max realistic
  const pointsComponent = Math.min(record.avgPointsPerEvent / 60, 1) * 100 * 0.15;

  // 4. Event volume (10%) - more events = more data
  const volumeComponent = Math.min(record.eventsAttended / 8, 1) * 100 * 0.1;

  // 5. SP / strength of schedule (10%)
  const avgSP = record.eventsAttended > 0 ? record.totalSP / record.eventsAttended : 0;
  const spComponent = Math.min(avgSP / 100, 1) * 100 * 0.1;

  // 6. High score bonus (10%)
  const highScoreComponent = Math.min(record.highScore / 80, 1) * 100 * 0.1;

  return Math.round(Math.min(100,
    winComponent + rankComponent + pointsComponent +
    volumeComponent + spComponent + highScoreComponent
  ));
}
