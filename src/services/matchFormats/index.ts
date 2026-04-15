import { supabase } from '@/lib/supabaseClient';
import type { MatchFormatRecord, MatchFormatFormData } from '@/models/matchFormat';


export async function getMatchFormats(): Promise<MatchFormatRecord[]> {
  const { data, error } = await supabase
    .from('match_formats')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as MatchFormatRecord[];
}


export async function createMatchFormat(payload: MatchFormatFormData): Promise<MatchFormatRecord> {
  const { data, error } = await supabase
    .from('match_formats')
    .insert([
      {
        key: payload.key,
        name: payload.name,
        points_win: payload.points_win,
        points_draw: payload.points_draw,
        points_loss: payload.points_loss,
      },
    ])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as MatchFormatRecord;
}


export async function updateMatchFormat(id: number, payload: MatchFormatFormData): Promise<MatchFormatRecord> {
  const { data, error } = await supabase
    .from('match_formats')
    .update({
      key: payload.key,
      name: payload.name,
      points_win: payload.points_win,
      points_draw: payload.points_draw,
      points_loss: payload.points_loss,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as MatchFormatRecord;
}

export async function deleteMatchFormat(id: number): Promise<void> {
  const { error } = await supabase.from('match_formats').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
