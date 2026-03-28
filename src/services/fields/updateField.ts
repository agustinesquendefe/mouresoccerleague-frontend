import { supabase } from '@/lib/supabaseClient';
import type { Field, FieldFormData } from '@/models/field';

export async function updateField(
  id: number,
  payload: FieldFormData
): Promise<Field> {
  const { data, error } = await supabase
    .from('fields')
    .update({
      name: payload.name,
      key: payload.key,
      field_type: payload.field_type,
      is_active: payload.is_active,
      notes: payload.notes || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const { error: deleteFormatsError } = await supabase
    .from('field_formats')
    .delete()
    .eq('field_id', id);

  if (deleteFormatsError) {
    throw new Error(deleteFormatsError.message);
  }

  if (payload.supported_formats.length > 0) {
    const { error: insertFormatsError } = await supabase.from('field_formats').insert(
      payload.supported_formats.map((format) => ({
        field_id: id,
        format_type: format,
      }))
    );

    if (insertFormatsError) {
      throw new Error(insertFormatsError.message);
    }
  }

  return data as Field;
}