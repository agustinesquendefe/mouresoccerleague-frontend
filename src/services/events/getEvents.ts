import { supabase } from '@/lib/supabaseClient';
import type { Event } from '@/models/event';

export async function getEvents(): Promise<(Event & { season_name: string | null; category_name: string | null })[]> {
  const [
    { data: events, error: eventsError },
    { data: seasons, error: seasonsError },
    { data: categories, error: categoriesError },
  ] = await Promise.all([
    supabase.from('events').select('*').order('id', { ascending: true }),
    supabase.from('seasons').select('id, name'),
    supabase.from('categories').select('id, name'),
  ]);

  if (eventsError) throw new Error(eventsError.message);
  if (seasonsError) throw new Error(seasonsError.message);
  if (categoriesError) throw new Error(categoriesError.message);

  const seasonMap = new Map((seasons ?? []).map((s: any) => [s.id, s.name]));
  const categoryMap = new Map((categories ?? []).map((c: any) => [c.id, c.name]));

  return ((events ?? []) as Event[]).map((event) => ({
    ...event,
    season_name: seasonMap.get(event.season_id) ?? null,
    category_name: event.category_id ? (categoryMap.get(event.category_id) ?? null) : null,
  }));
}