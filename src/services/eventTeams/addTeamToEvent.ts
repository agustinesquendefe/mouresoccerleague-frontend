import { supabase } from '@/lib/supabaseClient';

export async function addTeamToEvent(eventId: number, teamId: number) {
  const { data: lastEventTeam, error: lastEventTeamError } = await supabase
    .from('event_teams')
    .select('order_index')
    .eq('event_id', eventId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastEventTeamError) {
    throw new Error(lastEventTeamError.message);
  }

  const { error } = await supabase
    .from('event_teams')
    .insert([
      {
        event_id: eventId,
        team_id: teamId,
        order_index: (lastEventTeam?.order_index ?? -1) + 1,
        status: 'active',
      },
    ]);

  if (error) {
    if (error.code === '23505') {
      throw new Error('This team is already added to the event.');
    }
    throw new Error(error.message);
  }
}
