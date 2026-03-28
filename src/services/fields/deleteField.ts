import { supabase } from '@/lib/supabaseClient';

export async function deleteField(id: number): Promise<void> {
  const { error } = await supabase.from('fields').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}