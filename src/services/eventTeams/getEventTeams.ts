import { supabase } from '@/lib/supabaseClient';

export async function getEventTeams(eventId: number) {
  const { data, error } = await supabase
    .from('event_teams')
    .select(`
      id,
      team_id,
      display_name,
      order_index,
      teams (
        id,
        name,
        key,
        code,
        logo_url
      )
    `)
    .eq('event_id', eventId)
    .order('order_index', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
