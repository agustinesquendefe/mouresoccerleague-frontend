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
  const { error } = await supabase.from('team_players').insert({
    player_id: playerId,
    team_id: teamId,
    event_id: eventId,
    jersey_number: jerseyNumber,
    is_active: true,
  });

  if (error) {
    if (error.code === '23505') {
      throw new Error('This player is already assigned to the team.');
    }

    throw new Error(error.message);
  }
}