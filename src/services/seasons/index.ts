import { supabase } from '@/lib/supabaseClient';
import type { Season, SeasonFormData } from '@/models/season';

export async function getSeasons(): Promise<Season[]> {
  const { data, error } = await supabase
    .from('seasons')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Season[];
}

export async function createSeason(payload: SeasonFormData): Promise<Season> {
  // Generate key if not provided
  const key = payload.key || payload.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50);
  const { data, error } = await supabase
    .from('seasons')
    .insert([{ name: payload.name, key }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Season;
}

export async function updateSeason(id: number, payload: SeasonFormData): Promise<Season> {
  const { data, error } = await supabase
    .from('seasons')
    .update({ name: payload.name })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Season;
}

export async function deleteSeason(id: number): Promise<void> {
  const { error } = await supabase.from('seasons').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
