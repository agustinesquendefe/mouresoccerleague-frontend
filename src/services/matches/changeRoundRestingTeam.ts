import { supabase } from '@/lib/supabaseClient';

type EventTeamRow = {
  team_id: number;
};

type FixtureMatchRow = {
  id: number;
  team1_id: number;
  team2_id: number;
  group_id: number | null;
  round_number: number | null;
  status: string | null;
  date: string | null;
  is_extra: boolean | null;
};

export async function changeRoundRestingTeam(
  eventId: number,
  targetRound: number,
  restingTeamId: number
): Promise<void> {
  if (![eventId, targetRound, restingTeamId].every(Number.isFinite) ||
      !Number.isInteger(targetRound) || targetRound < 1) {
    throw new Error('Invalid resting-team change.');
  }

  const [teamsResult, matchesResult] = await Promise.all([
    supabase
      .from('event_teams')
      .select('team_id')
      .eq('event_id', eventId)
      .eq('status', 'active'),
    supabase
      .from('matches')
      .select('id, team1_id, team2_id, group_id, round_number, status, date, is_extra')
      .eq('event_id', eventId)
      .eq('stage_type', 'league')
      .order('round_number')
      .order('id'),
  ]);

  if (teamsResult.error) throw new Error(teamsResult.error.message);
  if (matchesResult.error) throw new Error(matchesResult.error.message);

  const teams = (teamsResult.data ?? []) as EventTeamRow[];
  const selectedTeam = teams.find((team) => team.team_id === restingTeamId);
  if (!selectedTeam) throw new Error('The selected team is not active in this event.');

  const scopeTeamIds = new Set(teams.map((team) => team.team_id));
  const matches = (matchesResult.data ?? []) as FixtureMatchRow[];
  const roundsWithExtraMatches = new Set(matches
    .filter((match) => match.is_extra)
    .map((match) => Number(match.round_number)));
  const scopedMatches = matches.filter((match) =>
    !match.is_extra &&
    match.status !== 'cancelled');
  const matchesByRound = new Map<number, FixtureMatchRow[]>();
  scopedMatches.forEach((match) => {
    const roundNumber = Number(match.round_number);
    if (!Number.isInteger(roundNumber) || roundNumber < 1) return;
    const roundMatches = matchesByRound.get(roundNumber) ?? [];
    roundMatches.push(match);
    matchesByRound.set(roundNumber, roundMatches);
  });

  const targetMatches = matchesByRound.get(targetRound) ?? [];
  if (targetMatches.every((match) =>
    match.team1_id !== restingTeamId && match.team2_id !== restingTeamId)) {
    return;
  }
  if (targetMatches.some((match) => match.status !== 'scheduled')) {
    throw new Error('The resting team cannot be changed in a round that has started.');
  }
  if (roundsWithExtraMatches.has(targetRound)) {
    throw new Error('The resting team cannot be changed in a round with extra matches.');
  }

  const sourceEntry = Array.from(matchesByRound.entries())
    .filter(([roundNumber]) => roundNumber !== targetRound)
    .filter(([roundNumber]) => !roundsWithExtraMatches.has(roundNumber))
    .filter(([, roundMatches]) => roundMatches.length > 0)
    .filter(([, roundMatches]) => roundMatches.every((match) => match.status === 'scheduled'))
    .find(([, roundMatches]) => roundMatches.every((match) =>
      match.team1_id !== restingTeamId && match.team2_id !== restingTeamId));
  if (!sourceEntry) {
    throw new Error('No editable round was found where the selected team is resting.');
  }

  const [sourceRound, sourceMatches] = sourceEntry;
  const participants = (roundMatches: FixtureMatchRow[]) => new Set(roundMatches.flatMap((match) =>
    [match.team1_id, match.team2_id].filter((teamId) => scopeTeamIds.has(teamId))));
  if (participants(targetMatches).size !== participants(sourceMatches).size) {
    throw new Error('These rounds cannot be exchanged because they have different fixture capacity.');
  }

  const targetDate = targetMatches.find((match) => match.date)?.date ?? null;
  const sourceDate = sourceMatches.find((match) => match.date)?.date ?? null;
  const results = await Promise.all([
    ...targetMatches.map((match) => supabase
      .from('matches')
      .update({ round_number: sourceRound, date: sourceDate ?? match.date })
      .eq('id', match.id)
      .eq('status', 'scheduled')
      .select('id')),
    ...sourceMatches.map((match) => supabase
      .from('matches')
      .update({ round_number: targetRound, date: targetDate ?? match.date })
      .eq('id', match.id)
      .eq('status', 'scheduled')
      .select('id')),
  ]);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(failed.error.message);
  if (results.some((result) => (result.data?.length ?? 0) !== 1)) {
    throw new Error('The fixture changed while the resting team was being updated. Reload it and try again.');
  }
}
