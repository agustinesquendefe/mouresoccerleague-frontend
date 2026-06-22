import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import type { EventMembershipSummary } from '@/models/eventMembership';

type GetEventMembershipsOptions = {
  ensureMembershipRows?: boolean;
};

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

export async function getEventMemberships(
  eventId: number,
  client: SupabaseClient = supabase,
  options: GetEventMembershipsOptions = {}
): Promise<EventMembershipSummary[]> {
  const { ensureMembershipRows = true } = options;

  const [{ data: event, error: eventError }, { data: eventTeams, error: eventTeamsError }] =
    await Promise.all([
      client
        .from('events')
        .select('id, event_price, membership_price')
        .eq('id', eventId)
        .single(),
      client
        .from('event_teams')
        .select('team_id, display_name, teams(name)')
        .eq('event_id', eventId)
    ]);

  if (eventError) throw new Error(eventError.message);
  if (eventTeamsError) throw new Error(eventTeamsError.message);

  const eventTeamRows = eventTeams ?? [];
  const teamIds = Array.from(new Set(eventTeamRows.map((row: any) => Number(row.team_id))));

  if (teamIds.length === 0) {
    return [];
  }

  const teamNameMap = new Map(
    eventTeamRows.map((row: any) => [
      Number(row.team_id),
      row.display_name?.trim() || (Array.isArray(row.teams) ? row.teams[0]?.name ?? null : row.teams?.name ?? null),
    ])
  );

  const { data: teamPlayers, error: teamPlayersError } = await client
    .from('team_players')
    .select('player_id, team_id, event_id, is_active')
    .in('team_id', teamIds)
    .eq('is_active', true);

  if (teamPlayersError) throw new Error(teamPlayersError.message);

  const teamsWithEventRoster = new Set(
    (teamPlayers ?? [])
      .filter((row: any) => Number(row.event_id) === eventId)
      .map((row: any) => Number(row.team_id))
  );

  const rosterRows = (teamPlayers ?? []).filter((row: any) => {
    const teamId = Number(row.team_id);
    return teamsWithEventRoster.has(teamId)
      ? Number(row.event_id) === eventId
      : row.event_id == null || Number(row.event_id) === eventId;
  });

  const playerIds = Array.from(new Set(rosterRows.map((row: any) => Number(row.player_id))));

  if (playerIds.length === 0) {
    return [];
  }

  const playerTeamNames = new Map<number, string>();

  rosterRows.forEach((row: any) => {
    const playerId = Number(row.player_id);
    const teamName = teamNameMap.get(Number(row.team_id));
    if (!teamName) return;

    const current = playerTeamNames.get(playerId);
    if (!current) {
      playerTeamNames.set(playerId, teamName);
      return;
    }

    if (!current.split(', ').includes(teamName)) {
      playerTeamNames.set(playerId, `${current}, ${teamName}`);
    }
  });

  const { data: existingMemberships, error: existingMembershipsError } = await client
    .from('event_memberships')
    .select('*')
    .eq('event_id', eventId);

  if (existingMembershipsError) throw new Error(existingMembershipsError.message);

  const existingPlayerIds = new Set((existingMemberships ?? []).map((row) => Number(row.player_id)));

  if (ensureMembershipRows) {
    const missingMembershipRows = playerIds
      .filter((playerId) => !existingPlayerIds.has(playerId))
      .map((playerId) => ({
        event_id: eventId,
        player_id: playerId,
        amount_paid: 0,
        appearances_count: 0,
        updated_at: new Date().toISOString(),
      }));

    if (missingMembershipRows.length > 0) {
      const { error: upsertError } = await client
        .from('event_memberships')
        .upsert(missingMembershipRows, { onConflict: 'event_id,player_id' });

      if (upsertError) throw new Error(upsertError.message);
    }
  }

  const { data: memberships, error: membershipsError } = await client
    .from('event_memberships')
    .select('*')
    .eq('event_id', eventId)
    .in('player_id', playerIds)
    .order('updated_at', { ascending: false });

  const rows = memberships ?? [];
  if (membershipsError) throw new Error(membershipsError.message);

  const { data: players, error: playersError } = playerIds.length
      ? await client
        .from('players')
        .select('id, full_name, document_id')
        .in('id', playerIds)
    : { data: [], error: null };

  if (playersError) throw new Error(playersError.message);

  const playerMap = new Map((players ?? []).map((player) => [player.id, player]));
  const membershipPrice = Number(event?.event_price ?? event?.membership_price ?? 0);

  const missingMembershipSummaries = ensureMembershipRows
    ? []
    : playerIds
        .filter((playerId) => !existingPlayerIds.has(playerId))
        .map((playerId) => {
          const player = playerMap.get(playerId);
          const amountPaid = 0;
          const appearancesCount = 0;

          return {
            id: -playerId,
            event_id: eventId,
            player_id: playerId,
            amount_paid: amountPaid,
            appearances_count: appearancesCount,
            created_at: '',
            updated_at: '',
            player_name: player?.full_name ?? null,
            player_document_id: player?.document_id ?? null,
            team_name: playerTeamNames.get(playerId) ?? null,
            membership_price: membershipPrice,
            ...buildStatus(amountPaid, membershipPrice, appearancesCount),
          } as EventMembershipSummary;
        });

  return [...rows, ...missingMembershipSummaries].map((row) => {
    const amountPaid = Number(row.amount_paid ?? 0);
    const appearancesCount = Number(row.appearances_count ?? 0);
    const player = playerMap.get(row.player_id);

    return {
      ...row,
      amount_paid: amountPaid,
      appearances_count: appearancesCount,
      player_name: player?.full_name ?? null,
      player_document_id: player?.document_id ?? null,
      team_name: playerTeamNames.get(row.player_id) ?? null,
      membership_price: membershipPrice,
      ...buildStatus(amountPaid, membershipPrice, appearancesCount),
    } as EventMembershipSummary;
  }).sort((left, right) => {
    const byTeam = (left.team_name ?? '').localeCompare(right.team_name ?? '');
    if (byTeam !== 0) return byTeam;
    return (left.player_name ?? '').localeCompare(right.player_name ?? '');
  });
}
