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
    const result = await fetchRobotEvents("/teams", { "number[]": teamNumber, program: "1" });
    if (result?.data?.length > 0) {
      return { valid: true, teamId: result.data[0].id, teamName: result.data[0].team_name };
    }
    return { valid: false };
  } catch {
    // If API fails, allow signup anyway
    return { valid: true };
  }
}

/** Get team details by team number */
export async function getTeamByNumber(teamNumber: string) {
  const result = await fetchRobotEvents("/teams", { "number[]": teamNumber, program: "1" });
  return result?.data?.[0] || null;
}

/** Get upcoming events (VRC, current season) */
export async function getUpcomingEvents(params?: Record<string, string>) {
  return fetchRobotEvents("/events", {
    "start": new Date().toISOString().split("T")[0] + "T00:00:00Z",
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
