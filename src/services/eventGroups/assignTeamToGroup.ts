import { supabase } from '@/lib/supabaseClient';

export async function assignTeamToGroup(
  eventTeamId: number,
  groupId: number | null
): Promise<void> {
  const { error } = await supabase
    .from('event_teams')
    .update({ group_id: groupId })
    .eq('id', eventTeamId);

  if (error) throw new Error(error.message);
}
