import { supabase } from '@/lib/supabaseClient';
import { getFieldsByEvent } from '@/services/eventFields/getFieldsByEvent';
import {
  addDays,
  formatDate,
  getFirstMatchDate,
} from './incrementalFixture';
import { reconcileFixture } from './fixtureReconciliation';

type EventTeam = {
  id: number;
  team_id: number;
  group_id: number | null;
  order_index: number;
  status: string;
  fixture_start_round: number;
  teams?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

type FixtureMatch = {
  id: number;
  team1_id: number;
  team2_id: number;
  group_id: number | null;
  round_number: number | null;
  status: string | null;
  score1: number | null;
  score2: number | null;
  is_extra: boolean | null;
  date: string | null;
  time: string | null;
  field_id: number | null;
  field_number: number | null;
  pos: number | null;
};

export type PlannedFixtureMatch = {
  match_id: number | null;
  team1_id: number;
  team2_id: number;
  group_id: number | null;
  round_number: number;
  match_date: string;
  match_time: string | null;
  field_id: number | null;
  field_number: number | null;
};

type TeamStartUpdate = {
  event_team_id: number;
  from_round: number;
  to_round: number;
};

export type PlannedPendingAssignment = {
  event_team_id: number;
  team_id: number;
  group_id: number | null;
  round_number: number;
};

export type FixtureRoundPreview = {
  roundNumber: number;
  currentMatchCount: number;
  plannedMatchCount: number;
  restingTeamNames: string[];
};

export type FixtureRegenerationPreview = {
  eventId: number;
  formatType: string;
  lastStartedRound: number;
  firstEditableRound: number;
  selectedTeamStartRound: number;
  lastExistingRound: number;
  selectableStartRounds: number[];
  joiningTeamNames: string[];
  preservedMatchCount: number;
  scheduledMatchesToReplace: number;
  plannedMatchCount: number;
  rounds: FixtureRoundPreview[];
  expectedMatchIds: number[];
  teamStartUpdates: TeamStartUpdate[];
  plannedMatches: PlannedFixtureMatch[];
  pendingAssignments: PlannedPendingAssignment[];
};

export type FixtureRegenerationResult = {
  cancelled_match_count: number;
  inserted_match_count: number;
  reused_match_count: number;
  updated_team_count: number;
};

function hasStarted(match: FixtureMatch): boolean {
  return match.status === 'played' ||
    match.status === 'in_progress' ||
    match.score1 != null ||
    match.score2 != null;
}

function teamName(team: EventTeam): string {
  const relation = Array.isArray(team.teams) ? team.teams[0] : team.teams;
  return relation?.name?.trim() || `#${team.team_id}`;
}

export async function previewFixtureRegeneration(
  eventId: number,
  selectedTeamStartRound?: number
): Promise<FixtureRegenerationPreview> {
  if (!Number.isFinite(eventId)) throw new Error('Invalid event id');

  const [eventResult, teamsResult, matchesResult, pendingResult, fields] = await Promise.all([
    supabase
      .from('events')
      .select('format_type, round_robin_cycles, start_date, match_day_of_week')
      .eq('id', eventId)
      .single(),
    supabase
      .from('event_teams')
      .select('id, team_id, group_id, order_index, status, fixture_start_round, teams(name)')
      .eq('event_id', eventId)
      .eq('status', 'active')
      .order('order_index')
      .order('id'),
    supabase
      .from('matches')
      .select('id, team1_id, team2_id, group_id, round_number, status, score1, score2, is_extra, date, time, field_id, field_number, pos')
      .eq('event_id', eventId)
      .or('stage_type.eq.league,stage_type.is.null')
      .order('round_number')
      .order('pos')
      .order('id'),
    supabase
      .from('fixture_pending_assignments')
      .select('team_id, status')
      .eq('event_id', eventId),
    getFieldsByEvent(eventId),
  ]);

  if (eventResult.error) throw new Error(eventResult.error.message);
  if (teamsResult.error) throw new Error(teamsResult.error.message);
  if (matchesResult.error) throw new Error(matchesResult.error.message);
  if (pendingResult.error) throw new Error(pendingResult.error.message);

  const event = eventResult.data;
  if (event.format_type !== 'round_robin' && event.format_type !== 'groups') {
    throw new Error('Fixture regeneration is only available for round robin and group events.');
  }
  if (!event.start_date || !event.match_day_of_week) {
    throw new Error('The event must have a start date and match day configured.');
  }
  if (fields.length === 0) throw new Error('This event has no fields assigned.');

  const teams = (teamsResult.data ?? []) as unknown as EventTeam[];
  const matches = (matchesResult.data ?? []) as FixtureMatch[];
  if (teams.length < 2) throw new Error('At least 2 active teams are required to generate a fixture.');
  if (event.format_type === 'groups' && teams.some((team) => team.group_id == null)) {
    throw new Error('Every active team must be assigned to a group before generating the fixture.');
  }

  const activeFixtureMatches = matches.filter((match) =>
    !match.is_extra && match.status !== 'cancelled');
  const startedRounds = matches
    .filter((match) => match.status !== 'cancelled' && hasStarted(match))
    .map((match) => Number(match.round_number))
    .filter((roundNumber) => Number.isInteger(roundNumber) && roundNumber > 0);
  const lastStartedRound = Math.max(0, ...startedRounds);
  const historicalTeamIds = new Set(activeFixtureMatches
    .flatMap((match) => [match.team1_id, match.team2_id]));
  const joiningTeams = teams.filter((team) => !historicalTeamIds.has(team.team_id));
  const reconciliation = reconcileFixture(
    event.format_type,
    event.round_robin_cycles || 1,
    teams,
    matches
  );
  const replaceableMatches = reconciliation.replaceableMatches as FixtureMatch[];
  const firstEditableRound = Math.min(
    ...replaceableMatches
      .map((match) => Number(match.round_number))
      .filter((roundNumber) => Number.isInteger(roundNumber) && roundNumber > 0),
    reconciliation.lastPlannedRound || 1
  );
  const lastExistingRound = reconciliation.lastPlannedRound;
  const selectableStartRounds: number[] = [];
  const effectiveTeamStartRound = selectedTeamStartRound ?? Math.min(
    ...joiningTeams.map((team) => Math.max(1, Number(team.fixture_start_round) || 1)),
    firstEditableRound
  );
  const teamStartUpdates: TeamStartUpdate[] = [];
  const startRoundByTeamId = new Map(teams.map((team) => [
    team.team_id,
    Math.max(1, Number(team.fixture_start_round) || 1),
  ]));

  const slotsByRound = new Map<number, FixtureMatch[]>();
  replaceableMatches.forEach((match) => {
    const roundNumber = Number(match.round_number);
    const slots = slotsByRound.get(roundNumber) ?? [];
    slots.push(match);
    slotsByRound.set(roundNumber, slots);
  });

  const firstDate = getFirstMatchDate(event.start_date, event.match_day_of_week);
  const plannedCountByRound = new Map<number, number>();
  const reusableMatches = [...replaceableMatches];
  const plannedMatches: PlannedFixtureMatch[] = reconciliation.plannedPairs.map((pair) => {
    const matchIndex = plannedCountByRound.get(pair.round_number) ?? 0;
    plannedCountByRound.set(pair.round_number, matchIndex + 1);
    const existingSlot = slotsByRound.get(pair.round_number)?.[matchIndex];
    const reusableMatch = reusableMatches.find((match) =>
      match.team1_id === pair.team1_id && match.team2_id === pair.team2_id) ??
      reusableMatches[0];
    if (reusableMatch) {
      reusableMatches.splice(reusableMatches.indexOf(reusableMatch), 1);
    }
    const field = fields[matchIndex % fields.length];
    return {
      ...pair,
      match_id: reusableMatch?.id ?? null,
      match_date: existingSlot?.date ?? formatDate(addDays(firstDate, (pair.round_number - 1) * 7)),
      match_time: existingSlot?.time ?? null,
      field_id: existingSlot?.field_id ?? field?.id ?? null,
      field_number: existingSlot?.field_number ?? (matchIndex % fields.length) + 1,
    };
  });

  const namesByTeamId = new Map(teams.map((team) => [team.team_id, teamName(team)]));
  const rounds = Array.from({ length: lastExistingRound }, (_, index) => index + 1).map((roundNumber) => {
    const plannedInRound = plannedMatches.filter((match) => match.round_number === roundNumber);
    const immutableInRound = reconciliation.immutableMatches.filter((match) =>
      Number(match.round_number) === roundNumber);
    const playingTeamIds = new Set([
      ...immutableInRound.flatMap((match) => [match.team1_id, match.team2_id]),
      ...plannedInRound.flatMap((match) => [match.team1_id, match.team2_id]),
    ]);
    const restingTeamNames = teams
      .filter((team) =>
        (startRoundByTeamId.get(team.team_id) ?? 1) <= roundNumber &&
        !playingTeamIds.has(team.team_id))
      .map((team) => namesByTeamId.get(team.team_id) ?? `#${team.team_id}`);
    return {
      roundNumber,
      currentMatchCount: activeFixtureMatches.filter((match) =>
        Number(match.round_number) === roundNumber).length,
      plannedMatchCount: immutableInRound.length + plannedInRound.length,
      restingTeamNames,
    };
  });

  return {
    eventId,
    formatType: event.format_type,
    lastStartedRound,
    firstEditableRound,
    selectedTeamStartRound: effectiveTeamStartRound,
    lastExistingRound,
    selectableStartRounds,
    joiningTeamNames: joiningTeams.map(teamName),
    preservedMatchCount: reconciliation.immutableMatches.length,
    scheduledMatchesToReplace: replaceableMatches.length,
    plannedMatchCount: plannedMatches.length,
    rounds,
    expectedMatchIds: replaceableMatches.map((match) => match.id).sort((left, right) => left - right),
    teamStartUpdates,
    plannedMatches,
    pendingAssignments: [],
  };
}

export async function createPendingFixtureAssignments(
  preview: FixtureRegenerationPreview
): Promise<number> {
  const { data, error } = await supabase.rpc('create_fixture_pending_assignments', {
    p_event_id: preview.eventId,
    p_expected_last_started_round: preview.lastStartedRound,
    p_team_start_updates: preview.teamStartUpdates,
    p_assignments: preview.pendingAssignments,
  });
  if (error) throw new Error(error.message);
  return Number(data) || 0;
}

export async function applyFixtureRegeneration(
  preview: FixtureRegenerationPreview
): Promise<FixtureRegenerationResult> {
  const { data, error } = await supabase.rpc('apply_fixture_regeneration', {
    p_event_id: preview.eventId,
    p_start_round: preview.firstEditableRound,
    p_expected_match_ids: preview.expectedMatchIds,
    p_team_start_updates: preview.teamStartUpdates,
    p_matches: preview.plannedMatches,
  });

  if (error) throw new Error(error.message);
  return data as FixtureRegenerationResult;
}

export async function regenerateFixture(
  eventId: number,
  selectedTeamStartRound?: number
): Promise<FixtureRegenerationResult> {
  const preview = await previewFixtureRegeneration(eventId, selectedTeamStartRound);
  return applyFixtureRegeneration(preview);
}
