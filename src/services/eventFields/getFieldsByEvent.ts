import { supabase } from '@/lib/supabaseClient';
import type { Field } from '@/models/field';

type EventFieldRow = {
  field_id: number;
  fields: Field | Field[] | null;
};

export async function getFieldsByEvent(eventId: number): Promise<Field[]> {
  const { data, error } = await supabase
    .from('event_fields')
    .select(`
      field_id,
      fields (*)
    `)
    .eq('event_id', eventId);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as EventFieldRow[];

  return rows
    .map((item) => (Array.isArray(item.fields) ? item.fields[0] ?? null : item.fields ?? null))
    .filter((field): field is Field => field !== null);
}