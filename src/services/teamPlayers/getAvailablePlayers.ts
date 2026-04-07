import { supabase } from '@/lib/supabaseClient';
import type { Player } from '@/models/player';

export async function getAvailablePlayers(teamId: number): Promise<Player[]> {
  const [{ data: players, error: playersError }, { data: teamPlayers, error: teamPlayersError }] =
    await Promise.all([
      supabase
        .from('players')
        .select('*')
        .eq('is_active', true)
        .order('last_name', { ascending: true })
        .order('first_name', { ascending: true }),
      supabase
        .from('team_players')
        .select('player_id')
        .eq('team_id', teamId),
    ]);

  if (playersError) {
    throw new Error(playersError.message);
  }

  if (teamPlayersError) {
    throw new Error(teamPlayersError.message);
  }

  const assignedPlayerIds = new Set(
    (teamPlayers ?? []).map((row) => row.player_id)
  );

  return ((players ?? []) as Player[]).filter(
    (player) => !assignedPlayerIds.has(player.id)
  );
}