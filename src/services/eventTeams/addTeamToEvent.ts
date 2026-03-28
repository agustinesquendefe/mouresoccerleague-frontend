import { supabase } from '@/lib/supabaseClient';

export async function addTeamToEvent(eventId: number, teamId: number) {
  const { error } = await supabase
    .from('event_teams')
    .insert([
      {
        event_id: eventId,
        team_id: teamId,
      },
    ]);

  if (error) {
    if (error.code === '23505') {
      throw new Error('This team is already added to the event.');
    }
    throw new Error(error.message);
  }
}