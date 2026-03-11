import { supabase } from "@/integrations/supabase/client";

export const SEASONS = {
  current: { id: "197", name: "Push Back", year: "2025-2026" },
  previous: { id: "190", name: "High Stakes", year: "2024-2025" },
  overunder: { id: "181", name: "Over Under", year: "2023-2024" },
  spinup: { id: "173", name: "Spin Up", year: "2022-2023" },
  tippingpoint: { id: "154", name: "Tipping Point", year: "2021-2022" },
};

export const SEASON_LIST = [
  { key: "current" as SeasonKey, ...SEASONS.current },
  { key: "previous" as SeasonKey, ...SEASONS.previous },
  { key: "overunder" as SeasonKey, ...SEASONS.overunder },
  { key: "spinup" as SeasonKey, ...SEASONS.spinup },
  { key: "tippingpoint" as SeasonKey, ...SEASONS.tippingpoint },
];

export type SeasonKey = keyof typeof SEASONS;

// US States for filtering
export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming"
];

export async function fetchRobotEvents(endpoint: string, params?: Record<string, string>) {
  const { data, error } = await supabase.functions.invoke("robotevents-proxy", {
    body: { endpoint, params },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function fetchAllPages(endpoint: string, params?: Record<string, string>) {
  const allData: any[] = [];
  let page = 1;
  let lastPage = 1;
  do {
    const result = await fetchRobotEvents(endpoint, { ...params, page: String(page), per_page: "250" });
    if (result?.data) allData.push(...result.data);
    lastPage = result?.meta?.last_page || 1;
    page++;
  } while (page <= lastPage);
  return allData;
}

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

export async function getTeamByNumber(teamNumber: string) {
  const result = await fetchRobotEvents("/teams", { "number[]": teamNumber, "program[]": "1" });
  return result?.data?.[0] || null;
}

export async function getTeamRankings(teamId: number, season: SeasonKey = "current") {
  return fetchAllPages(`/teams/${teamId}/rankings`, { "season[]": SEASONS[season].id });
}

export async function getTeamMatches(teamId: number, season: SeasonKey = "current") {
  return fetchAllPages(`/teams/${teamId}/matches`, { "season[]": SEASONS[season].id });
}

export async function getTeamEvents(teamId: number, season: SeasonKey = "current") {
  return fetchAllPages(`/teams/${teamId}/events`, { "season[]": SEASONS[season].id });
}

export async function getTeamAwards(teamId: number, season: SeasonKey = "current") {
  return fetchAllPages(`/teams/${teamId}/awards`, { "season[]": SEASONS[season].id });
}

export async function getEventTeams(eventId: number) {
  return fetchAllPages(`/events/${eventId}/teams`);
}

export async function getEventRankings(eventId: number, divisionId: number) {
  return fetchRobotEvents(`/events/${eventId}/divisions/${divisionId}/rankings`);
}

export async function getEventMatches(eventId: number, divisionId: number) {
  return fetchAllPages(`/events/${eventId}/divisions/${divisionId}/matches`);
}

export async function getEventSkills(eventId: number) {
  return fetchAllPages(`/events/${eventId}/skills`);
}

export async function getTeamSkills(teamId: number, season: SeasonKey = "current") {
  return fetchAllPages(`/teams/${teamId}/skills`, { "season[]": SEASONS[season].id });
}

export async function searchEvents(params: Record<string, string>) {
  return fetchRobotEvents("/events", { "program[]": "1", "season[]": SEASONS.current.id, ...params });
}

export async function getWorldSkillsRankings(season: SeasonKey = "current", gradeLevel: string = "High School") {
  const seasonId = SEASONS[season].id;
  const result = await fetchRobotEvents(`/seasons/${seasonId}/skills`, { grade_level: gradeLevel });
  return result || [];
}

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

export function calculateRoboRank(rankings: any[]) {
  if (!rankings || rankings.length === 0) return 0;

  const record = calculateRecordFromRankings(rankings);

  // Win rate (30%)
  const winComponent = record.winRate * 0.3;

  // Average ranking percentile (25%)
  let totalPercentile = 0;
  let rankedEvents = 0;
  rankings.forEach((r: any) => {
    if (r.rank && r.rank > 0) {
      const estimatedFieldSize = Math.max(r.rank, 30);
      const percentile = Math.max(0, (1 - (r.rank - 1) / estimatedFieldSize) * 100);
      totalPercentile += percentile;
      rankedEvents++;
    }
  });
  const avgPercentile = rankedEvents > 0 ? totalPercentile / rankedEvents : 50;
  const rankComponent = avgPercentile * 0.25;

  // Average points (15%)
  const pointsComponent = Math.min(record.avgPointsPerEvent / 60, 1) * 100 * 0.15;

  // Event volume (10%)
  const volumeComponent = Math.min(record.eventsAttended / 8, 1) * 100 * 0.1;

  // SP strength of schedule (10%)
  const avgSP = record.eventsAttended > 0 ? record.totalSP / record.eventsAttended : 0;
  const spComponent = Math.min(avgSP / 150, 1) * 100 * 0.1;

  // High score (10%)
  const highScoreComponent = Math.min(record.highScore / 100, 1) * 100 * 0.1;

  return Math.round(Math.min(100,
    winComponent + rankComponent + pointsComponent +
    volumeComponent + spComponent + highScoreComponent
  ));
}
