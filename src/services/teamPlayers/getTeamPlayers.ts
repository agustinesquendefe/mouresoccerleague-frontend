import { supabase } from '@/lib/supabaseClient';

export type TeamPlayerRow = {
  id: number;
  player_id: number;
  team_id: number;
  event_id: number | null;
  jersey_number: number | null;
  is_active: boolean;
  created_at: string;
  player_name: string | null;
  player_key: string | null;
  player_email: string | null;
  player_phone: string | null;
};

export async function getTeamPlayers(teamId: number): Promise<TeamPlayerRow[]> {
  const { data: teamPlayers, error } = await supabase
    .from('team_players')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = teamPlayers ?? [];

  if (rows.length === 0) {
    return [];
  }

  const playerIds = Array.from(new Set(rows.map((row) => row.player_id)));

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, full_name, key, email, phone')
    .in('id', playerIds);

  if (playersError) {
    throw new Error(playersError.message);
  }

  const playerMap = new Map(
    (players ?? []).map((player) => [player.id, player])
  );

  return rows.map((row) => {
    const player = playerMap.get(row.player_id);

    return {
      ...row,
      player_name: player?.full_name ?? null,
      player_key: player?.key ?? null,
      player_email: player?.email ?? null,
      player_phone: player?.phone ?? null,
    };
  }) as TeamPlayerRow[];
}