import { supabase } from '@/lib/supabaseClient';
import { getEventStandings, type StandingRow } from '@/services/standings/getEventStandings';

export type EventTeamMatch = {
  id: number;
  date: string | null;
  time: string | null;
  status: string | null;
  score1: number | null;
  score2: number | null;
  round_number: number | null;
  stage_type: string | null;
  bracket_round: string | null;
  venue_name: string | null;
  is_home: boolean;
  opponent_id: number;
  opponent_name: string;
  opponent_logo: string | null;
};

export type PublicEventTeamDetail = {
  event: { id: number; name: string | null; key: string };
  participation: {
    id: number;
    team_id: number;
    name: string;
    key: string;
    logo_url: string | null;
    status: 'active' | 'disqualified';
  };
  standing: StandingRow;
  position: number;
  matches: EventTeamMatch[];
};

export async function getPublicEventTeamDetail(eventId: number, teamKey: string): Promise<PublicEventTeamDetail | null> {
  const [eventResult, teamResult] = await Promise.all([
    supabase.from('events').select('id, name, key').eq('id', eventId).maybeSingle(),
    supabase.from('teams').select('id, name, key, logo_url').eq('key', teamKey).maybeSingle(),
  ]);
  if (eventResult.error) throw new Error(eventResult.error.message);
  if (teamResult.error) throw new Error(teamResult.error.message);
  if (!eventResult.data || !teamResult.data) return null;

  const team = teamResult.data;
  const [participationResult, matchesResult, standings] = await Promise.all([
    supabase.from('event_teams').select('id, display_name, status').eq('event_id', eventId).eq('team_id', team.id).maybeSingle(),
    supabase.from('matches')
      .select('id, date, time, status, score1, score2, team1_id, team2_id, field_id, round_number, stage_type, bracket_round')
      .eq('event_id', eventId)
      .or(`team1_id.eq.${team.id},team2_id.eq.${team.id}`),
    getEventStandings(eventId),
  ]);
  if (participationResult.error) throw new Error(participationResult.error.message);
  if (matchesResult.error) throw new Error(matchesResult.error.message);
  if (!participationResult.data) return null;

  const rawMatches = matchesResult.data ?? [];
  const opponentIds = Array.from(new Set(rawMatches.map((match) => match.team1_id === team.id ? match.team2_id : match.team1_id)));
  const fieldIds = Array.from(new Set(rawMatches.map((match) => match.field_id).filter((id): id is number => id != null)));
  const [opponentsResult, eventNamesResult, fieldsResult] = await Promise.all([
    opponentIds.length ? supabase.from('teams').select('id, name, logo_url').in('id', opponentIds) : Promise.resolve({ data: [], error: null }),
    opponentIds.length ? supabase.from('event_teams').select('team_id, display_name').eq('event_id', eventId).in('team_id', opponentIds) : Promise.resolve({ data: [], error: null }),
    fieldIds.length ? supabase.from('fields').select('id, name').in('id', fieldIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (opponentsResult.error) throw new Error(opponentsResult.error.message);
  if (eventNamesResult.error) throw new Error(eventNamesResult.error.message);
  if (fieldsResult.error) throw new Error(fieldsResult.error.message);
  const opponents = new Map((opponentsResult.data ?? []).map((row) => [row.id, row]));
  const eventNames = new Map((eventNamesResult.data ?? []).map((row) => [row.team_id, row.display_name?.trim()]));
  const fieldNames = new Map((fieldsResult.data ?? []).map((row) => [row.id, row.name]));

  return {
    event: eventResult.data,
    participation: {
      id: participationResult.data.id,
      team_id: team.id,
      name: participationResult.data.display_name?.trim() || team.name,
      key: team.key,
      logo_url: team.logo_url,
      status: participationResult.data.status === 'disqualified' ? 'disqualified' : 'active',
    },
    standing: standings.find((row) => row.team_id === team.id)!,
    position: standings.findIndex((row) => row.team_id === team.id) + 1,
    matches: rawMatches.map((match) => {
      const isHome = match.team1_id === team.id;
      const opponentId = isHome ? match.team2_id : match.team1_id;
      const opponent = opponents.get(opponentId);
      return {
        id: match.id, date: match.date, time: match.time, status: match.status,
        score1: match.score1, score2: match.score2, is_home: isHome,
        round_number: match.round_number,
        stage_type: match.stage_type,
        bracket_round: match.bracket_round,
        venue_name: match.field_id == null ? null : (fieldNames.get(match.field_id) ?? null),
        opponent_id: opponentId,
        opponent_name: eventNames.get(opponentId) || opponent?.name || `Team #${opponentId}`,
        opponent_logo: opponent?.logo_url ?? null,
      };
    }),
  };
}
