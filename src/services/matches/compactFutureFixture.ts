import { supabase } from '@/lib/supabaseClient';
import {
  formatDate,
  getOpenRoundNumbers,
  reassignPairsToEarlierRounds,
  type ExistingFixtureMatch,
} from './incrementalFixture';

type CompactionMatch = ExistingFixtureMatch & {
  id: number;
  group_id: number | null;
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
  date: string | null;
};

export type FixtureCompactionPreview = {
  matchesToMove: number;
  roundsBefore: number;
  roundsAfter: number;
  roundsRemoved: number;
  firstDestinationRound: number | null;
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

function findLateTeamIds(matches: CompactionMatch[]): Set<number> {
  const appearances = new Map<number, number>();
  matches.forEach((match) => {
    appearances.set(match.team1_id, (appearances.get(match.team1_id) ?? 0) + 1);
    appearances.set(match.team2_id, (appearances.get(match.team2_id) ?? 0) + 1);
  });
  const highestAppearanceCount = Math.max(0, ...appearances.values());
  if (highestAppearanceCount < 2) return new Set();
  return new Set(
    Array.from(appearances.entries())
      .filter(([, count]) => count === highestAppearanceCount)
      .map(([teamId]) => teamId)
  );
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
      .select('id, team1_id, team2_id, group_id, round_number, status, date, is_extra, pos')
      .eq('event_id', eventId)
      .eq('stage_type', 'league')
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
  if (expectedRoundCount === 0) throw new Error('There are not enough active teams to compact this fixture.');

  const today = formatDate(new Date());
  const openRoundNumbers = getOpenRoundNumbers(matches, today);
  const openRoundSet = new Set(openRoundNumbers);
  const movableMatches = matches.filter((match) => {
    const roundNumber = Number(match.round_number);
    return !match.is_extra &&
      match.status === 'scheduled' &&
      roundNumber > expectedRoundCount &&
      openRoundSet.has(roundNumber);
  });
  const movableIds = new Set(movableMatches.map((match) => match.id));
  const retainedMatches = matches.filter((match) => !movableIds.has(match.id));
  const assignments = reassignPairsToEarlierRounds(
    movableMatches,
    retainedMatches,
    openRoundNumbers,
    findLateTeamIds(movableMatches)
  );

  const dateByRound = new Map<number, string>();
  matches.forEach((match) => {
    const roundNumber = Number(match.round_number);
    if (roundNumber > 0 && match.date && !dateByRound.has(roundNumber)) {
      dateByRound.set(roundNumber, match.date);
    }
  });
  const updates = assignments.flatMap(({ pair, roundNumber }) => {
    const fromRound = Number(pair.round_number);
    if (fromRound === roundNumber) return [];
    return [{
      id: pair.id,
      fromRound,
      toRound: roundNumber,
      date: dateByRound.get(roundNumber) ?? pair.date ?? null,
    }];
  });

  const roundsBefore = Math.max(0, ...matches.map((match) => Number(match.round_number) || 0));
  const assignedRoundById = new Map(assignments.map(({ pair, roundNumber }) => [pair.id, roundNumber]));
  const roundsAfter = Math.max(0, ...matches.map((match) =>
    assignedRoundById.get(match.id) ?? (Number(match.round_number) || 0)));

  return {
    updates,
    matchesToMove: updates.length,
    roundsBefore,
    roundsAfter,
    roundsRemoved: Math.max(0, roundsBefore - roundsAfter),
    firstDestinationRound: updates.length > 0
      ? Math.min(...updates.map((update) => update.toRound))
      : null,
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

  const results = await Promise.all(plan.updates.map((update) =>
    supabase
      .from('matches')
      .update({ round_number: update.toRound, date: update.date })
      .eq('id', update.id)
      .eq('status', 'scheduled')
      .eq('round_number', update.fromRound)
  ));
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);

  const { updates: _updates, ...preview } = plan;
  return preview;
}
