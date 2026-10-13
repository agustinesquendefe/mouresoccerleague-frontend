import { supabase } from '@/lib/supabaseClient';

export type StandingMode = 'general' | 'home' | 'away';

export type StandingRow = {
  team_id: number;
  team_name: string;
  team_key: string;
  team_logo: string | null;
  status: 'active' | 'disqualified';
  is_disqualified: boolean;
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
  display_name: string | null;
  status: 'active' | 'disqualified' | null;
  teams?: {
    name: string;
    key: string;
    logo_url: string | null;
  } | Array<{ name: string; key: string; logo_url: string | null }>;
};

function numericPoints(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}


export async function getEventStandings(
  eventId: number,
  mode: StandingMode = 'general',
  groupId?: number | null
): Promise<StandingRow[]> {
  // Get event to fetch points system
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('match_format, points_win, points_draw, points_loss')
    .eq('id', eventId)
    .single();
  if (eventError) throw new Error(eventError.message);

  let formatPoints: { points_win: unknown; points_draw: unknown; points_loss: unknown } | null = null;
  const needsFormatFallback = event.points_win == null || event.points_draw == null || event.points_loss == null;

  if (needsFormatFallback && event.match_format) {
    const { data, error } = await supabase
      .from('match_formats')
      .select('points_win, points_draw, points_loss')
      .eq('key', event.match_format)
      .maybeSingle();

    if (error) throw new Error(error.message);
    formatPoints = data;
  }

  const pointsWin = numericPoints(event.points_win, numericPoints(formatPoints?.points_win, 3));
  const pointsDraw = numericPoints(event.points_draw, numericPoints(formatPoints?.points_draw, 1));
  const pointsLoss = numericPoints(event.points_loss, numericPoints(formatPoints?.points_loss, 0));

  // Build matches query
  let matchesQuery = supabase
    .from('matches')
    .select('team1_id, team2_id, score1, score2, status')
    .eq('event_id', eventId)
    .eq('stage_type', 'league');

  if (groupId != null) {
    matchesQuery = matchesQuery.eq('group_id', groupId);
  }

  // Build event_teams query — when filtering by group, only include teams in that group
  let teamsQuery = supabase
    .from('event_teams')
    .select('team_id, display_name, status, teams(name, key, logo_url)')
    .eq('event_id', eventId);

  if (groupId != null) {
    teamsQuery = teamsQuery.eq('group_id', groupId);
  }

  const [{ data: matches, error: matchesError }, { data: eventTeams, error: teamsError }] =
    await Promise.all([matchesQuery, teamsQuery]);

  if (matchesError) throw new Error(matchesError.message);
  if (teamsError) throw new Error(teamsError.message);

  const standingsMap = new Map<number, StandingRow>();

  ((eventTeams ?? []) as EventTeamRow[]).forEach((row) => {
    const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;

    standingsMap.set(row.team_id, {
      team_id: row.team_id,
      team_name: row.display_name?.trim() || team?.name || `#${row.team_id}`,
      team_key: team?.key || String(row.team_id),
      team_logo: team?.logo_url ?? null,
      status: row.status === 'disqualified' ? 'disqualified' : 'active',
      is_disqualified: row.status === 'disqualified',
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
          team1.points += pointsWin;
          team2.points += pointsLoss;
        } else if (match.score1 < match.score2) {
          team2.won += 1;
          team1.lost += 1;
          team2.points += pointsWin;
          team1.points += pointsLoss;
        } else {
          team1.drawn += 1;
          team2.drawn += 1;
          team1.points += pointsDraw;
          team2.points += pointsDraw;
        }
      } else if (mode === 'home') {
        team1.played += 1;
        team1.goals_for += match.score1;
        team1.goals_against += match.score2;

        if (match.score1 > match.score2) {
          team1.won += 1;
          team1.points += pointsWin;
        } else if (match.score1 < match.score2) {
          team1.lost += 1;
          team1.points += pointsLoss;
        } else {
          team1.drawn += 1;
          team1.points += pointsDraw;
        }
      }
    }

    if (mode === 'away') {
      team2.played += 1;
      team2.goals_for += match.score2;
      team2.goals_against += match.score1;

      if (match.score2 > match.score1) {
        team2.won += 1;
        team2.points += pointsWin;
      } else if (match.score2 < match.score1) {
        team2.lost += 1;
        team2.points += pointsLoss;
      } else {
        team2.drawn += 1;
        team2.points += pointsDraw;
      }
    }
  });

  const rows = Array.from(standingsMap.values()).map((row) => ({
    ...row,
    goal_difference: row.goals_for - row.goals_against,
  }));

  rows.sort((a, b) => {
    if (a.is_disqualified !== b.is_disqualified) return a.is_disqualified ? 1 : -1;
    if (b.points !== a.points) return b.points - a.points;
    if (b.goal_difference !== a.goal_difference) {
      return b.goal_difference - a.goal_difference;
    }
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
    return a.team_name.localeCompare(b.team_name);
  });

  return rows;
}
