import { supabase } from '@/lib/supabaseClient';
import type { EventMembership } from '@/models/eventMembership';

export async function addEventMembershipPayment(
  membershipId: number,
  currentAmountPaid: number,
  amountToAdd: number
): Promise<EventMembership> {
  if (amountToAdd <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  const { data, error } = await supabase
    .from('event_memberships')
    .update({
      amount_paid: currentAmountPaid + amountToAdd,
      updated_at: new Date().toISOString(),
    })
    .eq('id', membershipId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data as EventMembership;
}
