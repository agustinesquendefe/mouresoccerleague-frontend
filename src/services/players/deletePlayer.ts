import { supabase } from '@/lib/supabaseClient';

export async function deletePlayer(id: number): Promise<void> {
  const { error } = await supabase.from('players').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}