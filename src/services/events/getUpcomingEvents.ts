import { supabase } from '@/lib/supabaseClient';
import type { Event } from '@/models/event';

export async function getUpcomingEvents(limit = 3): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('status', 'active')
    .order('start_date', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as Event[];
}
