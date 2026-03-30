import { supabase } from '@/lib/supabaseClient';

export type StandingMode = 'general' | 'home' | 'away';

export type StandingRow = {
  team_id: number;
  team_name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
};

type MatchRow = {
  team1_id: number;
  team2_id: number;
  score1: number | null;
  score2: number | null;
  status: string | null;
};

type EventTeamRow = {
  team_id: number;
  teams?: {
    name: string;
  } | Array<{ name: string }>;
};

export async function getEventStandings(
  eventId: number,
  mode: StandingMode = 'general'
): Promise<StandingRow[]> {
  const [{ data: matches, error: matchesError }, { data: eventTeams, error: teamsError }] =
    await Promise.all([
      supabase
        .from('matches')
        .select('team1_id, team2_id, score1, score2, status')
        .eq('event_id', eventId),
      supabase
        .from('event_teams')
        .select(`
          team_id,
          teams (
            name
          )
        `)
        .eq('event_id', eventId),
    ]);

  if (matchesError) throw new Error(matchesError.message);
  if (teamsError) throw new Error(teamsError.message);

  const standingsMap = new Map<number, StandingRow>();

  ((eventTeams ?? []) as EventTeamRow[]).forEach((row) => {
    const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;

    standingsMap.set(row.team_id, {
      team_id: row.team_id,
      team_name: team?.name ?? `#${row.team_id}`,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      goal_difference: 0,
      points: 0,
    });
  });

  const playedMatches = ((matches ?? []) as MatchRow[]).filter((match) => {
    return String(match.status ?? '').toLowerCase() === 'played';
  });

  playedMatches.forEach((match) => {
    if (match.score1 === null || match.score2 === null) return;

    const team1 = standingsMap.get(match.team1_id);
    const team2 = standingsMap.get(match.team2_id);

    if (!team1 || !team2) return;

    if (mode === 'general' || mode === 'home') {
      if (mode === 'general') {
        team1.played += 1;
        team2.played += 1;

        team1.goals_for += match.score1;
        team1.goals_against += match.score2;

        team2.goals_for += match.score2;
        team2.goals_against += match.score1;

        if (match.score1 > match.score2) {
          team1.won += 1;
          team2.lost += 1;
          team1.points += 3;
        } else if (match.score1 < match.score2) {
          team2.won += 1;
          team1.lost += 1;
          team2.points += 3;
        } else {
          team1.drawn += 1;
          team2.drawn += 1;
          team1.points += 1;
          team2.points += 1;
        }
      } else if (mode === 'home') {
        team1.played += 1;
        team1.goals_for += match.score1;
        team1.goals_against += match.score2;

        if (match.score1 > match.score2) {
          team1.won += 1;
          team1.points += 3;
        } else if (match.score1 < match.score2) {
          team1.lost += 1;
        } else {
          team1.drawn += 1;
          team1.points += 1;
        }
      }
    }

    if (mode === 'away') {
      team2.played += 1;
      team2.goals_for += match.score2;
      team2.goals_against += match.score1;

      if (match.score2 > match.score1) {
        team2.won += 1;
        team2.points += 3;
      } else if (match.score2 < match.score1) {
        team2.lost += 1;
      } else {
        team2.drawn += 1;
        team2.points += 1;
      }
    }
  });

  const rows = Array.from(standingsMap.values()).map((row) => ({
    ...row,
    goal_difference: row.goals_for - row.goals_against,
  }));

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goal_difference !== a.goal_difference) {
      return b.goal_difference - a.goal_difference;
    }
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
    return a.team_name.localeCompare(b.team_name);
  });

  return rows;
}