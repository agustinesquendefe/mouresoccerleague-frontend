import { supabase } from '@/lib/supabaseClient';
import type { EventTeamStatus } from '@/models/eventTeam';

export async function updateEventTeamStatus(
  eventId: number,
  eventTeamId: number,
  status: EventTeamStatus
) {
  const { data, error } = await supabase
    .from('event_teams')
    .update({ status })
    .eq('id', eventTeamId)
    .eq('event_id', eventId)
    .select('id, event_id, team_id, status')
    .single();

  if (error) throw new Error(error.message);
  return data;
}
