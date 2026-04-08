import { supabase } from '@/lib/supabaseClient';
import type { Match, MatchFormData } from '@/models/match';

export async function updateMatch(
  id: number,
  payload: MatchFormData
): Promise<Match> {
  const { data, error } = await supabase
    .from('matches')
    .update({
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
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Match;
}