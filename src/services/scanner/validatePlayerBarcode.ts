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
      eventId: null,
      eventName: null,
      matchId: null,
      matchLabel: null,
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
    .select('id, appearances_count')
    .eq('event_id', eventId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (membership) {
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
  response: ScannerValidationResponse
): Promise<NonNullable<ScannerValidationResponse['deniedScan']> | null> {
  const { context, player, checks, summary, validatedAt } = response;

  if (!context.matchId || !context.teamId || !context.scannedCode) {
    return null;
  }

  const now = new Date().toISOString();
  const reason = checks.find((check) => !check.passed)?.message ?? summary;

  const { data: existingDeniedScan, error: existingError } = await client
    .from('scanner_denied_scans')
    .select('id')
    .eq('match_id', context.matchId)
    .eq('team_id', context.teamId)
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
    player_id: player?.id ?? null,
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

  const event = await resolveEvent(client, request.eventId ?? null);
  const match = await resolveMatch(client, request.matchId ?? null);
  const team = await resolveTeam(client, request.teamId ?? null);

  const eventCheck = buildCheck(
    'active_event',
    'Active event selected',
    Boolean(event),
    event ? `Validating against ${normalizeName(event.name, `Event #${event.id}`)}.` : 'No active event is available for validation.'
  );

  const matchContextPassed =
    !match || !event ? false : Number(match.event_id) === Number(event.id);

  const matchCheck = buildCheck(
    'match_context',
    'Match belongs to event',
    match ? matchContextPassed : true,
    match
      ? matchContextPassed
        ? 'Selected match belongs to the target event.'
        : 'Selected match does not belong to the chosen event.'
      : 'No match selected. Validation will use only event and team context.'
  );

  const teamContextPassed =
    Boolean(team) && (!match || team!.id === match.team1_id || team!.id === match.team2_id);

  const teamCheck = buildCheck(
    'team_context',
    'Team context selected',
    teamContextPassed,
    !team
      ? 'A team must be selected before scanning.'
      : !match || teamContextPassed
        ? `Validating against ${normalizeName(team.name, `Team #${team.id}`)}.`
        : 'Selected team is not part of the selected match.'
  );

  if (!eventCheck.passed || !matchCheck.passed || !teamCheck.passed) {
    return buildDeniedResponse(barcode, [eventCheck, matchCheck, teamCheck], {
      context: {
        scannerMode: 'keyboard_wedge',
        scannedCode: barcode,
        eventId: event?.id ?? null,
        eventName: event ? normalizeName(event.name, `Event #${event.id}`) : null,
        matchId: match?.id ?? null,
        matchLabel: match
          ? `${normalizeName(match.team1_name, `Team #${match.team1_id}`)} vs ${normalizeName(match.team2_name, `Team #${match.team2_id}`)}`
          : null,
        teamId: team?.id ?? null,
        teamName: team ? normalizeName(team.name, `Team #${team.id}`) : null,
      },
    });
  }

  if (!event || !team) {
    throw new Error('Scanner validation context is incomplete.');
  }

  const resolvedEvent = event;
  const resolvedTeam = team;

  const { data: player, error: playerError } = await client
    .from('players')
    .select('id, full_name, document_id, photo_url, paid_membership, is_active')
    .eq('document_id', barcode)
    .limit(1)
    .maybeSingle();

  if (playerError) {
    throw new Error(playerError.message);
  }

  const playerExistsCheck = buildCheck(
    'player_exists',
    'Player exists',
    Boolean(player),
    player ? `Player found for barcode ${barcode}.` : `No player was found for barcode ${barcode}.`
  );

  if (!player) {
    const response = buildDeniedResponse(barcode, [eventCheck, matchCheck, teamCheck, playerExistsCheck], {
      context: {
        scannerMode: 'keyboard_wedge',
        scannedCode: barcode,
        eventId: resolvedEvent.id,
        eventName: normalizeName(resolvedEvent.name, `Event #${resolvedEvent.id}`),
        matchId: match?.id ?? null,
        matchLabel: match
          ? `${normalizeName(match.team1_name, `Team #${match.team1_id}`)} vs ${normalizeName(match.team2_name, `Team #${match.team2_id}`)}`
          : null,
        teamId: resolvedTeam.id,
        teamName: normalizeName(resolvedTeam.name, `Team #${resolvedTeam.id}`),
      },
    });

    const deniedScan = await registerDeniedScan(client, response);
    return {
      ...response,
      deniedScan,
    };
  }

  const playerActiveCheck = buildCheck(
    'player_active',
    'Player is active',
    Boolean(player.is_active),
    player.is_active ? 'Player is active.' : 'Player is inactive and cannot be validated.'
  );

  const { data: teamMembershipRows, error: teamMembershipError } = await client
    .from('team_players')
    .select('id, team_id, event_id, is_active')
    .eq('player_id', player.id)
    .eq('team_id', resolvedTeam.id)
    .eq('is_active', true);

  if (teamMembershipError) {
    throw new Error(teamMembershipError.message);
  }

  const belongsToTeam = (teamMembershipRows ?? []).some(
    (row: any) => row.event_id == null || Number(row.event_id) === Number(resolvedEvent.id)
  );

  const teamMembershipCheck = buildCheck(
    'team_membership',
    'Belongs to selected team',
    belongsToTeam,
    belongsToTeam
      ? `Player belongs to ${normalizeName(resolvedTeam.name, `Team #${resolvedTeam.id}`)}.`
      : `Player does not belong to ${normalizeName(resolvedTeam.name, `Team #${resolvedTeam.id}`)} for the selected event.`
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
        ? `${normalizeName(player.full_name, `Player #${player.id}`)} was already checked in for this match.`
        : `${normalizeName(player.full_name, `Player #${player.id}`)} is cleared and checked in for this match.`
      : failedChecks[0]?.message ?? 'Player validation failed.',
    context: {
      scannerMode: 'keyboard_wedge',
      scannedCode: barcode,
      eventId: resolvedEvent.id,
      eventName: normalizeName(resolvedEvent.name, `Event #${resolvedEvent.id}`),
      matchId: match?.id ?? null,
      matchLabel: match
        ? `${normalizeName(match.team1_name, `Team #${match.team1_id}`)} vs ${normalizeName(match.team2_name, `Team #${match.team2_id}`)}`
        : null,
      teamId: resolvedTeam.id,
      teamName: normalizeName(resolvedTeam.name, `Team #${resolvedTeam.id}`),
    },
    player: {
      id: Number(player.id),
      fullName: normalizeName(player.full_name, `Player #${player.id}`),
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
  } else if (match?.id) {
    const { error } = await client
      .from('scanner_denied_scans')
      .delete()
      .eq('match_id', match.id)
      .eq('team_id', resolvedTeam.id)
      .eq('scanned_code', barcode);

    if (error) {
      throw new Error(error.message);
    }
  }

  return response;
}
