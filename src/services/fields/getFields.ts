import { supabase } from '@/lib/supabaseClient';
import type { Field } from '@/models/field';

export async function getFields(): Promise<Field[]> {
  const { data, error } = await supabase
    .from('fields')
    .select(`
      *,
      field_formats (
        id,
        field_id,
        format_type
      )
    `)
    .order('id', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Field[];
}