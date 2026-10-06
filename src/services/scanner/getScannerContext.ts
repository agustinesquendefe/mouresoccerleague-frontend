import type { SupabaseClient } from '@supabase/supabase-js';
import type { ScannerContextData, ScannerEventOption, ScannerMatchOption } from '@/models/scanner';
import { formatTime12Hour } from '@/utils/formatTime';

function normalizeEventName(id: number, name: string | null) {
  const trimmed = name?.trim();
  return trimmed ? trimmed : `Event #${id}`;
}

function normalizeTeamName(id: number, name: string | null) {
  const trimmed = name?.trim();
  return trimmed ? trimmed : `Team #${id}`;
}

function buildMatchLabel(match: ScannerMatchOption) {
  const matchDate = match.date ? `${match.date}${match.time ? ` ${formatTime12Hour(match.time)}` : ''}` : 'No date';
  return `${match.team1.name} vs ${match.team2.name} · ${matchDate}`;
}

export async function getScannerEventOptions(
  client: SupabaseClient,
  search = '',
  limit = 20
): Promise<ScannerEventOption[]> {
  let query = client
    .from('events')
    .select('id, name, status')
    .order('start_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 50));

  const term = search.trim();
  if (term) query = query.ilike('name', `%${term}%`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data ?? []) as any[]).map((event) => ({
    id: Number(event.id),
    name: normalizeEventName(Number(event.id), event.name ?? null),
    status: event.status ?? null,
  }));
}

export async function getScannerMatchesForEvent(
  client: SupabaseClient,
  eventId: number
): Promise<ScannerMatchOption[]> {
  const { data: matches, error: matchesError } = await client
    .from('matches')
    .select(`
      id,
      event_id,
      status,
      date,
      time,
      team1_id,
      team2_id,
      team1:teams!matches_team1_id_fkey ( name ),
      team2:teams!matches_team2_id_fkey ( name )
    `)
    .eq('event_id', eventId)
    .order('date', { ascending: true })
    .order('time', { ascending: true })
    .order('id', { ascending: true });

  if (matchesError) {
    throw new Error(matchesError.message);
  }

  return ((matches ?? []) as any[]).map((match) => {
    const option = {
      id: Number(match.id),
      eventId: Number(match.event_id),
      label: '',
      status: match.status ?? null,
      date: match.date ?? null,
      time: match.time ?? null,
      team1: {
        id: Number(match.team1_id),
        name: normalizeTeamName(Number(match.team1_id), match.team1?.name ?? null),
      },
      team2: {
        id: Number(match.team2_id),
        name: normalizeTeamName(Number(match.team2_id), match.team2?.name ?? null),
      },
    } satisfies ScannerMatchOption;

    return {
      ...option,
      label: buildMatchLabel(option),
    };
  });
}

export async function getScannerContext(client: SupabaseClient): Promise<ScannerContextData> {
  const { data: activeEvents, error: activeEventError } = await client
    .from('events')
    .select('id, name, status')
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1);

  if (activeEventError) {
    throw new Error(activeEventError.message);
  }

  let activeEvent = activeEvents?.[0] ?? null;

  if (!activeEvent) {
    activeEvent = (await getScannerEventOptions(client, '', 1))[0] ?? null;
  }

  if (!activeEvent) {
    return {
      activeEvent: null,
      events: [],
      matches: [],
    };
  }
  const matchOptions = await getScannerMatchesForEvent(client, Number(activeEvent.id));

  return {
    activeEvent: {
      id: Number(activeEvent.id),
      name: normalizeEventName(Number(activeEvent.id), activeEvent.name ?? null),
      status: activeEvent.status ?? null,
    },
    events: [{
      id: Number(activeEvent.id),
      name: normalizeEventName(Number(activeEvent.id), activeEvent.name ?? null),
      status: activeEvent.status ?? null,
    }],
    matches: matchOptions,
  };
}
