import { supabase } from '@/lib/supabaseClient';

export async function deleteEvent(id: number): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);

  if (error) throw new Error(error.message);
}