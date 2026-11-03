import { supabase } from '@/lib/supabaseClient';

type EventTeamRow = {
  team_id: number;
  group_id: number | null;
  fixture_start_round: number;
};

type FixtureMatchRow = {
  id: number;
  team1_id: number;
  team2_id: number;
  group_id: number | null;
  status: string | null;
  score1: number | null;
  score2: number | null;
  is_extra: boolean | null;
};

export async function changeRoundRestingTeam(
  eventId: number,
  targetRound: number,
  nextRestingTeamId: number
): Promise<void> {
  if (![eventId, targetRound, nextRestingTeamId].every(Number.isFinite) ||
      !Number.isInteger(targetRound) || targetRound < 1) {
    throw new Error('Invalid resting-team change.');
  }

  const [teamsResult, matchesResult] = await Promise.all([
    supabase
      .from('event_teams')
      .select('team_id, group_id, fixture_start_round')
      .eq('event_id', eventId)
      .eq('status', 'active'),
    supabase
      .from('matches')
      .select('id, team1_id, team2_id, group_id, status, score1, score2, is_extra')
      .eq('event_id', eventId)
      .or('stage_type.eq.league,stage_type.is.null')
      .eq('round_number', targetRound)
      .neq('status', 'cancelled')
      .order('id'),
  ]);
  if (teamsResult.error) throw new Error(teamsResult.error.message);
  if (matchesResult.error) throw new Error(matchesResult.error.message);

  const teams = (teamsResult.data ?? []) as EventTeamRow[];
  const matches = (matchesResult.data ?? []) as FixtureMatchRow[];
  if (matches.some((match) =>
    match.is_extra ||
    match.status !== 'scheduled' ||
    match.score1 != null ||
    match.score2 != null)) {
    throw new Error('The resting team cannot be changed after the round starts or when it has extra matches.');
  }

  const selectedTeam = teams.find((team) =>
    team.team_id === nextRestingTeamId && team.fixture_start_round <= targetRound);
  if (!selectedTeam) throw new Error('The selected team is not eligible for this round.');
  const usesGroups = matches.some((match) => match.group_id != null);
  const selectedGroupId = usesGroups ? selectedTeam.group_id : null;

  const selectedMatch = matches.find((match) =>
    match.group_id === selectedGroupId &&
    (match.team1_id === nextRestingTeamId || match.team2_id === nextRestingTeamId));
  if (!selectedMatch) return;

  const playingTeamIds = new Set(matches
    .filter((match) => match.group_id === selectedGroupId && !match.is_extra)
    .flatMap((match) => [match.team1_id, match.team2_id]));
  const currentRestingTeam = teams.find((team) =>
    (!usesGroups || team.group_id === selectedGroupId) &&
    team.fixture_start_round <= targetRound &&
    !playingTeamIds.has(team.team_id));
  if (!currentRestingTeam) {
    throw new Error('No currently resting team is available to take this match.');
  }

  const replacingTeam1 = selectedMatch.team1_id === nextRestingTeamId;
  const { data, error } = await supabase
    .from('matches')
    .update(replacingTeam1
      ? { team1_id: currentRestingTeam.team_id }
      : { team2_id: currentRestingTeam.team_id })
    .eq('id', selectedMatch.id)
    .eq('event_id', eventId)
    .eq('status', 'scheduled')
    .eq(replacingTeam1 ? 'team1_id' : 'team2_id', nextRestingTeamId)
    .select('id');
  if (error) throw new Error(error.message);
  if ((data?.length ?? 0) !== 1) {
    throw new Error('The fixture changed while the resting team was being updated. Reload it and try again.');
  }
}
