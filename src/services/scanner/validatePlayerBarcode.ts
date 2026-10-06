import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ScannerValidationCheck,
  ScannerValidationRequest,
  ScannerValidationResponse,
} from '@/models/scanner';
import { getEventMemberships } from '@/services/eventMemberships/getEventMemberships';

type EventRow = {
  id: number;
  name: string | null;
  status: string | null;
};

type MatchRow = {
  id: number;
  event_id: number;
  date: string | null;
  time: string | null;
  status: string | null;
  team1_id: number;
  team2_id: number;
  team1_name: string | null;
  team2_name: string | null;
};

type TeamRow = {
  id: number;
  name: string | null;
};

function buildCheck(
  code: ScannerValidationCheck['code'],
  label: string,
  passed: boolean,
  message: string
): ScannerValidationCheck {
  return { code, label, passed, message };
}

function normalizeBarcode(value: string) {
  return value.trim();
}

function normalizeName(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function getPlayerDisplayName(player: {
  id: number;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}) {
  const firstLastName = `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim();
  return normalizeName(player.full_name, firstLastName || `Player #${player.id}`);
}

function buildDeniedResponse(
  scannedCode: string,
  checks: ScannerValidationCheck[],
  overrides: Partial<ScannerValidationResponse> = {}
): ScannerValidationResponse {
  const failedChecks = checks.filter((check) => !check.passed);
  const summary = failedChecks[0]?.message ?? 'Player validation failed.';

  return {
    approved: false,
    outcome: 'denied',
    headline: 'DENIED',
    summary,
    context: {
      scannerMode: 'keyboard_wedge',
      scannedCode,
      playerName: null,
      eventId: null,
      eventName: null,
      matchId: null,
      matchLabel: null,
      matchDate: null,
      teamId: null,
      teamName: null,
      ...(overrides.context ?? {}),
    },
    player: null,
    checks,
    validatedAt: new Date().toISOString(),
    ...overrides,
  };
}

async function registerScannerCheckIn(
  client: SupabaseClient,
  params: {
    eventId: number;
    matchId: number;
    teamId: number;
    playerId: number;
  }
): Promise<NonNullable<ScannerValidationResponse['checkIn']>> {
  const { eventId, matchId, teamId, playerId } = params;

  const { data: existingCheckIn, error: existingCheckInError } = await client
    .from('match_check_ins')
    .select('id, checked_in_at, status, method')
    .eq('match_id', matchId)
    .eq('player_id', playerId)
    .limit(1)
    .maybeSingle();

  if (existingCheckInError) {
    throw new Error(existingCheckInError.message);
  }

  if (existingCheckIn) {
    return {
      id: Number(existingCheckIn.id),
      status: 'already_checked_in',
      method: 'scanner',
      checkedInAt: existingCheckIn.checked_in_at ?? null,
      message: 'Player was already checked in for this match.',
    };
  }

  const now = new Date().toISOString();
  const { data: checkIn, error: insertError } = await client
    .from('match_check_ins')
    .insert({
      match_id: matchId,
      team_id: teamId,
      player_id: playerId,
      status: 'approved',
      method: 'scanner',
      checked_in_at: now,
    })
    .select('id, checked_in_at')
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  const { data: membership, error: membershipError } = await client
    .from('event_memberships')
    .select(`
      id,
      amount_paid,
      appearances_count,
      event:events (
        event_price,
        membership_price
      )
    `)
    .eq('event_id', eventId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (membership) {
    const event = Array.isArray(membership.event) ? membership.event[0] ?? null : membership.event ?? null;
    const eventPrice = Number(event?.event_price ?? event?.membership_price ?? 0);
    const amountPaid = Number(membership.amount_paid ?? 0);
    const balanceDue = Math.max(eventPrice - amountPaid, 0);

    if (balanceDue > 0) {
      const { error: updateMembershipError } = await client
        .from('event_memberships')
        .update({
          appearances_count: Number(membership.appearances_count ?? 0) + 1,
          updated_at: now,
        })
        .eq('id', membership.id);

      if (updateMembershipError) {
        throw new Error(updateMembershipError.message);
      }
    }
  } else {
    const { error: createMembershipError } = await client
      .from('event_memberships')
      .insert({
        event_id: eventId,
        player_id: playerId,
        amount_paid: 0,
        appearances_count: 1,
        updated_at: now,
      });

    if (createMembershipError) {
      throw new Error(createMembershipError.message);
    }
  }

  return {
    id: Number(checkIn.id),
    status: 'approved',
    method: 'scanner',
    checkedInAt: checkIn.checked_in_at ?? now,
    message: 'Player was checked in for this match.',
  };
}

async function registerDeniedScan(
  client: SupabaseClient,
  response: ScannerValidationResponse,
  playerIdOverride?: number | null
): Promise<NonNullable<ScannerValidationResponse['deniedScan']> | null> {
  const { context, player, checks, summary, validatedAt } = response;

  if (!context.matchId || !context.scannedCode) {
    return null;
  }

  const now = new Date().toISOString();
  const reason = checks.find((check) => !check.passed)?.message ?? summary;

  const { data: existingDeniedScan, error: existingError } = await client
    .from('scanner_denied_scans')
    .select('id')
    .eq('match_id', context.matchId)
    .eq('scanned_code', context.scannedCode)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const payload = {
    event_id: context.eventId,
    match_id: context.matchId,
    team_id: context.teamId,
    player_id: playerIdOverride ?? player?.id ?? null,
    scanned_code: context.scannedCode,
    reason,
    summary,
    method: 'scanner',
    checks,
    validated_at: validatedAt,
    updated_at: now,
  };

  if (existingDeniedScan) {
    const { data, error } = await client
      .from('scanner_denied_scans')
      .update(payload)
      .eq('id', existingDeniedScan.id)
      .select('id, updated_at')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      id: Number(data.id),
      method: 'scanner',
      savedAt: data.updated_at ?? now,
      message: 'Denied scan was updated.',
    };
  }

  const { data, error } = await client
    .from('scanner_denied_scans')
    .insert({
      ...payload,
      created_at: now,
    })
    .select('id, created_at')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: Number(data.id),
    method: 'scanner',
    savedAt: data.created_at ?? now,
    message: 'Denied scan was saved.',
  };
}

async function resolveEvent(client: SupabaseClient, eventId?: number | null): Promise<EventRow | null> {
  if (eventId) {
    const { data, error } = await client
      .from('events')
      .select('id, name, status')
      .eq('id', eventId)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as EventRow;
  }

  const { data, error } = await client
    .from('events')
    .select('id, name, status')
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])[0] as EventRow | null;
}

async function resolveMatch(client: SupabaseClient, matchId?: number | null): Promise<MatchRow | null> {
  if (!matchId) return null;

  const { data, error } = await client
    .from('matches')
    .select(`
      id,
      event_id,
      date,
      time,
      status,
      team1_id,
      team2_id,
      team1:teams!matches_team1_id_fkey ( name ),
      team2:teams!matches_team2_id_fkey ( name )
    `)
    .eq('id', matchId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const row = data as any;

  return {
    id: Number(row.id),
    event_id: Number(row.event_id),
    date: row.date ?? null,
    time: row.time ?? null,
    status: row.status ?? null,
    team1_id: Number(row.team1_id),
    team2_id: Number(row.team2_id),
    team1_name: row.team1?.name ?? null,
    team2_name: row.team2?.name ?? null,
  };
}

async function resolveTeam(client: SupabaseClient, teamId?: number | null): Promise<TeamRow | null> {
  if (!teamId) return null;

  const { data, error } = await client
    .from('teams')
    .select('id, name')
    .eq('id', teamId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as TeamRow;
}

async function resolvePlayerTeamForMatch(
  client: SupabaseClient,
  playerId: number,
  eventId: number,
  match: MatchRow
): Promise<TeamRow | null> {
  const matchTeamIds = [match.team1_id, match.team2_id];
  const { data: playerRosterRows, error: playerRosterError } = await client
    .from('team_players')
    .select('team_id')
    .eq('player_id', playerId)
    .eq('event_id', eventId)
    .in('team_id', matchTeamIds)
    .eq('is_active', true);

  if (playerRosterError) throw new Error(playerRosterError.message);
  const eligibleTeamIds = Array.from(new Set(
    (playerRosterRows ?? [])
      .map((row) => Number(row.team_id))
  ));

  if (eligibleTeamIds.length !== 1) return null;
  return resolveTeam(client, eligibleTeamIds[0]);
}

async function resolvePlayerContextForDate(
  client: SupabaseClient,
  params: {
    playerId: number;
    eventId: number;
    matchDate: string;
    candidateMatchIds?: number[];
  }
): Promise<{ team: TeamRow | null; match: MatchRow | null }> {
  const { playerId, eventId, matchDate, candidateMatchIds = [] } = params;
  const allowedMatchIds = candidateMatchIds
    .map(Number)
    .filter((matchId) => Number.isInteger(matchId) && matchId > 0);
  const { data: rosterRows, error: rosterError } = await client
    .from('team_players')
    .select('team_id')
    .eq('player_id', playerId)
    .eq('event_id', eventId)
    .eq('is_active', true);

  if (rosterError) throw new Error(rosterError.message);

  const rosterTeamIds = Array.from(
    new Set((rosterRows ?? []).map((row) => Number(row.team_id)).filter(Number.isFinite))
  );

  if (rosterTeamIds.length === 0) return { team: null, match: null };
  const fallbackTeam = rosterTeamIds.length === 1
    ? await resolveTeam(client, rosterTeamIds[0])
    : null;

  if (Array.isArray(params.candidateMatchIds) && allowedMatchIds.length === 0) {
    return { team: fallbackTeam, match: null };
  }

  let matchQuery = client
    .from('matches')
    .select(`
      id,
      event_id,
      date,
      time,
      status,
      team1_id,
      team2_id,
      team1:teams!matches_team1_id_fkey ( name ),
      team2:teams!matches_team2_id_fkey ( name )
    `)
    .eq('event_id', eventId)
    .eq('date', matchDate)
    .or(`team1_id.in.(${rosterTeamIds.join(',')}),team2_id.in.(${rosterTeamIds.join(',')})`)
    .order('time', { ascending: true })
    .order('id', { ascending: true });

  if (allowedMatchIds.length > 0) {
    matchQuery = matchQuery.in('id', allowedMatchIds);
  }

  const { data: matches, error: matchesError } = await matchQuery;
  if (matchesError) throw new Error(matchesError.message);

  const availableMatches = ((matches ?? []) as any[]).filter(
    (match) => String(match.status ?? '').toLowerCase() !== 'cancelled'
  );
  const matchRow = availableMatches.find(
    (match) => String(match.status ?? '').toLowerCase() !== 'played'
  ) ?? availableMatches[0] ?? null;

  if (!matchRow) return { team: fallbackTeam, match: null };

  const scheduledTeamIds = [Number(matchRow.team1_id), Number(matchRow.team2_id)];
  const matchingTeamIds = rosterTeamIds.filter((teamId) => scheduledTeamIds.includes(teamId));
  if (matchingTeamIds.length !== 1) return { team: fallbackTeam, match: null };

  return {
    team: await resolveTeam(client, matchingTeamIds[0]),
    match: {
      id: Number(matchRow.id),
      event_id: Number(matchRow.event_id),
      date: matchRow.date ?? null,
      time: matchRow.time ?? null,
      status: matchRow.status ?? null,
      team1_id: Number(matchRow.team1_id),
      team2_id: Number(matchRow.team2_id),
      team1_name: matchRow.team1?.name ?? null,
      team2_name: matchRow.team2?.name ?? null,
    },
  };
}

export async function validatePlayerBarcode(
  client: SupabaseClient,
  request: ScannerValidationRequest
): Promise<ScannerValidationResponse> {
  const barcode = normalizeBarcode(request.barcode);

  if (!barcode) {
    return buildDeniedResponse(barcode, [
      buildCheck('player_exists', 'Player exists', false, 'A barcode value is required.'),
    ]);
  }

  const [event, requestedMatch, playerResult] = await Promise.all([
    resolveEvent(client, request.eventId ?? null),
    resolveMatch(client, request.matchId ?? null),
    client
      .from('players')
      .select('id, full_name, first_name, last_name, document_id, photo_url, paid_membership, is_active')
      .eq('document_id', barcode)
      .limit(1)
      .maybeSingle(),
  ]);

  if (playerResult.error) {
    throw new Error(playerResult.error.message);
  }

  const player = playerResult.data;
  let match = requestedMatch;
  let team = request.teamId ? await resolveTeam(client, request.teamId) : null;

  if (!team && event && match && player) {
    team = await resolvePlayerTeamForMatch(client, Number(player.id), Number(event.id), match);
  } else if (!team && event && player && request.matchDate) {
    const resolvedContext = await resolvePlayerContextForDate(client, {
      playerId: Number(player.id),
      eventId: Number(event.id),
      matchDate: request.matchDate,
      candidateMatchIds: request.candidateMatchIds,
    });
    team = resolvedContext.team;
    match = resolvedContext.match;
  }

  const eventCheck = buildCheck(
    'active_event',
    'Active event selected',
    Boolean(event),
    event ? `Validating against ${normalizeName(event.name, `Event #${event.id}`)}.` : 'No active event is available for validation.'
  );

  const matchStatus = String(match?.status ?? '').toLowerCase();
  const matchContextPassed = Boolean(
    match &&
    event &&
    Number(match.event_id) === Number(event.id) &&
    (!request.matchDate || match.date === request.matchDate) &&
    matchStatus !== 'played' &&
    matchStatus !== 'cancelled'
  );

  const matchCheck = buildCheck(
    'match_context',
    request.matchDate ? 'Match detected for selected date' : 'Match belongs to event',
    match ? matchContextPassed : !request.matchDate,
    match
      ? matchContextPassed
        ? request.matchDate
          ? `Player match was detected for ${request.matchDate}.`
          : 'Selected match belongs to the target event.'
        : 'Selected match is not pending for the chosen event and date.'
      : request.matchDate
        ? `No match was found for the player's team on ${request.matchDate}.`
        : 'No match selected. Validation will use only event and team context.'
  );

  const teamContextPassed =
    Boolean(team) && (!match || team!.id === match.team1_id || team!.id === match.team2_id);

  const teamCheck = buildCheck(
    'team_context',
    request.teamId ? 'Team context selected' : 'Team automatically detected',
    teamContextPassed,
    !team
      ? player && match
        ? request.matchDate
          ? `The player is not registered with a team playing on ${request.matchDate}.`
          : 'The player is not registered with either team in the selected match.'
        : request.matchDate
          ? `The player team could not be detected for ${request.matchDate}.`
          : 'The player team could not be detected for the selected match.'
      : !match || teamContextPassed
        ? `${request.teamId ? 'Validating against' : 'Automatically matched to'} ${normalizeName(team.name, `Team #${team.id}`)}.`
        : 'Selected team is not part of the selected match.'
  );

  const playerExistsCheck = buildCheck(
    'player_exists',
    'Player exists',
    Boolean(player),
    player ? `Player found for barcode ${barcode}.` : `No player was found for barcode ${barcode}.`
  );

  if (!eventCheck.passed || !matchCheck.passed || !playerExistsCheck.passed || !teamCheck.passed) {
    const deniedResponse = buildDeniedResponse(barcode, [eventCheck, playerExistsCheck, teamCheck, matchCheck], {
      context: {
        scannerMode: 'keyboard_wedge',
        scannedCode: barcode,
        playerName: player
          ? getPlayerDisplayName(player)
          : null,
        eventId: event?.id ?? null,
        eventName: event ? normalizeName(event.name, `Event #${event.id}`) : null,
        matchId: match?.id ?? null,
        matchLabel: match
          ? `${normalizeName(match.team1_name, `Team #${match.team1_id}`)} vs ${normalizeName(match.team2_name, `Team #${match.team2_id}`)}`
          : null,
        matchDate: request.matchDate ?? match?.date ?? null,
        teamId: team?.id ?? null,
        teamName: team ? normalizeName(team.name, `Team #${team.id}`) : null,
      },
    });

    deniedResponse.deniedScan = await registerDeniedScan(
      client,
      deniedResponse,
      player ? Number(player.id) : null
    );
    return deniedResponse;
  }

  if (!event || !team || !player) {
    throw new Error('Scanner validation context is incomplete.');
  }

  const resolvedEvent = event;
  const resolvedTeam = team;

  const playerActiveCheck = buildCheck(
    'player_active',
    'Player is active',
    Boolean(player.is_active),
    player.is_active ? 'Player is active.' : 'Player is inactive and cannot be validated.'
  );

  const teamMembershipResult = await client
    .from('team_players')
    .select('id, team_id, event_id, is_active')
    .eq('player_id', player.id)
    .eq('team_id', resolvedTeam.id)
    .eq('event_id', resolvedEvent.id)
    .eq('is_active', true);

  const { data: teamMembershipRows, error: teamMembershipError } = teamMembershipResult;

  if (teamMembershipError) {
    throw new Error(teamMembershipError.message);
  }

  const belongsToTeam = (teamMembershipRows ?? []).length > 0;

  const teamMembershipCheck = buildCheck(
    'team_membership',
    'Belongs to selected team',
    belongsToTeam,
    belongsToTeam
      ? `Player belongs to ${normalizeName(resolvedTeam.name, `Team #${resolvedTeam.id}`)} on the selected event roster.`
      : `Player is not on ${normalizeName(resolvedTeam.name, `Team #${resolvedTeam.id}`)}'s roster for the selected event.`
  );

  const memberships = await getEventMemberships(resolvedEvent.id, client, {
    ensureMembershipRows: false,
  });
  const eventMembership = memberships.find((membership) => Number(membership.player_id) === Number(player.id));

  const amountPaid = Number(eventMembership?.amount_paid ?? 0);
  const balanceDue = Number(eventMembership?.balance_due ?? 0);
  const membershipPrice = Number(eventMembership?.membership_price ?? 0);
  const appearancesCount = Number(eventMembership?.appearances_count ?? 0);
  const freeAppearancesRemaining = Number(eventMembership?.free_appearances_remaining ?? 0);
  const canPlayWithoutEventPayment = Boolean(eventMembership?.can_play) && balanceDue > 0;
  const hasEventPayment = membershipPrice <= 0 ? true : amountPaid > 0 || canPlayWithoutEventPayment;
  const hasGeneralMembershipPaid = Number(player.paid_membership ?? 0) > 0;

  const paidMembershipCheck = buildCheck(
    'paid_membership',
    'Membership paid',
    hasGeneralMembershipPaid || Boolean(eventMembership?.can_play),
    hasGeneralMembershipPaid
      ? 'General membership payment is marked as paid.'
      : eventMembership?.can_play
        ? 'General membership payment is pending, but the player is still allowed to play under the current event eligibility rules.'
        : 'General membership payment is pending.'
  );

  const eventPaymentCheck = buildCheck(
    'active_event_payment',
    'Active event payment registered',
    hasEventPayment,
    hasEventPayment
      ? membershipPrice <= 0
        ? 'This event does not require payment.'
        : amountPaid > 0
          ? 'Player has a recorded payment for the active event.'
          : `Player has not paid yet but is still within the first 4 matches. Remaining free matches: ${freeAppearancesRemaining}.`
      : `Player has already used ${appearancesCount} unpaid appearances and must pay before the next match.`
  );

  const eligibleToPlayCheck = buildCheck(
    'eligible_to_play',
    'Eligible to play',
    Boolean(eventMembership?.can_play),
    eventMembership?.can_play
      ? 'Player is currently enabled to play.'
      : 'Player is not enabled to play for the active event.'
  );

  const checks = [
    eventCheck,
    matchCheck,
    teamCheck,
    playerExistsCheck,
    playerActiveCheck,
    teamMembershipCheck,
    paidMembershipCheck,
    eventPaymentCheck,
    eligibleToPlayCheck,
  ];

  const approved = checks.every((check) => check.passed);
  const failedChecks = checks.filter((check) => !check.passed);
  const checkIn = approved && match
    ? await registerScannerCheckIn(client, {
        eventId: resolvedEvent.id,
        matchId: match.id,
        teamId: resolvedTeam.id,
        playerId: Number(player.id),
      })
    : null;

  const response: ScannerValidationResponse = {
    approved,
    outcome: approved ? 'approved' : 'denied',
    headline: approved ? 'APPROVED' : 'DENIED',
    summary: approved
      ? checkIn?.status === 'already_checked_in'
        ? `${getPlayerDisplayName(player)} was already checked in for this match.`
        : `${getPlayerDisplayName(player)} is cleared and checked in for this match.`
      : failedChecks[0]?.message ?? 'Player validation failed.',
    context: {
      scannerMode: 'keyboard_wedge',
      scannedCode: barcode,
      playerName: getPlayerDisplayName(player),
      eventId: resolvedEvent.id,
      eventName: normalizeName(resolvedEvent.name, `Event #${resolvedEvent.id}`),
      matchId: match?.id ?? null,
      matchLabel: match
        ? `${normalizeName(match.team1_name, `Team #${match.team1_id}`)} vs ${normalizeName(match.team2_name, `Team #${match.team2_id}`)}`
        : null,
      matchDate: request.matchDate ?? match?.date ?? null,
      teamId: resolvedTeam.id,
      teamName: normalizeName(resolvedTeam.name, `Team #${resolvedTeam.id}`),
    },
    player: {
      id: Number(player.id),
      fullName: getPlayerDisplayName(player),
      documentId: player.document_id ?? barcode,
      photoUrl: player.photo_url ?? null,
      paidMembership: Number(player.paid_membership ?? 0) > 0,
      amountPaid,
      balanceDue,
      membershipStatus: eventMembership?.status ?? null,
      canPlay: Boolean(eventMembership?.can_play),
    },
    checks,
    validatedAt: new Date().toISOString(),
    checkIn,
  };

  if (!approved) {
    response.deniedScan = await registerDeniedScan(client, response);
  }

  return response;
}
