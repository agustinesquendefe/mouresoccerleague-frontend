import { supabase } from '@/lib/supabaseClient';
import type { FormatType, FormatTypeFormData } from '@/models/formatType';

export async function getFormatTypes(): Promise<FormatType[]> {
  const { data, error } = await supabase
    .from('format_types')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as FormatType[];
}

export async function createFormatType(payload: FormatTypeFormData): Promise<FormatType> {
  const { data, error } = await supabase
    .from('format_types')
    .insert([{ key: payload.key, name: payload.name }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FormatType;
}

export async function updateFormatType(id: number, payload: FormatTypeFormData): Promise<FormatType> {
  const { data, error } = await supabase
    .from('format_types')
    .update({ key: payload.key, name: payload.name })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FormatType;
}

export async function deleteFormatType(id: number): Promise<void> {
  const { error } = await supabase.from('format_types').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
