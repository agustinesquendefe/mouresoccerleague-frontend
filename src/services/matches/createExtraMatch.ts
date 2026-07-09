import { supabase } from '@/lib/supabaseClient';
import type { Match, MatchFormData } from '@/models/match';

export async function createExtraMatch(
  eventId: number,
  roundNumber: number,
  payload: MatchFormData
): Promise<Match> {
  if (!Number.isFinite(eventId)) throw new Error('Invalid event id');
  if (!Number.isFinite(roundNumber) || roundNumber <= 0) throw new Error('Invalid round number');
  if (!payload.team1_id || !payload.team2_id) throw new Error('Both teams are required');
  if (payload.team1_id === payload.team2_id) throw new Error('Teams must be different');

  const { data: existingMatches, error: existingError } = await supabase
    .from('matches')
    .select('pos, num')
    .eq('event_id', eventId);

  if (existingError) throw new Error(existingError.message);

  const nextPos = Math.max(0, ...(existingMatches ?? []).map((match: any) => Number(match.pos) || 0)) + 1;
  const nextNum = Math.max(0, ...(existingMatches ?? []).map((match: any) => Number(match.num) || 0)) + 1;

  const { data, error } = await supabase
    .from('matches')
    .insert({
      event_id: eventId,
      pos: nextPos,
      num: nextNum,
      team1_id: payload.team1_id,
      team2_id: payload.team2_id,
      status: payload.status,
      score1: payload.score1,
      score2: payload.score2,
      penalty_score1: payload.penalty_score1,
      penalty_score2: payload.penalty_score2,
      winner_team_id: payload.winner_team_id,
      date: payload.date,
      time: payload.time,
      field_id: payload.field_id,
      field_number: payload.field_number,
      round_id: null,
      round_number: roundNumber,
      stage_type: 'league',
      bracket_round: null,
      leg_number: null,
      is_extra: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data as Match;
}
