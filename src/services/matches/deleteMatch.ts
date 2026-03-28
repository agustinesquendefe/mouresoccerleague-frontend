import { supabase } from '@/lib/supabaseClient';

export async function deleteMatch(id: number): Promise<void> {
  const { error } = await supabase.from('matches').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}