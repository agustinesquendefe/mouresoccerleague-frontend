import { supabase } from '@/lib/supabaseClient';
import type { EventMembership } from '@/models/eventMembership';

export async function incrementEventMembershipAppearance(
  membershipId: number,
  currentAppearancesCount: number
): Promise<EventMembership> {
  const { data, error } = await supabase
    .from('event_memberships')
    .update({
      appearances_count: currentAppearancesCount + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', membershipId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data as EventMembership;
}
