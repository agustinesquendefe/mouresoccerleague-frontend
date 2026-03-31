import { supabase } from '@/lib/supabaseClient';
import type { Event, EventFormatType, EventStatus } from '@/models/event';

type EventBase = Pick<
  Event,
  'id' | 'name' | 'status' | 'format_type' | 'start_date' | 'end_date'
>;

export type ActiveEventSummary = {
  id: number;
  name: string;
  status: EventStatus | null;
  format_type: EventFormatType | string;
  start_date: string;
  end_date: string | null;
  totalMatches: number;
  playedMatches: number;
  pendingMatches: number;
};

function normalizeEventLabel(event: EventBase): string {
  const fallback = `Event #${event.id}`;
  return event.name?.trim() ? event.name : fallback;
}

export async function getActiveEventSummary(): Promise<ActiveEventSummary | null> {
  const baseSelect = 'id, name, status, format_type, start_date, end_date';

  const { data: activeData, error: activeError } = await supabase
    .from('events')
    .select(baseSelect)
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1);

  if (activeError) throw new Error(activeError.message);

  let event = ((activeData ?? [])[0] ?? null) as EventBase | null;

  if (!event) {
    const { data: latestData, error: latestError } = await supabase
      .from('events')
      .select(baseSelect)
      .order('created_at', { ascending: false })
      .limit(1);

    if (latestError) throw new Error(latestError.message);

    event = ((latestData ?? [])[0] ?? null) as EventBase | null;
  }

  if (!event) {
    return null;
  }

  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('status')
    .eq('event_id', event.id);

  if (matchesError) throw new Error(matchesError.message);

  const totalMatches = matches?.length ?? 0;
  const playedMatches =
    matches?.filter((match) => String(match.status ?? '').toLowerCase() === 'played')
      .length ?? 0;

  return {
    id: event.id,
    name: normalizeEventLabel(event),
    status: event.status,
    format_type: event.format_type,
    start_date: event.start_date,
    end_date: event.end_date,
    totalMatches,
    playedMatches,
    pendingMatches: totalMatches - playedMatches,
  };
}
