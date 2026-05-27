import { supabase } from '@/lib/supabaseClient';

export async function updateEventTeamDisplayName(
  eventTeamId: number,
  displayName: string | null
): Promise<void> {
  const normalizedDisplayName = displayName?.trim() || null;

  const { error } = await supabase
    .from('event_teams')
    .update({ display_name: normalizedDisplayName })
    .eq('id', eventTeamId);

  if (error) {
    throw new Error(error.message);
  }
}
