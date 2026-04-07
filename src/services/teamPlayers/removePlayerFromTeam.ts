import { supabase } from '@/lib/supabaseClient';

export async function removePlayerFromTeam(teamPlayerId: number): Promise<void> {
  const { error } = await supabase
    .from('team_players')
    .delete()
    .eq('id', teamPlayerId);

  if (error) {
    throw new Error(error.message);
  }
}