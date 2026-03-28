import { supabase } from '@/lib/supabaseClient';

export async function deleteTeam(id: number): Promise<void> {
  const { error } = await supabase.from('teams').delete().eq('id', id);
  if (error) throw new Error(error.message);
}