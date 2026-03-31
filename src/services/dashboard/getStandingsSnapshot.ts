import { supabase } from '@/lib/supabaseClient';
import { getEventStandings, type StandingRow } from '@/services/standings/getEventStandings';

export async function getStandingsSnapshot(limit = 8): Promise<StandingRow[]> {
  const { data: event, error } = await supabase
    .from('events')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) throw new Error(error.message);

  const standings = await getEventStandings(event.id, 'general');
  return standings.slice(0, limit);
}