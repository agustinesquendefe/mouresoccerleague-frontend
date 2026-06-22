import { supabase } from '@/lib/supabaseClient';
import type { Player } from '@/models/player';

export async function getAvailablePlayers(
  teamId: number,
  search = '',
  eventId?: number | null
): Promise<Player[]> {
  const trimmedSearch = search.trim();
  let playersQuery = supabase
    .from('players')
    .select('*')
    .eq('is_active', true)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })
    .limit(50);

  if (trimmedSearch) {
    playersQuery = playersQuery.or(
      `document_id.ilike.%${trimmedSearch}%,first_name.ilike.%${trimmedSearch}%,last_name.ilike.%${trimmedSearch}%,full_name.ilike.%${trimmedSearch}%,email.ilike.%${trimmedSearch}%`
    );
  }

  let assignedQuery = supabase
    .from('team_players')
    .select('player_id')
    .eq('team_id', teamId);

  assignedQuery = eventId != null
    ? assignedQuery.eq('event_id', eventId)
    : assignedQuery.is('event_id', null);

  const [{ data: players, error: playersError }, { data: teamPlayers, error: teamPlayersError }] =
    await Promise.all([
      playersQuery,
      assignedQuery,
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
