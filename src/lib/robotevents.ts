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

export function calculateRoboRank(rankings: any[], skillsCombined: number = 0) {
  if (!rankings || rankings.length === 0) return 0;

  let wins = 0, losses = 0, ties = 0;
  let highScore = 0, totalAvgPoints = 0;
  const percentiles: number[] = [];

  rankings.forEach((r: any) => {
    wins += r.wins || 0;
    losses += r.losses || 0;
    ties += r.ties || 0;
    if (r.high_score > highScore) highScore = r.high_score;
    totalAvgPoints += r.average_points || 0;

    if (r.rank && r.rank > 0) {
      const fieldSize = Math.max(r.rank, 24);
      percentiles.push(Math.max(0, (1 - (r.rank - 1) / fieldSize) * 100));
    }
  });

  const total = wins + losses + ties;
  if (total < 3) return 0;

  const winRate = total > 0 ? (wins / total) * 100 : 0;

  // 1. Win Rate (25%)
  const winComponent = winRate * 0.25;

  // 2. Ranking Percentile (20%)
  const avgPercentile = percentiles.length > 0
    ? percentiles.reduce((a, b) => a + b, 0) / percentiles.length
    : 50;
  const rankComponent = avgPercentile * 0.20;

  // 3. Skills Combined (20%) - normalized to ~350
  const skillsComponent = Math.min(skillsCombined / 350, 1) * 100 * 0.20;

  // 4. Consistency (15%)
  let consistencyScore = 75;
  if (percentiles.length >= 2) {
    const mean = avgPercentile;
    const variance = percentiles.reduce((sum, p) => sum + (p - mean) ** 2, 0) / percentiles.length;
    const stdDev = Math.sqrt(variance);
    consistencyScore = Math.max(0, 100 - stdDev * 2.5);
  }
  const consistencyComponent = consistencyScore * 0.15;

  // 5. Event Volume (10%) - caps at 6
  const eventsAttended = rankings.length;
  const volumeComponent = Math.min(eventsAttended / 6, 1) * 100 * 0.10;

  // 6. High Score (10%) - normalized to ~100
  const highScoreComponent = Math.min(highScore / 100, 1) * 100 * 0.10;

  const raw = winComponent + rankComponent + skillsComponent +
    consistencyComponent + volumeComponent + highScoreComponent;

  return Math.round(Math.min(100, raw));
}

export async function getTeamSkillsScore(teamId: number, season: SeasonKey = "current"): Promise<number> {
  try {
    const skills = await fetchAllPages(`/teams/${teamId}/skills`, { "season[]": SEASONS[season].id });
    if (!skills || skills.length === 0) return 0;
    let maxDriver = 0, maxProg = 0;
    skills.forEach((s: any) => {
      if (s.type === "driver" && s.score > maxDriver) maxDriver = s.score;
      if (s.type === "programming" && s.score > maxProg) maxProg = s.score;
    });
    return maxDriver + maxProg;
  } catch {
    return 0;
  }
}
