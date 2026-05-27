import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import type { Player } from '@/models/player';

export type PlayerPortalMatch = {
  id: number;
  date: string | null;
  time: string | null;
  status: string | null;
  field_name: string | null;
  opponent_name: string;
  home_team_name: string;
  away_team_name: string;
};

export type PlayerPortalEvent = {
  event_id: number;
  event_name: string;
  event_price: number;
  stripe_price_id: string | null;
  team_id: number;
  team_name: string;
  jersey_number: number | null;
  payment_status: 'paid' | 'pending';
  paid_amount: number;
  balance_due: number;
  free_appearances_remaining: number;
  upcoming_matches: PlayerPortalMatch[];
};

export type PlayerPortalData = {
  player: Pick<Player, 'id' | 'first_name' | 'last_name' | 'full_name' | 'email'>;
  events: PlayerPortalEvent[];
};

type TeamPlayerRow = {
  team_id: number;
  event_id: number | null;
  jersey_number: number | null;
};

type EventTeamRow = {
  event_id: number;
  team_id: number;
  display_name: string | null;
};

type PortalEventRow = {
  id: number;
  name: string | null;
  start_date: string | null;
  status: string | null;
  event_price: number | null;
  membership_price: number | null;
  stripe_price_id: string | null;
};

type MembershipRow = {
  event_id: number;
  player_id: number;
  amount_paid: number | null;
  appearances_count: number | null;
};

type MatchRow = {
  id: number;
  event_id: number;
  team1_id: number | null;
  team2_id: number | null;
  date: string | null;
  time: string | null;
  status: string | null;
  field_id: number | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function getPlayerPortalData(
  email: string,
  client: SupabaseClient = supabase
): Promise<PlayerPortalData | null> {
  const normalizedEmail = normalizeEmail(email);

  const { data: player, error: playerError } = await client
    .from('players')
    .select('id, first_name, last_name, full_name, email')
    .ilike('email', normalizedEmail)
    .eq('is_active', true)
    .maybeSingle();

  if (playerError) {
    throw new Error(playerError.message);
  }

  if (!player) {
    return null;
  }

  const { data: teamPlayers, error: teamPlayersError } = await client
    .from('team_players')
    .select('team_id, event_id, jersey_number')
    .eq('player_id', player.id)
    .eq('is_active', true);

  if (teamPlayersError) {
    throw new Error(teamPlayersError.message);
  }

  const playerTeamRows = (teamPlayers ?? []) as TeamPlayerRow[];

  if (playerTeamRows.length === 0) {
    return {
      player,
      events: [],
    };
  }

  const teamIds = Array.from(new Set(playerTeamRows.map((row) => row.team_id)));
  const explicitEventIds = playerTeamRows
    .map((row) => row.event_id)
    .filter((eventId): eventId is number => eventId != null);

  const { data: eventTeams, error: eventTeamsError } = await client
    .from('event_teams')
    .select('event_id, team_id, display_name')
    .in('team_id', teamIds);

  if (eventTeamsError) {
    throw new Error(eventTeamsError.message);
  }

  const eventTeamRows = ((eventTeams ?? []) as EventTeamRow[]).filter((row) => {
    const matchingTeamPlayer = playerTeamRows.find((teamPlayer) => teamPlayer.team_id === row.team_id);
    return !matchingTeamPlayer?.event_id || matchingTeamPlayer.event_id === row.event_id;
  });

  const eventIds = Array.from(
    new Set([...explicitEventIds, ...eventTeamRows.map((row) => row.event_id)])
  );

  if (eventIds.length === 0) {
    return {
      player,
      events: [],
    };
  }

  const [eventsResult, matchesResult] = await Promise.all([
    client
      .from('events')
      .select('id, name, start_date, status, event_price, membership_price, stripe_price_id')
      .in('id', eventIds)
      .order('start_date', { ascending: true }),
    client
      .from('matches')
      .select('id, event_id, team1_id, team2_id, date, time, status, field_id')
      .in('event_id', eventIds)
      .or(teamIds.map((teamId) => `team1_id.eq.${teamId},team2_id.eq.${teamId}`).join(','))
      .order('date', { ascending: true })
      .order('time', { ascending: true }),
  ]);

  if (eventsResult.error) throw new Error(eventsResult.error.message);
  if (matchesResult.error) throw new Error(matchesResult.error.message);

  const matches = (matchesResult.data ?? []) as MatchRow[];
  const matchTeamIds = matches.flatMap((match) => [match.team1_id, match.team2_id]);
  const allTeamIds = Array.from(
    new Set(
      [...teamIds, ...matchTeamIds].filter((teamId): teamId is number => teamId != null)
    )
  );
  const fieldIds = Array.from(
    new Set(matches.map((match) => match.field_id).filter((fieldId): fieldId is number => fieldId != null))
  );

  const [teamsResult, fieldsResult] = await Promise.all([
    allTeamIds.length
      ? client.from('teams').select('id, name').in('id', allTeamIds)
      : Promise.resolve({ data: [], error: null }),
    fieldIds.length
      ? client.from('fields').select('id, name').in('id', fieldIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (teamsResult.error) throw new Error(teamsResult.error.message);
  if (fieldsResult.error) throw new Error(fieldsResult.error.message);

  const { data: memberships, error: membershipsError } = await client
    .from('event_memberships')
    .select('event_id, player_id, amount_paid, appearances_count')
    .eq('player_id', player.id)
    .in('event_id', eventIds);

  if (membershipsError) throw new Error(membershipsError.message);

  const eventMap = new Map(
    ((eventsResult.data ?? []) as PortalEventRow[]).map((event) => [event.id, event])
  );
  const teamMap = new Map((teamsResult.data ?? []).map((team) => [team.id, team]));
  const eventTeamDisplayNameMap = new Map(
    eventTeamRows
      .filter((row) => Boolean(row.display_name?.trim()))
      .map((row) => [`${row.event_id}:${row.team_id}`, row.display_name!.trim()])
  );
  const getTeamName = (eventId: number, teamId: number | null) => {
    if (teamId == null) return 'TBD';
    return eventTeamDisplayNameMap.get(`${eventId}:${teamId}`) ?? teamMap.get(teamId)?.name ?? `Team #${teamId}`;
  };
  const fieldMap = new Map((fieldsResult.data ?? []).map((field) => [field.id, field]));
  const membershipMap = new Map(
    ((memberships ?? []) as MembershipRow[]).map((membership) => [
      membership.event_id,
      membership,
    ])
  );

  const eventTeamPairs = eventTeamRows.length
    ? eventTeamRows
    : playerTeamRows
        .filter((row): row is TeamPlayerRow & { event_id: number } => row.event_id != null)
        .map((row) => ({ event_id: row.event_id, team_id: row.team_id }));

  const uniquePairs = Array.from(
    new Map(eventTeamPairs.map((row) => [`${row.event_id}:${row.team_id}`, row])).values()
  );

  return {
    player,
    events: uniquePairs
      .map((row) => {
        const event = eventMap.get(row.event_id);
        const team = teamMap.get(row.team_id);
        const membership = membershipMap.get(row.event_id);
        const eventPrice = Number(event?.event_price ?? event?.membership_price ?? 0);
        const paidAmount = Number(membership?.amount_paid ?? 0);
        const appearancesCount = Number(membership?.appearances_count ?? 0);
        const balanceDue = Math.max(eventPrice - paidAmount, 0);
        const teamPlayer = playerTeamRows.find(
          (item) =>
            item.team_id === row.team_id &&
            (!item.event_id || item.event_id === row.event_id)
        );

        const upcomingMatches = matches
          .filter(
            (match) =>
              match.event_id === row.event_id &&
              (match.team1_id === row.team_id || match.team2_id === row.team_id)
          )
          .map((match) => {
            const opponentId = match.team1_id === row.team_id ? match.team2_id : match.team1_id;

            return {
              id: match.id,
              date: match.date,
              time: match.time,
              status: match.status,
              field_name: match.field_id ? (fieldMap.get(match.field_id)?.name ?? null) : null,
              opponent_name: getTeamName(match.event_id, opponentId),
              home_team_name: getTeamName(match.event_id, match.team1_id),
              away_team_name: getTeamName(match.event_id, match.team2_id),
            };
          });

        return {
          event_id: row.event_id,
          event_name: event?.name ?? `Event #${row.event_id}`,
          event_price: eventPrice,
          stripe_price_id: event?.stripe_price_id ?? null,
          team_id: row.team_id,
          team_name: eventTeamDisplayNameMap.get(`${row.event_id}:${row.team_id}`) ?? team?.name ?? `Team #${row.team_id}`,
          jersey_number: teamPlayer?.jersey_number ?? null,
          payment_status: balanceDue <= 0 && eventPrice > 0 ? 'paid' as const : 'pending' as const,
          paid_amount: paidAmount,
          balance_due: balanceDue,
          free_appearances_remaining: Math.max(4 - appearancesCount, 0),
          upcoming_matches: upcomingMatches,
        };
      })
      .sort((left, right) => left.event_name.localeCompare(right.event_name)),
  };
}
