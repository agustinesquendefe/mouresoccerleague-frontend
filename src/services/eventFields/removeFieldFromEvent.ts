import { supabase } from '@/lib/supabaseClient';

export async function removeFieldFromEvent(eventId: number, fieldId: number) {
  const { error } = await supabase
    .from('event_fields')
    .delete()
    .eq('event_id', eventId)
    .eq('field_id', fieldId);

  if (error) throw new Error(error.message);
}