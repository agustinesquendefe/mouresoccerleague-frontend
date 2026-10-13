import type { SupabaseClient } from '@supabase/supabase-js';

export type CoachPortalPlayer = {
  rosterId: number;
  playerId: number;
  playerName: string;
  documentId: string | null;
  email: string | null;
  jerseyNumber: number | null;
  eventId: number | null;
  eventName: string;
};

export type CoachPortalValidation = {
  id: string;
  decision: 'approved' | 'denied';
  playerId: number | null;
  playerName: string;
  documentId: string | null;
  eventId: number;
  eventName: string;
  matchId: number;
  matchLabel: string;
  matchDate: string | null;
  matchTime: string | null;
  matchStatus: string | null;
  recordedAt: string | null;
  reason: string | null;
};

export type CoachPortalTeam = {
  id: number;
  name: string;
  logoUrl: string | null;
  role: string | null;
  players: CoachPortalPlayer[];
  validations: CoachPortalValidation[];
};

export type CoachPortalData = {
  coach: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  teams: CoachPortalTeam[];
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function playerName(player: any, fallback: string) {
  const fullName = player?.full_name?.trim();
  if (fullName) return fullName;
  const firstLastName = `${player?.first_name ?? ''} ${player?.last_name ?? ''}`.trim();
  return firstLastName || fallback;
}

export async function getCoachPortalData(
  client: SupabaseClient,
  authUser: { id: string; email: string }
): Promise<CoachPortalData | null> {
  const normalizedEmail = authUser.email.trim().toLowerCase();
  const { data: coachRows, error: coachError } = await client
    .from('coaches')
    .select('id, first_name, last_name, email, status, auth_user_id')
    .or(`auth_user_id.eq.${authUser.id},email.ilike.${normalizedEmail}`)
    .limit(2);

  if (coachError) throw new Error(coachError.message);
  const coach = (coachRows ?? []).find((row) => row.auth_user_id === authUser.id)
    ?? (coachRows ?? []).find((row) => row.email?.trim().toLowerCase() === normalizedEmail)
    ?? null;

  if (!coach || coach.status === 'inactive') return null;

  const { data: assignments, error: assignmentsError } = await client
    .from('team_coaches')
    .select('team_id, role')
    .eq('coach_id', coach.id);

  if (assignmentsError) throw new Error(assignmentsError.message);
  const teamIds = Array.from(new Set((assignments ?? []).map((row) => Number(row.team_id))));

  if (teamIds.length === 0) {
    return {
      coach: {
        id: Number(coach.id),
        firstName: coach.first_name ?? '',
        lastName: coach.last_name ?? '',
        email: normalizedEmail,
      },
      teams: [],
    };
  }

  const [teamsResponse, eventTeamsResponse, rosterResponse] = await Promise.all([
    client.from('teams').select('id, name, logo_url').in('id', teamIds),
    client.from('event_teams').select('event_id, team_id, display_name, status').in('team_id', teamIds),
    client
      .from('team_players')
      .select(`
        id,
        team_id,
        event_id,
        player_id,
        jersey_number,
        player:players (id, full_name, first_name, last_name, document_id, email, is_active)
      `)
      .in('team_id', teamIds)
      .eq('is_active', true),
  ]);

  if (teamsResponse.error) throw new Error(teamsResponse.error.message);
  if (eventTeamsResponse.error) throw new Error(eventTeamsResponse.error.message);
  if (rosterResponse.error) throw new Error(rosterResponse.error.message);

  // Keep completed and archived events in scope so coaches can review historical
  // player validations, not only the matches from currently active competitions.
  const eventIds = Array.from(new Set(
    (eventTeamsResponse.data ?? []).map((row) => Number(row.event_id))
  ));
  const { data: events, error: eventsError } = eventIds.length > 0
    ? await client.from('events').select('id, name, status').in('id', eventIds)
    : { data: [], error: null };

  if (eventsError) throw new Error(eventsError.message);
  const eventMap = new Map((events ?? []).map((event) => [Number(event.id), event]));
  const teamEventIds = Array.from(eventMap.keys());

  const { data: matches, error: matchesError } = teamEventIds.length > 0
    ? await client
      .from('matches')
      .select('id, event_id, team1_id, team2_id, date, time, status')
      .in('event_id', teamEventIds)
      .or(`team1_id.in.(${teamIds.join(',')}),team2_id.in.(${teamIds.join(',')})`)
    : { data: [], error: null };

  if (matchesError) throw new Error(matchesError.message);
  const matchRows = matches ?? [];
  const matchIds = matchRows.map((match) => Number(match.id));
  const opponentTeamIds = Array.from(new Set(
    matchRows.flatMap((match) => [Number(match.team1_id), Number(match.team2_id)])
  ));

  const [opponentsResponse, approvedResponse, deniedResponse] = await Promise.all([
    opponentTeamIds.length > 0
      ? client.from('teams').select('id, name').in('id', opponentTeamIds)
      : Promise.resolve({ data: [], error: null }),
    matchIds.length > 0
      ? client
        .from('match_check_ins')
        .select(`
          id, match_id, team_id, player_id, status, checked_in_at,
          player:players (id, full_name, first_name, last_name, document_id)
        `)
        .in('match_id', matchIds)
        .in('team_id', teamIds)
        .eq('status', 'approved')
      : Promise.resolve({ data: [], error: null }),
    matchIds.length > 0
      ? client
        .from('scanner_denied_scans')
        .select(`
          id, match_id, team_id, player_id, scanned_code, reason, validated_at,
          player:players (id, full_name, first_name, last_name, document_id)
        `)
        .in('match_id', matchIds)
        .in('team_id', teamIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (opponentsResponse.error) throw new Error(opponentsResponse.error.message);
  if (approvedResponse.error) throw new Error(approvedResponse.error.message);
  if (deniedResponse.error) throw new Error(deniedResponse.error.message);

  const teamMap = new Map((teamsResponse.data ?? []).map((team) => [Number(team.id), team]));
  const allTeamNameMap = new Map((opponentsResponse.data ?? []).map((team) => [Number(team.id), team.name]));
  const eventTeamNameMap = new Map(
    (eventTeamsResponse.data ?? []).map((row) => [
      `${row.event_id}:${row.team_id}`,
      row.display_name?.trim() || teamMap.get(Number(row.team_id))?.name || `Team #${row.team_id}`,
    ])
  );
  const matchMap = new Map(matchRows.map((match) => [Number(match.id), match]));

  const buildValidation = (
    row: any,
    decision: 'approved' | 'denied'
  ): CoachPortalValidation | null => {
    const match = matchMap.get(Number(row.match_id));
    if (!match) return null;
    const player = firstRelation(row.player);
    const teamId = Number(row.team_id);
    const opponentId = Number(match.team1_id) === teamId ? Number(match.team2_id) : Number(match.team1_id);
    const eventId = Number(match.event_id);

    return {
      id: `${decision}:${row.id}`,
      decision,
      playerId: row.player_id == null ? null : Number(row.player_id),
      playerName: playerName(player, decision === 'denied' ? `Unknown player (${row.scanned_code})` : `Player #${row.player_id}`),
      documentId: player?.document_id ?? row.scanned_code ?? null,
      eventId,
      eventName: eventMap.get(eventId)?.name?.trim() || `Event #${eventId}`,
      matchId: Number(match.id),
      matchLabel: `${eventTeamNameMap.get(`${eventId}:${teamId}`) ?? allTeamNameMap.get(teamId) ?? `Team #${teamId}`} vs ${eventTeamNameMap.get(`${eventId}:${opponentId}`) ?? allTeamNameMap.get(opponentId) ?? `Team #${opponentId}`}`,
      matchDate: match.date ?? null,
      matchTime: match.time ?? null,
      matchStatus: match.status ?? null,
      recordedAt: decision === 'approved' ? row.checked_in_at ?? null : row.validated_at ?? null,
      reason: decision === 'denied' ? row.reason ?? 'Player validation failed.' : null,
    };
  };

  const validationsByTeam = new Map<number, CoachPortalValidation[]>();
  const addValidation = (row: any, decision: 'approved' | 'denied') => {
    const validation = buildValidation(row, decision);
    const teamId = Number(row.team_id);
    if (!validation || !Number.isFinite(teamId)) return;
    const current = validationsByTeam.get(teamId) ?? [];
    current.push(validation);
    validationsByTeam.set(teamId, current);
  };
  (approvedResponse.data ?? []).forEach((row) => addValidation(row, 'approved'));
  (deniedResponse.data ?? []).forEach((row) => addValidation(row, 'denied'));

  const playersByTeam = new Map<number, CoachPortalPlayer[]>();
  (rosterResponse.data ?? []).forEach((row: any) => {
    const eventId = row.event_id == null ? null : Number(row.event_id);
    if (eventId !== null && !eventMap.has(eventId)) return;
    const player = firstRelation(row.player);
    if (!player || player.is_active === false) return;
    const teamId = Number(row.team_id);
    const current = playersByTeam.get(teamId) ?? [];
    current.push({
      rosterId: Number(row.id),
      playerId: Number(row.player_id),
      playerName: playerName(player, `Player #${row.player_id}`),
      documentId: player.document_id ?? null,
      email: player.email ?? null,
      jerseyNumber: row.jersey_number == null ? null : Number(row.jersey_number),
      eventId,
      eventName: eventId === null
        ? 'General roster'
        : eventMap.get(eventId)?.name?.trim() || `Event #${eventId}`,
    });
    playersByTeam.set(teamId, current);
  });

  return {
    coach: {
      id: Number(coach.id),
      firstName: coach.first_name ?? '',
      lastName: coach.last_name ?? '',
      email: normalizedEmail,
    },
    teams: teamIds.map((teamId) => ({
      id: teamId,
      name: teamMap.get(teamId)?.name?.trim() || `Team #${teamId}`,
      logoUrl: teamMap.get(teamId)?.logo_url ?? null,
      role: (assignments ?? []).find((assignment) => Number(assignment.team_id) === teamId)?.role ?? null,
      players: (playersByTeam.get(teamId) ?? []).sort((left, right) => (
        left.eventName.localeCompare(right.eventName) || left.playerName.localeCompare(right.playerName)
      )),
      validations: (validationsByTeam.get(teamId) ?? []).sort((left, right) => (
        String(right.recordedAt ?? '').localeCompare(String(left.recordedAt ?? ''))
      )),
    })),
  };
}
