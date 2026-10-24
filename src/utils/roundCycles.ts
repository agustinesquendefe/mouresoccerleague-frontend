export type RoundCycle = {
  cycleNumber: number;
  rounds: number[];
  firstRound: number;
  lastRound: number;
};

export function groupRoundsByCycle(roundNumbers: number[], configuredCycles: number): RoundCycle[] {
  const rounds = Array.from(new Set(roundNumbers))
    .filter((round) => Number.isInteger(round) && round > 0)
    .sort((left, right) => left - right);

  if (rounds.length === 0) return [];

  const cycles = Math.min(Math.max(1, Math.trunc(configuredCycles) || 1), rounds.length);
  const roundsPerCycle = Math.ceil(rounds.length / cycles);

  return Array.from({ length: cycles }, (_, index) => {
    const cycleRounds = rounds.slice(index * roundsPerCycle, (index + 1) * roundsPerCycle);
    if (cycleRounds.length === 0) return null;

    return {
      cycleNumber: index + 1,
      rounds: cycleRounds,
      firstRound: cycleRounds[0],
      lastRound: cycleRounds[cycleRounds.length - 1],
    };
  }).filter((cycle): cycle is RoundCycle => cycle !== null);
}

export function createRoundCycleMap(cycles: RoundCycle[]): Record<number, number> {
  return cycles.reduce<Record<number, number>>((result, cycle) => {
    cycle.rounds.forEach((round) => {
      result[round] = cycle.cycleNumber;
    });
    return result;
  }, {});
}
