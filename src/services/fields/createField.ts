import { supabase } from '@/lib/supabaseClient';
import type { Field, FieldFormData } from '@/models/field';

export async function createField(payload: FieldFormData): Promise<Field> {
  const { data, error } = await supabase
    .from('fields')
    .insert([
      {
        name: payload.name,
        key: payload.key,
        field_type: payload.field_type,
        is_active: payload.is_active,
        notes: payload.notes || null,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const createdField = data as Field;

  if (payload.supported_formats.length > 0) {
    const { error: formatError } = await supabase.from('field_formats').insert(
      payload.supported_formats.map((format) => ({
        field_id: createdField.id,
        format_type: format,
      }))
    );

    if (formatError) {
      throw new Error(formatError.message);
    }
  }

  return createdField;
}