import { supabase } from "@/lib/supabaseClient";

export async function addFieldToEvent(eventId: number, fieldId: number) {
  const { error } = await supabase
    .from("event_fields")
    .insert({
      event_id: eventId,
      field_id: fieldId,
    });

  if (error) throw new Error(error.message);
}