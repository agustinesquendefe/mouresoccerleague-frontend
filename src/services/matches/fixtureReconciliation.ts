import {
  buildDesiredRounds,
  fixtureMatchupKey,
  type FixturePair,
} from './incrementalFixture';

export type ReconciliationTeam = {
  team_id: number;
  group_id: number | null;
  fixture_start_round: number;
};

export type ReconciliationMatch = FixturePair & {
  id: number;
  group_id: number | null;
  round_number: number | null;
  status: string | null;
  score1: number | null;
  score2: number | null;
  is_extra: boolean | null;
};

export type ReconciledPair = FixturePair & {
  group_id: number | null;
  round_number: number;
};

export type FixtureReconciliation = {
  immutableMatches: ReconciliationMatch[];
  replaceableMatches: ReconciliationMatch[];
  plannedPairs: ReconciledPair[];
  configuredRoundCount: number;
  lastPlannedRound: number;
};

function hasResult(match: ReconciliationMatch): boolean {
  return match.status === 'played' ||
    match.status === 'in_progress' ||
    match.score1 != null ||
    match.score2 != null;
}

function roundCount(teamCount: number, cycles: number): number {
  if (teamCount < 2) return 0;
  return (teamCount % 2 === 0 ? teamCount - 1 : teamCount) * Math.max(1, cycles);
}

function groupKey(groupId: number | null): string {
  return groupId == null ? 'ungrouped' : String(groupId);
}

function pairKey(pair: FixturePair, groupId: number | null, cycles: number): string {
  return `${groupKey(groupId)}:${fixtureMatchupKey(pair, cycles)}`;
}

function addOccupied(
  occupiedByRound: Map<number, Set<number>>,
  roundNumber: number,
  teamId: number
) {
  const occupied = occupiedByRound.get(roundNumber) ?? new Set<number>();
  occupied.add(teamId);
  occupiedByRound.set(roundNumber, occupied);
}

/**
 * Reconciles the configured round-robin multiset against immutable results.
 * Scheduled matches without a result are deliberately replaceable, even when
 * a later-numbered round has already started.
 */
export function reconcileFixture(
  formatType: string,
  cyclesValue: number,
  teams: ReconciliationTeam[],
  matches: ReconciliationMatch[]
): FixtureReconciliation {
  const cycles = Math.max(1, Number(cyclesValue) || 1);
  const activeTeamIds = new Set(teams.map((team) => team.team_id));
  const activeMatches = matches.filter((match) => !match.is_extra && match.status !== 'cancelled');
  const replaceableMatches = activeMatches.filter((match) =>
    match.status === 'scheduled' && !hasResult(match));
  const immutableMatches = activeMatches.filter((match) =>
    match.status !== 'scheduled' || hasResult(match));

  const groupIds = formatType === 'groups'
    ? Array.from(new Set(teams.map((team) => team.group_id)))
    : [null];
  const teamsByGroup = new Map(groupIds.map((groupId) => [
    groupKey(groupId),
    teams.filter((team) => formatType !== 'groups' || team.group_id === groupId),
  ]));

  const desiredPairs: Array<FixturePair & { group_id: number | null; sequence: number }> = [];
  let sequence = 0;
  groupIds.forEach((groupId) => {
    const groupTeams = teamsByGroup.get(groupKey(groupId)) ?? [];
    buildDesiredRounds(groupTeams.map((team) => team.team_id), cycles)
      .flat()
      .forEach((pair) => desiredPairs.push({ ...pair, group_id: groupId, sequence: sequence++ }));
  });

  const desiredByKey = new Map<string, Array<typeof desiredPairs[number]>>();
  desiredPairs.forEach((pair) => {
    const key = pairKey(pair, pair.group_id, cycles);
    const values = desiredByKey.get(key) ?? [];
    values.push(pair);
    desiredByKey.set(key, values);
  });

  immutableMatches.forEach((match) => {
    if (!activeTeamIds.has(match.team1_id) || !activeTeamIds.has(match.team2_id)) return;
    const groupId = formatType === 'groups' ? match.group_id : null;
    desiredByKey.get(pairKey(match, groupId, cycles))?.shift();
  });

  const remainingPairs = Array.from(desiredByKey.values()).flat();
  const startRoundByTeamId = new Map(teams.map((team) => [
    team.team_id,
    Math.max(1, Number(team.fixture_start_round) || 1),
  ]));
  const occupiedByRound = new Map<number, Set<number>>();
  immutableMatches.forEach((match) => {
    const roundNumber = Number(match.round_number);
    if (!Number.isInteger(roundNumber) || roundNumber < 1) return;
    addOccupied(occupiedByRound, roundNumber, match.team1_id);
    addOccupied(occupiedByRound, roundNumber, match.team2_id);
  });

  const configuredRoundCount = Math.max(0, ...groupIds.map((groupId) =>
    roundCount((teamsByGroup.get(groupKey(groupId)) ?? []).length, cycles)));
  const existingRoundCount = Math.max(0, ...immutableMatches.map((match) =>
    Number(match.round_number) || 0));
  let lastPlannedRound = Math.max(configuredRoundCount, existingRoundCount);
  const plannedPairs: ReconciledPair[] = [];

  const remainingDegree = () => {
    const degree = new Map<number, number>();
    remainingPairs.forEach((pair) => {
      degree.set(pair.team1_id, (degree.get(pair.team1_id) ?? 0) + 1);
      degree.set(pair.team2_id, (degree.get(pair.team2_id) ?? 0) + 1);
    });
    return degree;
  };

  const scheduleRound = (roundNumber: number): number => {
    const occupied = occupiedByRound.get(roundNumber) ?? new Set<number>();
    const degree = remainingDegree();
    const availableRoundCount = new Map<number, number>();
    teams.forEach((team) => {
      let count = 0;
      const startRound = startRoundByTeamId.get(team.team_id) ?? 1;
      for (let candidate = Math.max(roundNumber, startRound); candidate <= lastPlannedRound; candidate += 1) {
        if (!occupiedByRound.get(candidate)?.has(team.team_id)) count += 1;
      }
      availableRoundCount.set(team.team_id, Math.max(1, count));
    });
    const pressure = (teamId: number) =>
      (degree.get(teamId) ?? 0) / (availableRoundCount.get(teamId) ?? 1);

    const candidates = remainingPairs
      .filter((pair) =>
        (startRoundByTeamId.get(pair.team1_id) ?? 1) <= roundNumber &&
        (startRoundByTeamId.get(pair.team2_id) ?? 1) <= roundNumber &&
        !occupied.has(pair.team1_id) &&
        !occupied.has(pair.team2_id))
      .sort((left, right) => {
        const leftMax = Math.max(pressure(left.team1_id), pressure(left.team2_id));
        const rightMax = Math.max(pressure(right.team1_id), pressure(right.team2_id));
        return rightMax - leftMax ||
          pressure(right.team1_id) + pressure(right.team2_id) -
            pressure(left.team1_id) - pressure(left.team2_id) ||
          left.sequence - right.sequence;
      });

    let scheduled = 0;
    candidates.forEach((pair) => {
      if (occupied.has(pair.team1_id) || occupied.has(pair.team2_id)) return;
      occupied.add(pair.team1_id);
      occupied.add(pair.team2_id);
      plannedPairs.push({
        team1_id: pair.team1_id,
        team2_id: pair.team2_id,
        group_id: pair.group_id,
        round_number: roundNumber,
      });
      const index = remainingPairs.indexOf(pair);
      if (index >= 0) remainingPairs.splice(index, 1);
      scheduled += 1;
    });
    occupiedByRound.set(roundNumber, occupied);
    return scheduled;
  };

  for (let roundNumber = 1; roundNumber <= lastPlannedRound; roundNumber += 1) {
    scheduleRound(roundNumber);
  }

  // Locked results can make the configured range impossible. Extend only as
  // much as needed, and fail defensively if eligibility data is inconsistent.
  let extensionAttempts = 0;
  while (remainingPairs.length > 0) {
    lastPlannedRound += 1;
    extensionAttempts += 1;
    if (scheduleRound(lastPlannedRound) === 0 || extensionAttempts > desiredPairs.length + teams.length) {
      throw new Error('The remaining fixture could not be scheduled with the active teams and start rounds.');
    }
  }

  return {
    immutableMatches,
    replaceableMatches,
    plannedPairs,
    configuredRoundCount,
    lastPlannedRound,
  };
}
