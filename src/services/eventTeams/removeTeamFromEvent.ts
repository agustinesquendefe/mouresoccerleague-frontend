import { supabase } from '@/lib/supabaseClient';

export async function removeTeamFromEvent(eventTeamId: number) {
  const { error } = await supabase
    .from('event_teams')
    .delete()
    .eq('id', eventTeamId);

  if (error) {
    throw new Error(error.message);
  }
}