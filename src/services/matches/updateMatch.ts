import { supabase } from '@/lib/supabaseClient';
import type { Match, MatchFormData } from '@/models/match';

export async function updateMatch(
  id: number,
  payload: MatchFormData
): Promise<Match> {
  const { data: existingMatch, error: existingMatchError } = await supabase
    .from('matches')
    .select('date, rescheduled_from_date')
    .eq('id', id)
    .single();

  if (existingMatchError) {
    throw new Error(existingMatchError.message);
  }

  const rescheduledFromDate =
    existingMatch.date &&
    payload.date &&
    existingMatch.date !== payload.date
      ? existingMatch.rescheduled_from_date ?? existingMatch.date
      : existingMatch.rescheduled_from_date ?? null;

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
      team1_id: payload.team1_id,
      team2_id: payload.team2_id,
      rescheduled_from_date: rescheduledFromDate,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const { data: existingMainReferee, error: existingRefereeError } = await supabase
    .from('match_referees')
    .select('id, referee_id')
    .eq('match_id', id)
    .eq('role', 'main_referee')
    .limit(1)
    .maybeSingle();

  if (existingRefereeError) {
    throw new Error(existingRefereeError.message);
  }

  if (payload.referee_id) {
    if (existingMainReferee) {
      const { error: updateRefereeError } = await supabase
        .from('match_referees')
        .update({
          referee_id: payload.referee_id,
          role: 'main_referee',
        })
        .eq('id', existingMainReferee.id);

      if (updateRefereeError) {
        throw new Error(updateRefereeError.message);
      }
    } else {
      const { error: insertRefereeError } = await supabase
        .from('match_referees')
        .insert({
          match_id: id,
          referee_id: payload.referee_id,
          role: 'main_referee',
        });

      if (insertRefereeError) {
        throw new Error(insertRefereeError.message);
      }
    }
  } else if (existingMainReferee) {
    const { error: deleteRefereeError } = await supabase
      .from('match_referees')
      .delete()
      .eq('id', existingMainReferee.id);

    if (deleteRefereeError) {
      throw new Error(deleteRefereeError.message);
    }
  }

  return data as Match;
}
