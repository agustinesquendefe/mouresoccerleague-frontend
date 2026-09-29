export type FixturePair = { team1_id: number; team2_id: number };

export type ExistingFixtureMatch = FixturePair & {
  round_number: number | null;
  status?: string | null;
  date?: string | null;
};

export type FixtureRoundAssignment<T extends FixturePair = FixturePair> = {
  roundNumber: number;
  pair: T;
};

export type ReassignableFixturePair = FixturePair & {
  round_number: number | null;
};

export function generateRoundRobinRounds(teamIds: number[]): FixturePair[][] {
  const teams = [...teamIds];
  if (teams.length % 2 !== 0) teams.push(-1);
  const rounds: FixturePair[][] = [];
  let rotation = [...teams];
  for (let round = 0; round < teams.length - 1; round += 1) {
    const pairs: FixturePair[] = [];
    for (let index = 0; index < teams.length / 2; index += 1) {
      const home = rotation[index];
      const away = rotation[teams.length - 1 - index];
      if (home !== -1 && away !== -1) pairs.push({ team1_id: home, team2_id: away });
    }
    rounds.push(pairs);
    const fixed = rotation[0];
    const rest = rotation.slice(1);
    rest.unshift(rest.pop()!);
    rotation = [fixed, ...rest];
  }
  return rounds;
}

export function buildDesiredRounds(teamIds: number[], cycles: number): FixturePair[][] {
  const baseRounds = generateRoundRobinRounds(teamIds);
  const desired: FixturePair[][] = [];
  for (let cycle = 1; cycle <= Math.max(1, cycles); cycle += 1) {
    const invert = cycle % 2 === 0;
    baseRounds.forEach((round) => desired.push(round.map((pair) => invert
      ? { team1_id: pair.team2_id, team2_id: pair.team1_id }
      : pair)));
  }
  return desired;
}

function matchupKey(pair: FixturePair, cycles: number): string {
  if (cycles > 1) return `${pair.team1_id}:${pair.team2_id}`;
  return [pair.team1_id, pair.team2_id].sort((a, b) => a - b).join(':');
}

export function findMissingPairs(desiredRounds: FixturePair[][], existing: FixturePair[], cycles: number): FixturePair[] {
  const counts = new Map<string, number>();
  existing.forEach((pair) => {
    const key = matchupKey(pair, cycles);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  const missing: FixturePair[] = [];
  desiredRounds.flat().forEach((pair) => {
    const key = matchupKey(pair, cycles);
    const remaining = counts.get(key) ?? 0;
    if (remaining > 0) counts.set(key, remaining - 1);
    else missing.push(pair);
  });
  return missing;
}

export function packIntoRounds(pairs: FixturePair[]): FixturePair[][] {
  const rounds: FixturePair[][] = [];
  pairs.forEach((pair) => {
    const available = rounds.find((round) => round.every((current) =>
      current.team1_id !== pair.team1_id && current.team2_id !== pair.team1_id &&
      current.team1_id !== pair.team2_id && current.team2_id !== pair.team2_id));
    if (available) available.push(pair);
    else rounds.push([pair]);
  });
  return rounds;
}

function hasTeam(pair: FixturePair, teamId: number): boolean {
  return pair.team1_id === teamId || pair.team2_id === teamId;
}

/**
 * Returns existing rounds that have not started yet. A round is considered
 * started as soon as one of its matches is played/in progress or scheduled
 * for today (or an earlier date).
 */
export function getOpenRoundNumbers(
  existingMatches: ExistingFixtureMatch[],
  today: string
): number[] {
  const matchesByRound = new Map<number, ExistingFixtureMatch[]>();

  existingMatches.forEach((match) => {
    const roundNumber = Number(match.round_number);
    if (!Number.isInteger(roundNumber) || roundNumber < 1) return;
    const roundMatches = matchesByRound.get(roundNumber) ?? [];
    roundMatches.push(match);
    matchesByRound.set(roundNumber, roundMatches);
  });

  return Array.from(matchesByRound.entries())
    .filter(([, matches]) => !matches.some((match) =>
      match.status === 'played' ||
      match.status === 'in_progress' ||
      Boolean(match.date && match.date <= today)))
    .map(([roundNumber]) => roundNumber)
    .sort((left, right) => left - right);
}

/**
 * Spreads missing matchups across open rounds. Conflicts between a new matchup
 * and an existing match are intentionally allowed: adding a team can require
 * an existing team to play twice in that round, and administrators can adjust
 * that schedule afterwards. We only prevent the newly inserted matchups from
 * repeating the same team in one round.
 */
export function assignPairsToRounds<T extends FixturePair>(
  pairs: T[],
  existingMatches: ExistingFixtureMatch[],
  openRoundNumbers: number[]
): FixtureRoundAssignment<T>[] {
  const assignedPairsByRound = new Map<number, FixturePair[]>();
  const existingRoundNumbers = existingMatches
    .map((match) => Number(match.round_number))
    .filter((roundNumber) => Number.isInteger(roundNumber) && roundNumber > 0);

  const candidateRounds = Array.from(new Set(openRoundNumbers))
    .filter((roundNumber) => Number.isInteger(roundNumber) && roundNumber > 0)
    .sort((left, right) => left - right);
  let nextRound = Math.max(0, ...existingRoundNumbers) + 1;
  const assignments: FixtureRoundAssignment<T>[] = [];

  pairs.forEach((pair) => {
    let roundNumber = candidateRounds.find((candidate) => {
      const assignedPairs = assignedPairsByRound.get(candidate) ?? [];
      return assignedPairs.every((assigned) =>
        !hasTeam(assigned, pair.team1_id) && !hasTeam(assigned, pair.team2_id));
    });

    if (roundNumber == null) {
      roundNumber = nextRound;
      nextRound += 1;
      candidateRounds.push(roundNumber);
    }

    const roundPairs = assignedPairsByRound.get(roundNumber) ?? [];
    roundPairs.push(pair);
    assignedPairsByRound.set(roundNumber, roundPairs);
    assignments.push({ roundNumber, pair });
  });

  return assignments;
}

/**
 * Compacts already-created matchups into the earliest editable rounds. Teams
 * identified as late additions cannot be repeated against retained matches;
 * other existing-team conflicts are allowed so the schedule can be shortened.
 */
export function reassignPairsToEarlierRounds<T extends ReassignableFixturePair>(
  pairs: T[],
  retainedMatches: ExistingFixtureMatch[],
  destinationRoundNumbers: number[],
  lateTeamIds: Set<number>
): FixtureRoundAssignment<T>[] {
  const retainedByRound = new Map<number, ExistingFixtureMatch[]>();
  retainedMatches.forEach((match) => {
    const roundNumber = Number(match.round_number);
    if (!Number.isInteger(roundNumber) || roundNumber < 1) return;
    const roundMatches = retainedByRound.get(roundNumber) ?? [];
    roundMatches.push(match);
    retainedByRound.set(roundNumber, roundMatches);
  });

  const assignedByRound = new Map<number, FixturePair[]>();
  const destinationRounds = Array.from(new Set(destinationRoundNumbers))
    .filter((roundNumber) => Number.isInteger(roundNumber) && roundNumber > 0)
    .sort((left, right) => left - right);

  return pairs.map((pair) => {
    const protectedTeams = [pair.team1_id, pair.team2_id]
      .filter((teamId) => lateTeamIds.has(teamId));
    const roundNumber = destinationRounds.find((candidate) => {
      const newlyAssigned = assignedByRound.get(candidate) ?? [];
      if (newlyAssigned.some((assigned) =>
        hasTeam(assigned, pair.team1_id) || hasTeam(assigned, pair.team2_id))) {
        return false;
      }

      const retained = retainedByRound.get(candidate) ?? [];
      return protectedTeams.every((teamId) =>
        retained.every((match) => !hasTeam(match, teamId)));
    });

    if (roundNumber == null) {
      throw new Error('The extended matches could not be redistributed without repeating the added team.');
    }

    const assigned = assignedByRound.get(roundNumber) ?? [];
    assigned.push(pair);
    assignedByRound.set(roundNumber, assigned);
    return { roundNumber, pair };
  });
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function getFirstMatchDate(startDate: string, matchDayOfWeek: number): Date {
  const date = new Date(`${startDate}T00:00:00`);
  const targetDay = matchDayOfWeek === 7 ? 0 : matchDayOfWeek;
  while (date.getDay() !== targetDay) date.setDate(date.getDate() + 1);
  return date;
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
