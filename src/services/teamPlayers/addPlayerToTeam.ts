import { supabase } from '@/lib/supabaseClient';

type AddPlayerToTeamInput = {
  playerId: number;
  teamId: number;
  eventId?: number | null;
  jerseyNumber?: number | null;
};

export async function addPlayerToTeam({
  playerId,
  teamId,
  eventId = null,
  jerseyNumber = null,
}: AddPlayerToTeamInput): Promise<void> {
  if (eventId != null) {
    const { data: existingEventAssignment, error: existingEventAssignmentError } = await supabase
      .from('team_players')
      .select('id, team_id')
      .eq('event_id', eventId)
      .eq('player_id', playerId)
      .maybeSingle();

    if (existingEventAssignmentError) {
      throw new Error(existingEventAssignmentError.message);
    }

    if (existingEventAssignment) {
      throw new Error(
        existingEventAssignment.team_id === teamId
          ? 'This player is already assigned to the team.'
          : 'This player is already assigned to another team in this event.'
      );
    }
  }

  const insertPayload = {
    player_id: playerId,
    team_id: teamId,
    event_id: eventId,
    jersey_number: jerseyNumber,
    is_active: true,
  };

  const { error } = await supabase
    .from('team_players')
    .insert(insertPayload)
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(
        eventId != null
          ? 'This player is already assigned to a team in this event.'
          : 'This player is already assigned to the team.'
      );
    }

    throw new Error(error.message);
  }
}
