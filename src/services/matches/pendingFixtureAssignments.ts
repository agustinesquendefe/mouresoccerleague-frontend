import { supabase } from '@/lib/supabaseClient';

export type PendingFixtureAssignment = {
  id: number;
  event_id: number;
  event_team_id: number;
  team_id: number;
  group_id: number | null;
  round_number: number;
  status: 'pending' | 'resolved' | 'cancelled';
};

type RoundMatch = {
  id: number;
  team1_id: number;
  team2_id: number;
  group_id: number | null;
  date: string | null;
  time: string | null;
  field_id: number | null;
  field_number: number | null;
  status: string | null;
  is_extra: boolean | null;
};

export async function getPendingFixtureAssignments(eventId: number): Promise<PendingFixtureAssignment[]> {
  const { data, error } = await supabase
    .from('fixture_pending_assignments')
    .select('id, event_id, event_team_id, team_id, group_id, round_number, status')
    .eq('event_id', eventId)
    .eq('status', 'pending')
    .order('round_number')
    .order('id');
  if (error) throw new Error(error.message);
  return (data ?? []) as PendingFixtureAssignment[];
}

export type PendingResolutionPreview = {
  pendingIds: number[];
  pendingTeamNames: string[];
  requiresOpponent: boolean;
  opponentCandidates: Array<{ id: number; name: string }>;
  existingRestingTeamNames: string[];
};

async function loadRoundContext(eventId: number, roundNumber: number, groupId: number | null) {
  let pendingQuery = supabase
      .from('fixture_pending_assignments')
      .select('id, event_id, event_team_id, team_id, group_id, round_number, status')
      .eq('event_id', eventId)
      .eq('round_number', roundNumber)
      .eq('status', 'pending');
  let teamsQuery = supabase
      .from('event_teams')
      .select('team_id, group_id, fixture_start_round, display_name, teams(name)')
      .eq('event_id', eventId)
      .eq('status', 'active');
  let matchesQuery = supabase
      .from('matches')
      .select('id, team1_id, team2_id, group_id, date, time, field_id, field_number, status, is_extra')
      .eq('event_id', eventId)
      .or('stage_type.eq.league,stage_type.is.null')
      .eq('round_number', roundNumber)
      .neq('status', 'cancelled');
  if (groupId == null) {
    pendingQuery = pendingQuery.is('group_id', null);
    matchesQuery = matchesQuery.is('group_id', null);
  } else {
    pendingQuery = pendingQuery.eq('group_id', groupId);
    teamsQuery = teamsQuery.eq('group_id', groupId);
    matchesQuery = matchesQuery.eq('group_id', groupId);
  }
  const [pendingResult, teamsResult, matchesResult] = await Promise.all([
    pendingQuery.order('id'),
    teamsQuery,
    matchesQuery.order('pos').order('id'),
  ]);
  if (pendingResult.error) throw new Error(pendingResult.error.message);
  if (teamsResult.error) throw new Error(teamsResult.error.message);
  if (matchesResult.error) throw new Error(matchesResult.error.message);
  return {
    pending: (pendingResult.data ?? []) as PendingFixtureAssignment[],
    teams: (teamsResult.data ?? []) as any[],
    matches: (matchesResult.data ?? []) as RoundMatch[],
  };
}

export async function previewPendingResolution(
  eventId: number,
  roundNumber: number,
  groupId: number | null
): Promise<PendingResolutionPreview> {
  const { pending, teams, matches } = await loadRoundContext(eventId, roundNumber, groupId);
  if (pending.length === 0) throw new Error('This round has no pending teams.');

  const pendingIds = new Set(pending.map((item) => item.team_id));
  const eligibleTeams = teams.filter((team) =>
    Number(team.fixture_start_round ?? 1) <= roundNumber && !pendingIds.has(team.team_id));
  const playingIds = new Set(matches
    .filter((match) => !match.is_extra)
    .flatMap((match) => [match.team1_id, match.team2_id]));
  const restingTeams = eligibleTeams.filter((team) => !playingIds.has(team.team_id));
  const requiresOpponent = pending.length % 2 === 1;
  const nameOf = (team: any) => {
    const relation = Array.isArray(team.teams) ? team.teams[0] : team.teams;
    return team.display_name?.trim() || relation?.name || `#${team.team_id}`;
  };
  const namesById = new Map(teams.map((team) => [team.team_id, nameOf(team)]));

  return {
    pendingIds: pending.map((item) => item.id),
    pendingTeamNames: pending.map((item) => namesById.get(item.team_id) ?? `#${item.team_id}`),
    requiresOpponent,
    opponentCandidates: requiresOpponent
      ? eligibleTeams.map((team) => ({ id: team.team_id, name: nameOf(team) }))
      : [],
    existingRestingTeamNames: restingTeams.map(nameOf),
  };
}

export async function resolvePendingAssignments(
  eventId: number,
  roundNumber: number,
  groupId: number | null,
  opponentTeamId?: number
): Promise<void> {
  const { pending, teams, matches } = await loadRoundContext(eventId, roundNumber, groupId);
  if (pending.length === 0) throw new Error('This round has no pending teams.');
  if (matches.some((match) => match.status !== 'scheduled')) {
    throw new Error('This round has already started.');
  }

  const pendingQueue = [...pending];
  const inserts: Array<Record<string, unknown>> = [];
  const updates: Array<{ match_id: number; from_team_id: number; to_team_id: number }> = [];
  const scheduledMatches = matches.filter((match) => !match.is_extra);
  const pendingTeamIds = new Set(pending.map((item) => item.team_id));
  const eligibleTeams = teams.filter((team) =>
    Number(team.fixture_start_round ?? 1) <= roundNumber && !pendingTeamIds.has(team.team_id));
  const playingIds = new Set(scheduledMatches.flatMap((match) => [match.team1_id, match.team2_id]));
  const existingResting = eligibleTeams.filter((team) => !playingIds.has(team.team_id));
  const baseSlot = scheduledMatches[0];

  const addMatch = (team1Id: number, team2Id: number, groupId: number | null) => {
    inserts.push({
      team1_id: team1Id,
      team2_id: team2Id,
      group_id: groupId,
      match_date: baseSlot?.date ?? null,
      match_time: null,
      field_id: null,
      field_number: null,
    });
  };

  while (pendingQueue.length >= 2) {
    const first = pendingQueue.shift()!;
    const second = pendingQueue.shift()!;
    if (first.group_id !== second.group_id) {
      throw new Error('Pending teams from different groups must be resolved separately.');
    }
    addMatch(first.team_id, second.team_id, first.group_id);
  }

  const remaining = pendingQueue.shift();
  if (remaining) {
    if (!opponentTeamId) throw new Error('Choose an opponent for the pending team.');
    const selectedMatch = scheduledMatches.find((match) =>
      match.group_id === remaining.group_id &&
      (match.team1_id === opponentTeamId || match.team2_id === opponentTeamId));
    if (!selectedMatch) {
      const availableOpponent = existingResting.find((team) => team.team_id === opponentTeamId);
      if (!availableOpponent) throw new Error('The selected opponent is not available in this round.');
      addMatch(remaining.team_id, opponentTeamId, remaining.group_id);
    } else {
      const formerOpponentId = selectedMatch.team1_id === opponentTeamId
        ? selectedMatch.team2_id
        : selectedMatch.team1_id;
      updates.push({
        match_id: selectedMatch.id,
        from_team_id: formerOpponentId,
        to_team_id: remaining.team_id,
      });
      const alreadyRestingTeam = existingResting.find((team) =>
        (remaining.group_id == null || team.group_id === remaining.group_id) &&
        team.team_id !== opponentTeamId);
      if (alreadyRestingTeam) {
        addMatch(formerOpponentId, alreadyRestingTeam.team_id, remaining.group_id);
      }
    }
  }

  const { error } = await supabase.rpc('resolve_fixture_pending_assignments', {
    p_event_id: eventId,
    p_round_number: roundNumber,
    p_pending_ids: pending.map((item) => item.id),
    p_match_updates: updates,
    p_matches: inserts,
  });
  if (error) throw new Error(error.message);
}
