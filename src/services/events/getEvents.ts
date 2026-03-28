import { supabase } from '@/lib/supabaseClient';
import type { Event } from '@/models/event';

export async function getEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []) as Event[];
}