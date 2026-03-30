import { supabase } from '@/lib/supabaseClient';
import type { Match } from '@/models/match';

export async function getMatchesByEvent(eventId: number): Promise<Match[]> {
  if (!Number.isFinite(eventId)) {
    throw new Error('Invalid event id');
  }

  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('event_id', eventId)
    .order('stage_type', { ascending: true })
    .order('bracket_round', { ascending: true })
    .order('round_number', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Match[];
}