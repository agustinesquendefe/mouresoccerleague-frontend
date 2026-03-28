import { supabase } from '@/lib/supabaseClient';

export async function getEventTeams(eventId: number) {
  if (!Number.isFinite(eventId)) {
    throw new Error('Invalid event id');
  }

  const { data, error } = await supabase
    .from('event_teams')
    .select(`
      id,
      team_id,
      teams (
        id,
        name,
        key,
        code
      )
    `)
    .eq('event_id', eventId)
    .order('id', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}