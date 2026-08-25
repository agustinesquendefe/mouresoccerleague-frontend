export type FixturePair = { team1_id: number; team2_id: number };

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
