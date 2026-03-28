import { supabase } from '@/lib/supabaseClient';
import type { Event, EventFormData } from '@/models/event';

export async function updateEvent(
  id: number,
  payload: EventFormData
): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .update({
      key: payload.key,
      name: payload.name,
      league_id: payload.league_id,
      season_id: payload.season_id,
      start_date: payload.start_date,
      end_date: payload.end_date || null,
      auto: payload.auto,
      status: payload.status,
      format_type: payload.format_type,
      round_robin_cycles: payload.round_robin_cycles,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data as Event;
}