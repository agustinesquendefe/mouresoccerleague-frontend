import { supabase } from '@/lib/supabaseClient';

export async function getPlayerCategories(playerId: number): Promise<number[]> {
  const { data, error } = await supabase
    .from('player_categories')
    .select('category_id')
    .eq('player_id', playerId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => r.category_id as number);
}

export async function setPlayerCategories(playerId: number, categoryIds: number[]): Promise<void> {
  const { error: delError } = await supabase
    .from('player_categories')
    .delete()
    .eq('player_id', playerId);
  if (delError) throw new Error(delError.message);

  if (categoryIds.length === 0) return;

  const rows = categoryIds.map((category_id) => ({ player_id: playerId, category_id }));
  const { error: insError } = await supabase.from('player_categories').insert(rows);
  if (insError) throw new Error(insError.message);
}
