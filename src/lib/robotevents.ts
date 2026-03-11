import { supabase } from "@/integrations/supabase/client";

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

/** Get a team's match history */
export async function getTeamMatches(teamId: number) {
  return fetchAllPages(`/teams/${teamId}/matches`);
}

/** Get a team's rankings across events */
export async function getTeamRankings(teamId: number) {
  return fetchAllPages(`/teams/${teamId}/rankings`);
}

/** Calculate win/loss/tie from match data for a specific team number */
export function calculateRecord(matches: any[], teamNumber: string) {
  let wins = 0, losses = 0, ties = 0;
  let totalScore = 0;
  let scoredMatches = 0;

  matches.forEach((m: any) => {
    if (!m.alliances || m.alliances.length < 2) return;

    // Find which alliance has our team
    const myAlliance = m.alliances.find((a: any) =>
      a.teams?.some((t: any) => t.team?.name === teamNumber)
    );
    if (!myAlliance) return;

    const oppAlliance = m.alliances.find((a: any) => a.color !== myAlliance.color);
    if (!oppAlliance) return;

    const myScore = myAlliance.score ?? 0;
    const oppScore = oppAlliance.score ?? 0;

    // Skip matches where both scores are 0 (likely unscored)
    if (myScore === 0 && oppScore === 0) return;

    scoredMatches++;
    totalScore += myScore;

    if (myScore > oppScore) wins++;
    else if (oppScore > myScore) losses++;
    else ties++;
  });

  const total = wins + losses + ties;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
  const avgScore = scoredMatches > 0 ? Math.round(totalScore / scoredMatches) : 0;

  return { wins, losses, ties, total, winRate, avgScore };
}

/** Calculate a RoboRank composite score (0-100) */
export function calculateRoboRank(record: ReturnType<typeof calculateRecord>, rankings: any[]) {
  // Win rate component (40%)
  const winComponent = record.winRate * 0.4;

  // Average ranking component (25%) - lower rank = better
  let rankComponent = 0;
  if (rankings.length > 0) {
    const avgRank = rankings.reduce((sum: number, r: any) => sum + (r.rank || 50), 0) / rankings.length;
    const totalTeams = rankings.reduce((sum: number, r: any) => sum + (r.qualifications || 20), 0) / rankings.length;
    // Percentile: if rank 1 of 50 teams → 98%, rank 25 of 50 → 50%
    const percentile = totalTeams > 0 ? Math.max(0, (1 - (avgRank - 1) / totalTeams) * 100) : 50;
    rankComponent = percentile * 0.25;
  } else {
    rankComponent = 50 * 0.25; // neutral if no ranking data
  }

  // Match volume component (15%) - more matches = more data = bonus
  const volumeBonus = Math.min(record.total / 50, 1) * 100;
  const volumeComponent = volumeBonus * 0.15;

  // Average score component (10%) - normalized roughly
  const scoreComponent = Math.min(record.avgScore / 150, 1) * 100 * 0.1;

  // Consistency component (10%) - low tie rate, decisive matches
  const decisiveRate = record.total > 0 ? ((record.wins + record.losses) / record.total) * 100 : 50;
  const consistencyComponent = decisiveRate * 0.1;

  return Math.round(Math.min(100, winComponent + rankComponent + volumeComponent + scoreComponent + consistencyComponent));
}
