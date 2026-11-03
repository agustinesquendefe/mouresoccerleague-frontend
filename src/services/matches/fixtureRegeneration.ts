import { supabase } from '@/lib/supabaseClient';
import { getFieldsByEvent } from '@/services/eventFields/getFieldsByEvent';
import {
  addDays,
  formatDate,
  generateRoundRobinRounds,
  getFirstMatchDate,
  type FixturePair,
} from './incrementalFixture';

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
  updated_team_count: number;
};

function hasStarted(match: FixtureMatch): boolean {
  return match.status === 'played' ||
    match.status === 'in_progress' ||
    match.score1 != null ||
    match.score2 != null;
}

function matchupKey(pair: FixturePair): string {
  return [pair.team1_id, pair.team2_id].sort((left, right) => left - right).join(':');
}

function expectedRoundCount(teamCount: number, cycles: number): number {
  if (teamCount < 2) return 0;
  return (teamCount % 2 === 0 ? teamCount - 1 : teamCount) * Math.max(1, cycles);
}

function teamName(team: EventTeam): string {
  const relation = Array.isArray(team.teams) ? team.teams[0] : team.teams;
  return relation?.name?.trim() || `#${team.team_id}`;
}

function chooseRoundPairs(
  teamIds: number[],
  matchupCounts: Map<string, number>,
  appearanceCounts: Map<number, number>,
  roundNumber: number
): FixturePair[] {
  if (teamIds.length < 2) return [];

  const candidates = generateRoundRobinRounds(teamIds);
  const ranked = candidates.map((pairs, index) => {
    const duplicateCost = pairs.reduce(
      (total, pair) => total + (matchupCounts.get(matchupKey(pair)) ?? 0),
      0
    );
    const appearanceCost = pairs.reduce(
      (total, pair) => total +
        (appearanceCounts.get(pair.team1_id) ?? 0) +
        (appearanceCounts.get(pair.team2_id) ?? 0),
      0
    );
    return { pairs, index, score: duplicateCost * 10_000 + appearanceCost };
  }).sort((left, right) => left.score - right.score || left.index - right.index);

  const selected = ranked[0]?.pairs ?? [];
  const invert = roundNumber % 2 === 0;
  return selected.map((pair) => invert
    ? { team1_id: pair.team2_id, team2_id: pair.team1_id }
    : pair);
}

function recordPairs(
  pairs: FixturePair[],
  matchupCounts: Map<string, number>,
  appearanceCounts: Map<number, number>
) {
  pairs.forEach((pair) => {
    const key = matchupKey(pair);
    matchupCounts.set(key, (matchupCounts.get(key) ?? 0) + 1);
    appearanceCounts.set(pair.team1_id, (appearanceCounts.get(pair.team1_id) ?? 0) + 1);
    appearanceCounts.set(pair.team2_id, (appearanceCounts.get(pair.team2_id) ?? 0) + 1);
  });
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
  const firstEditableRound = lastStartedRound + 1;

  const configuredRoundCount = event.format_type === 'round_robin'
    ? expectedRoundCount(teams.length, event.round_robin_cycles || 1)
    : Math.max(0, ...Array.from(new Set(teams.map((team) => team.group_id))).map((groupId) =>
      expectedRoundCount(
        teams.filter((team) => team.group_id === groupId).length,
        event.round_robin_cycles || 1
      )));
  const existingRoundCount = Math.max(0, ...activeFixtureMatches
    .map((match) => Number(match.round_number))
    .filter((roundNumber) => Number.isInteger(roundNumber) && roundNumber > 0));
  const lastExistingRound = existingRoundCount || configuredRoundCount;

  if (lastExistingRound < firstEditableRound) {
    throw new Error('There are no future rounds available to regenerate.');
  }

  const selectableStartRounds = Array.from(
    { length: lastExistingRound - firstEditableRound + 1 },
    (_, index) => firstEditableRound + index
  );
  const effectiveTeamStartRound = selectedTeamStartRound ?? firstEditableRound;
  if (!selectableStartRounds.includes(effectiveTeamStartRound)) {
    throw new Error(`Choose a team start round between ${firstEditableRound} and ${lastExistingRound}.`);
  }

  const historicalTeamIds = new Set(activeFixtureMatches
    .filter((match) => Number(match.round_number) <= lastStartedRound)
    .flatMap((match) => [match.team1_id, match.team2_id]));
  const previouslyAssignedTeamIds = new Set((pendingResult.data ?? [])
    .filter((item) => item.status !== 'cancelled')
    .map((item) => item.team_id));
  const joiningTeams = lastStartedRound === 0
    ? []
    : teams.filter((team) =>
      !previouslyAssignedTeamIds.has(team.team_id) && (
        Number(team.fixture_start_round) >= firstEditableRound ||
        !historicalTeamIds.has(team.team_id)));
  const joiningTeamIds = new Set(joiningTeams.map((team) => team.team_id));
  const teamStartUpdates = joiningTeams
    .filter((team) => Number(team.fixture_start_round) !== effectiveTeamStartRound)
    .map((team) => ({
      event_team_id: team.id,
      from_round: Number(team.fixture_start_round),
      to_round: effectiveTeamStartRound,
    }));
  const startRoundByTeamId = new Map(teams.map((team) => [
    team.team_id,
    joiningTeamIds.has(team.team_id)
      ? effectiveTeamStartRound
      : Math.max(1, Number(team.fixture_start_round) || 1),
  ]));

  const retainedMatches = activeFixtureMatches.filter((match) =>
    Number(match.round_number) < firstEditableRound);
  const matchupCounts = new Map<string, number>();
  const appearanceCounts = new Map<number, number>();
  retainedMatches.forEach((match) => recordPairs([match], matchupCounts, appearanceCounts));

  const groupRoundLimits = new Map<number | null, number>();
  if (event.format_type === 'round_robin') {
    groupRoundLimits.set(null, lastExistingRound);
  } else {
    Array.from(new Set(teams.map((team) => team.group_id))).forEach((groupId) => {
      const existingGroupLastRound = Math.max(0, ...activeFixtureMatches
        .filter((match) => match.group_id === groupId)
        .map((match) => Number(match.round_number))
        .filter((roundNumber) => Number.isInteger(roundNumber) && roundNumber > 0));
      const configuredGroupRounds = expectedRoundCount(
        teams.filter((team) => team.group_id === groupId).length,
        event.round_robin_cycles || 1
      );
      groupRoundLimits.set(groupId, existingGroupLastRound || configuredGroupRounds);
    });
  }

  const plannedPairs: Array<FixturePair & { group_id: number | null; round_number: number }> = [];
  for (let roundNumber = firstEditableRound; roundNumber <= lastExistingRound; roundNumber += 1) {
    const groupIds = event.format_type === 'groups'
      ? Array.from(new Set(teams.map((team) => team.group_id)))
      : [null];

    groupIds.forEach((groupId) => {
      if (roundNumber > (groupRoundLimits.get(groupId) ?? 0)) return;
      const eligibleTeamIds = teams
        .filter((team) =>
          (event.format_type !== 'groups' || team.group_id === groupId) &&
          (startRoundByTeamId.get(team.team_id) ?? 1) <= roundNumber)
        .map((team) => team.team_id);
      const pairs = chooseRoundPairs(eligibleTeamIds, matchupCounts, appearanceCounts, roundNumber);
      recordPairs(pairs, matchupCounts, appearanceCounts);
      plannedPairs.push(...pairs.map((pair) => ({ ...pair, group_id: groupId, round_number: roundNumber })));
    });
  }

  const replaceableMatches = matches.filter((match) =>
    !match.is_extra &&
    match.status === 'scheduled' &&
    match.score1 == null &&
    match.score2 == null &&
    Number(match.round_number) >= firstEditableRound);
  const slotsByRound = new Map<number, FixtureMatch[]>();
  replaceableMatches.forEach((match) => {
    const roundNumber = Number(match.round_number);
    const slots = slotsByRound.get(roundNumber) ?? [];
    slots.push(match);
    slotsByRound.set(roundNumber, slots);
  });

  const firstDate = getFirstMatchDate(event.start_date, event.match_day_of_week);
  const plannedCountByRound = new Map<number, number>();
  const plannedMatches: PlannedFixtureMatch[] = plannedPairs.map((pair) => {
    const matchIndex = plannedCountByRound.get(pair.round_number) ?? 0;
    plannedCountByRound.set(pair.round_number, matchIndex + 1);
    const existingSlot = slotsByRound.get(pair.round_number)?.[matchIndex];
    const field = fields[matchIndex % fields.length];
    return {
      ...pair,
      match_date: existingSlot?.date ?? formatDate(addDays(firstDate, (pair.round_number - 1) * 7)),
      match_time: existingSlot?.time ?? null,
      field_id: existingSlot?.field_id ?? field?.id ?? null,
      field_number: existingSlot?.field_number ?? (matchIndex % fields.length) + 1,
    };
  });

  const namesByTeamId = new Map(teams.map((team) => [team.team_id, teamName(team)]));
  const rounds = selectableStartRounds.map((roundNumber) => {
    const plannedInRound = plannedMatches.filter((match) => match.round_number === roundNumber);
    const playingTeamIds = new Set(plannedInRound.flatMap((match) => [match.team1_id, match.team2_id]));
    const restingTeamNames = teams
      .filter((team) =>
        (startRoundByTeamId.get(team.team_id) ?? 1) <= roundNumber &&
        !playingTeamIds.has(team.team_id))
      .map((team) => namesByTeamId.get(team.team_id) ?? `#${team.team_id}`);
    return {
      roundNumber,
      currentMatchCount: replaceableMatches.filter((match) => Number(match.round_number) === roundNumber).length,
      plannedMatchCount: plannedInRound.length,
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
    scheduledMatchesToReplace: replaceableMatches.length,
    plannedMatchCount: plannedMatches.length,
    rounds,
    expectedMatchIds: replaceableMatches.map((match) => match.id).sort((left, right) => left - right),
    teamStartUpdates,
    plannedMatches,
    pendingAssignments: joiningTeams.flatMap((team) => selectableStartRounds
      .filter((roundNumber) =>
        roundNumber >= effectiveTeamStartRound &&
        roundNumber <= (groupRoundLimits.get(event.format_type === 'groups' ? team.group_id : null) ?? lastExistingRound))
      .map((roundNumber) => ({
        event_team_id: team.id,
        team_id: team.team_id,
        group_id: event.format_type === 'groups' ? team.group_id : null,
        round_number: roundNumber,
      }))),
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
