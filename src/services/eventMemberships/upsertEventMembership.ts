import { supabase } from '@/lib/supabaseClient';
import type { EventMembership } from '@/models/eventMembership';

type UpsertEventMembershipInput = {
  eventId: number;
  playerId: number;
  amountPaid?: number;
  appearancesCount?: number;
};

export async function upsertEventMembership({
  eventId,
  playerId,
  amountPaid = 0,
  appearancesCount = 0,
}: UpsertEventMembershipInput): Promise<EventMembership> {
  const { data, error } = await supabase
    .from('event_memberships')
    .upsert(
      {
        event_id: eventId,
        player_id: playerId,
        amount_paid: amountPaid,
        appearances_count: appearancesCount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'event_id,player_id' }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data as EventMembership;
}
