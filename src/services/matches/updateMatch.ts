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
      date: payload.date,
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