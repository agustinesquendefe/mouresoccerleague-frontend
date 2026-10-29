import { supabase } from '@/lib/supabaseClient';

type CompactionMatch = {
  id: number;
  team1_id: number;
  team2_id: number;
  group_id: number | null;
  round_number: number | null;
  status: string | null;
  score1: number | null;
  score2: number | null;
  is_extra: boolean | null;
  pos: number | null;
};

type EventTeamRow = {
  team_id: number;
  group_id: number | null;
};

type PlannedMatchUpdate = {
  id: number;
  fromRound: number;
  toRound: number;
};

export type FixtureCompactionPreview = {
  matchesToMove: number;
  roundsBefore: number;
  roundsAfter: number;
  roundsRemoved: number;
  firstDestinationRound: number | null;
  expectedRoundCount: number;
};

type FixtureCompactionPlan = FixtureCompactionPreview & {
  updates: PlannedMatchUpdate[];
};

function roundRobinRoundCount(teamCount: number, cycles: number): number {
  if (teamCount < 2) return 0;
  const roundsPerCycle = teamCount % 2 === 0 ? teamCount - 1 : teamCount;
  return roundsPerCycle * Math.max(1, cycles);
}

function getExpectedRoundCount(
  formatType: string,
  teams: EventTeamRow[],
  cycles: number
): number {
  if (formatType === 'round_robin') {
    return roundRobinRoundCount(new Set(teams.map((team) => team.team_id)).size, cycles);
  }

  if (formatType === 'groups') {
    const teamIdsByGroup = new Map<number, Set<number>>();
    teams.forEach((team) => {
      if (team.group_id == null) return;
      const teamIds = teamIdsByGroup.get(team.group_id) ?? new Set<number>();
      teamIds.add(team.team_id);
      teamIdsByGroup.set(team.group_id, teamIds);
    });
    return Math.max(
      0,
      ...Array.from(teamIdsByGroup.values()).map((teamIds) =>
        roundRobinRoundCount(teamIds.size, cycles))
    );
  }

  throw new Error('Future-round compaction is only available for round robin and group events.');
}

function hasStarted(match: CompactionMatch): boolean {
  return match.status === 'played' ||
    match.status === 'in_progress' ||
    match.score1 != null ||
    match.score2 != null;
}

async function buildFixtureCompactionPlan(eventId: number): Promise<FixtureCompactionPlan> {
  if (!Number.isFinite(eventId)) throw new Error('Invalid event id');

  const [eventResult, teamsResult, matchesResult] = await Promise.all([
    supabase
      .from('events')
      .select('format_type, round_robin_cycles')
      .eq('id', eventId)
      .single(),
    supabase
      .from('event_teams')
      .select('team_id, group_id')
      .eq('event_id', eventId)
      .eq('status', 'active'),
    supabase
      .from('matches')
      .select('id, team1_id, team2_id, group_id, round_number, status, score1, score2, is_extra, pos')
      .eq('event_id', eventId)
      .or('stage_type.eq.league,stage_type.is.null')
      .order('round_number')
      .order('pos')
      .order('id'),
  ]);

  if (eventResult.error) throw new Error(eventResult.error.message);
  if (teamsResult.error) throw new Error(teamsResult.error.message);
  if (matchesResult.error) throw new Error(matchesResult.error.message);

  const event = eventResult.data;
  const teams = (teamsResult.data ?? []) as EventTeamRow[];
  const matches = (matchesResult.data ?? []) as CompactionMatch[];
  const expectedRoundCount = getExpectedRoundCount(
    event.format_type,
    teams,
    event.round_robin_cycles || 1
  );
  if (expectedRoundCount === 0) {
    throw new Error('There are not enough active teams to compact this fixture.');
  }

  const activeTeamIds = new Set(teams.map((team) => team.team_id));
  const fixtureMatches = matches.filter((match) =>
    !match.is_extra &&
    match.status !== 'cancelled' &&
    activeTeamIds.has(match.team1_id) &&
    activeTeamIds.has(match.team2_id));

  const startedOutsideRange = fixtureMatches.filter((match) =>
    hasStarted(match) && Number(match.round_number) > expectedRoundCount);
  if (startedOutsideRange.length > 0) {
    throw new Error(
      `${startedOutsideRange.length} match${startedOutsideRange.length === 1 ? ' with a result is' : 'es with results are'} ` +
      `outside the configured ${expectedRoundCount} rounds. Review those matches manually before compacting.`
    );
  }

  const invalidRounds = fixtureMatches.filter((match) => {
    const roundNumber = Number(match.round_number);
    return !Number.isInteger(roundNumber) || roundNumber < 1;
  });
  if (invalidRounds.length > 0) {
    throw new Error('One or more active fixture matches have no valid round number.');
  }

  const lockedRoundNumbers = new Set(fixtureMatches
    .filter(hasStarted)
    .map((match) => Number(match.round_number)));
  const destinationRounds = Array.from(
    { length: expectedRoundCount },
    (_, index) => index + 1
  ).filter((roundNumber) => !lockedRoundNumbers.has(roundNumber));

  const movableMatches = fixtureMatches
    .filter((match) =>
      match.status === 'scheduled' && Number(match.round_number) > expectedRoundCount)
    .sort((left, right) =>
      Number(left.round_number) - Number(right.round_number) ||
      Number(left.pos ?? Number.MAX_SAFE_INTEGER) - Number(right.pos ?? Number.MAX_SAFE_INTEGER) ||
      left.id - right.id);

  if (movableMatches.length > 0 && destinationRounds.length === 0) {
    throw new Error('There are no editable configured rounds available for compaction.');
  }

  const movableIds = new Set(movableMatches.map((match) => match.id));
  const matchesPerRound = new Map<number, number>();
  const teamsPerRound = new Map<number, Map<number, number>>();
  fixtureMatches
    .filter((match) => !movableIds.has(match.id))
    .forEach((match) => {
      const roundNumber = Number(match.round_number);
      if (roundNumber < 1 || roundNumber > expectedRoundCount) return;
      matchesPerRound.set(roundNumber, (matchesPerRound.get(roundNumber) ?? 0) + 1);
      const appearances = teamsPerRound.get(roundNumber) ?? new Map<number, number>();
      appearances.set(match.team1_id, (appearances.get(match.team1_id) ?? 0) + 1);
      appearances.set(match.team2_id, (appearances.get(match.team2_id) ?? 0) + 1);
      teamsPerRound.set(roundNumber, appearances);
    });

  const updates: PlannedMatchUpdate[] = movableMatches.map((match) => {
    const normalizedRound = ((Number(match.round_number) - 1) % expectedRoundCount) + 1;
    const toRound = [...destinationRounds].sort((left, right) => {
      const leftAppearances = teamsPerRound.get(left);
      const rightAppearances = teamsPerRound.get(right);
      const leftConflict = (leftAppearances?.get(match.team1_id) ?? 0) +
        (leftAppearances?.get(match.team2_id) ?? 0);
      const rightConflict = (rightAppearances?.get(match.team1_id) ?? 0) +
        (rightAppearances?.get(match.team2_id) ?? 0);
      if (leftConflict !== rightConflict) return leftConflict - rightConflict;

      const leftCount = matchesPerRound.get(left) ?? 0;
      const rightCount = matchesPerRound.get(right) ?? 0;
      if (leftCount !== rightCount) return leftCount - rightCount;

      const leftDistance = Math.abs(left - normalizedRound);
      const rightDistance = Math.abs(right - normalizedRound);
      if (leftDistance !== rightDistance) return leftDistance - rightDistance;
      return left - right;
    })[0];

    if (toRound == null) throw new Error('No configured destination round is available.');

    matchesPerRound.set(toRound, (matchesPerRound.get(toRound) ?? 0) + 1);
    const appearances = teamsPerRound.get(toRound) ?? new Map<number, number>();
    appearances.set(match.team1_id, (appearances.get(match.team1_id) ?? 0) + 1);
    appearances.set(match.team2_id, (appearances.get(match.team2_id) ?? 0) + 1);
    teamsPerRound.set(toRound, appearances);

    return {
      id: match.id,
      fromRound: Number(match.round_number),
      toRound,
    };
  });

  const roundsBefore = Math.max(0, ...fixtureMatches.map((match) => Number(match.round_number) || 0));
  const assignedRoundById = new Map(updates.map((update) => [update.id, update.toRound]));
  const roundsAfter = Math.max(0, ...fixtureMatches.map((match) =>
    (assignedRoundById.get(match.id) ?? Number(match.round_number)) || 0));

  return {
    updates,
    matchesToMove: updates.length,
    roundsBefore,
    roundsAfter,
    roundsRemoved: Math.max(0, roundsBefore - roundsAfter),
    firstDestinationRound: updates.length > 0
      ? Math.min(...updates.map((update) => update.toRound))
      : null,
    expectedRoundCount,
  };
}

export async function previewFutureFixtureCompaction(
  eventId: number
): Promise<FixtureCompactionPreview> {
  const { updates: _updates, ...preview } = await buildFixtureCompactionPlan(eventId);
  return preview;
}

export async function compactFutureFixture(eventId: number): Promise<FixtureCompactionPreview> {
  const plan = await buildFixtureCompactionPlan(eventId);
  if (plan.updates.length === 0) {
    const { updates: _updates, ...preview } = plan;
    return preview;
  }

  const { data, error } = await supabase.rpc('apply_match_round_compaction', {
    p_event_id: eventId,
    p_updates: plan.updates.map((update) => ({
      id: update.id,
      from_round: update.fromRound,
      to_round: update.toRound,
    })),
  });
  if (error) throw new Error(error.message);
  if (Number(data) !== plan.updates.length) {
    throw new Error('The compacted match count did not match the preview. Reload the fixture.');
  }

  const { updates: _updates, ...preview } = plan;
  return preview;
}
