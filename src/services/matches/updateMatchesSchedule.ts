import { supabase } from '@/lib/supabaseClient';
import type { Match } from '@/models/match';

export type MatchScheduleUpdate = {
  id: number;
  date: string | null;
  time: string | null;
  field_id: number | null;
  field_number: number | null;
};

export async function updateMatchesSchedule(
  updates: MatchScheduleUpdate[]
): Promise<Match[]> {
  if (updates.length === 0) {
    return [];
  }

  const results = await Promise.all(
    updates.map(async (update) => {
      const { data: existingMatch, error: existingMatchError } = await supabase
        .from('matches')
        .select('date, rescheduled_from_date')
        .eq('id', update.id)
        .single();

      if (existingMatchError) {
        throw new Error(existingMatchError.message);
      }

      const rescheduledFromDate =
        existingMatch.date &&
        update.date &&
        existingMatch.date !== update.date
          ? existingMatch.rescheduled_from_date ?? existingMatch.date
          : existingMatch.rescheduled_from_date ?? null;

      const { data, error } = await supabase
        .from('matches')
        .update({
          date: update.date,
          time: update.time,
          field_id: update.field_id,
          field_number: update.field_number,
          rescheduled_from_date: rescheduledFromDate,
        })
        .eq('id', update.id)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data as Match;
    })
  );

  return results;
}
