import { supabase } from '@/lib/supabaseClient';

type AddPlayerToTeamInput = {
  playerId: number;
  teamId: number;
  eventId?: number | null;
  jerseyNumber?: number | null;
};

type PlayerToAdd = {
  playerId: number;
  jerseyNumber?: number | null;
};

type AddPlayersToTeamInput = {
  players: PlayerToAdd[];
  teamId: number;
  eventId?: number | null;
};

export async function addPlayersToTeam({
  players,
  teamId,
  eventId = null,
}: AddPlayersToTeamInput): Promise<void> {
  const uniquePlayers = Array.from(
    new Map(players.map((player) => [player.playerId, player])).values()
  );

  if (uniquePlayers.length === 0) {
    return;
  }

  const playerIds = uniquePlayers.map((player) => player.playerId);
  let existingAssignmentsQuery = supabase
    .from('team_players')
    .select('player_id, team_id')
    .in('player_id', playerIds);

  existingAssignmentsQuery = eventId != null
    ? existingAssignmentsQuery.eq('event_id', eventId)
    : existingAssignmentsQuery.eq('team_id', teamId).is('event_id', null);

  const { data: existingAssignments, error: existingAssignmentsError } =
    await existingAssignmentsQuery;

  if (existingAssignmentsError) {
    throw new Error(existingAssignmentsError.message);
  }

  if ((existingAssignments ?? []).length > 0) {
    const belongsToAnotherTeam = (existingAssignments ?? []).some(
      (assignment) => assignment.team_id !== teamId
    );

    throw new Error(
      belongsToAnotherTeam
        ? 'One or more selected players are already assigned to another team in this event.'
        : 'One or more selected players are already assigned to this team.'
    );
  }

  const insertPayload = uniquePlayers.map((player) => ({
    player_id: player.playerId,
    team_id: teamId,
    event_id: eventId,
    jersey_number: player.jerseyNumber ?? null,
    is_active: true,
  }));

  const { error } = await supabase
    .from('team_players')
    .insert(insertPayload)
    .select('id');

  if (error) {
    if (error.code === '23505') {
      throw new Error(
        eventId != null
          ? 'One or more selected players are already assigned to a team in this event.'
          : 'One or more selected players are already assigned to this team.'
      );
    }

    throw new Error(error.message);
  }
}

export async function addPlayerToTeam({
  playerId,
  teamId,
  eventId = null,
  jerseyNumber = null,
}: AddPlayerToTeamInput): Promise<void> {
  await addPlayersToTeam({
    teamId,
    eventId,
    players: [{ playerId, jerseyNumber }],
  });
}
