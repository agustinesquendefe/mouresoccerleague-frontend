import { supabase } from '@/lib/supabaseClient';
import type { Player } from '@/models/player';

export async function getPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Player[];
}