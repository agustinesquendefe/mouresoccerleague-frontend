import type { SupabaseClient } from '@supabase/supabase-js';

export class EventPaymentNotAllowedError extends Error {
  constructor() {
    super('Payments are disabled because the player is not on an active team in this event.');
    this.name = 'EventPaymentNotAllowedError';
  }
}

export async function playerHasActiveEventTeam(
  client: SupabaseClient,
  eventId: number,
  playerId: number
): Promise<boolean> {
  const { data: rosterRows, error: rosterError } = await client
    .from('team_players')
    .select('team_id')
    .eq('event_id', eventId)
    .eq('player_id', playerId)
    .eq('is_active', true);

  if (rosterError) throw new Error(rosterError.message);

  const teamIds = Array.from(new Set((rosterRows ?? []).map((row) => Number(row.team_id))));
  if (teamIds.length === 0) return false;

  const { data: activeTeam, error: eventTeamError } = await client
    .from('event_teams')
    .select('id')
    .eq('event_id', eventId)
    .eq('status', 'active')
    .in('team_id', teamIds)
    .limit(1)
    .maybeSingle();

  if (eventTeamError) throw new Error(eventTeamError.message);
  return Boolean(activeTeam);
}

export async function assertPlayerCanPayForEvent(
  client: SupabaseClient,
  eventId: number,
  playerId: number
): Promise<void> {
  if (!await playerHasActiveEventTeam(client, eventId, playerId)) {
    throw new EventPaymentNotAllowedError();
  }
}
