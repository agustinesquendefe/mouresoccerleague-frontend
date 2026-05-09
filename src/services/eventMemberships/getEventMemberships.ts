import { supabase } from '@/lib/supabaseClient';
import type { EventMembershipSummary } from '@/models/eventMembership';

const FREE_APPEARANCES_LIMIT = 4;

function buildStatus(
  amountPaid: number,
  membershipPrice: number,
  appearancesCount: number
): Pick<EventMembershipSummary, 'balance_due' | 'free_appearances_remaining' | 'status' | 'can_play'> {
  const balanceDue = Math.max(membershipPrice - amountPaid, 0);
  const freeAppearancesRemaining = Math.max(FREE_APPEARANCES_LIMIT - appearancesCount, 0);

  if (balanceDue <= 0) {
    return {
      balance_due: 0,
      free_appearances_remaining: freeAppearancesRemaining,
      status: 'paid',
      can_play: true,
    };
  }

  if (appearancesCount >= FREE_APPEARANCES_LIMIT) {
    return {
      balance_due: balanceDue,
      free_appearances_remaining: 0,
      status: 'blocked',
      can_play: false,
    };
  }

  return {
    balance_due: balanceDue,
    free_appearances_remaining: freeAppearancesRemaining,
    status: freeAppearancesRemaining === 1 ? 'warning' : 'eligible',
    can_play: true,
  };
}

export async function getEventMemberships(eventId: number): Promise<EventMembershipSummary[]> {
  const [{ data: event, error: eventError }, { data: memberships, error: membershipsError }] =
    await Promise.all([
      supabase
        .from('events')
        .select('id, event_price, membership_price')
        .eq('id', eventId)
        .single(),
      supabase
        .from('event_memberships')
        .select('*')
        .eq('event_id', eventId)
        .order('updated_at', { ascending: false }),
    ]);

  if (eventError) throw new Error(eventError.message);
  if (membershipsError) throw new Error(membershipsError.message);

  const rows = memberships ?? [];
  const playerIds = Array.from(new Set(rows.map((row) => row.player_id)));

  const { data: players, error: playersError } = playerIds.length
    ? await supabase
        .from('players')
        .select('id, full_name, document_id')
        .in('id', playerIds)
    : { data: [], error: null };

  if (playersError) throw new Error(playersError.message);

  const playerMap = new Map((players ?? []).map((player) => [player.id, player]));
  const membershipPrice = Number(event?.event_price ?? event?.membership_price ?? 0);

  return rows.map((row) => {
    const amountPaid = Number(row.amount_paid ?? 0);
    const appearancesCount = Number(row.appearances_count ?? 0);
    const player = playerMap.get(row.player_id);

    return {
      ...row,
      amount_paid: amountPaid,
      appearances_count: appearancesCount,
      player_name: player?.full_name ?? null,
      player_document_id: player?.document_id ?? null,
      membership_price: membershipPrice,
      ...buildStatus(amountPaid, membershipPrice, appearancesCount),
    } as EventMembershipSummary;
  });
}
