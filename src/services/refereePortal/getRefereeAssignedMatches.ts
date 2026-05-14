import type { SupabaseClient } from '@supabase/supabase-js';
import type { ScannerContextData, ScannerEventOption, ScannerMatchOption } from '@/models/scanner';

export type RefereeAssignedMatch = {
  id: number;
  eventId: number;
  eventName: string;
  label: string;
  role: string | null;
  status: string | null;
  date: string | null;
  time: string | null;
  fieldName: string | null;
  team1: {
    id: number;
    name: string;
  };
  team2: {
    id: number;
    name: string;
  };
};

function normalizeName(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function buildMatchLabel(match: Pick<RefereeAssignedMatch, 'date' | 'time' | 'team1' | 'team2'>) {
  const matchDate = match.date ? `${match.date}${match.time ? ` ${match.time}` : ''}` : 'No date';
  return `${match.team1.name} vs ${match.team2.name} · ${matchDate}`;
}

function mapAssignedMatch(row: any): RefereeAssignedMatch {
  const match = Array.isArray(row.matches) ? row.matches[0] ?? null : row.matches ?? null;
  const event = Array.isArray(match?.events) ? match.events[0] ?? null : match?.events ?? null;
  const field = Array.isArray(match?.fields) ? match.fields[0] ?? null : match?.fields ?? null;
  const team1 = Array.isArray(match?.team1) ? match.team1[0] ?? null : match?.team1 ?? null;
  const team2 = Array.isArray(match?.team2) ? match.team2[0] ?? null : match?.team2 ?? null;

  const mapped = {
    id: Number(match.id),
    eventId: Number(match.event_id),
    eventName: normalizeName(event?.name, `Event #${match.event_id}`),
    label: '',
    role: row.role ?? null,
    status: match.status ?? null,
    date: match.date ?? null,
    time: match.time ?? null,
    fieldName: field?.name ?? null,
    team1: {
      id: Number(match.team1_id),
      name: normalizeName(team1?.name, `Team #${match.team1_id}`),
    },
    team2: {
      id: Number(match.team2_id),
      name: normalizeName(team2?.name, `Team #${match.team2_id}`),
    },
  } satisfies RefereeAssignedMatch;

  return {
    ...mapped,
    label: buildMatchLabel(mapped),
  };
}

export async function getRefereeAssignedMatches(
  client: SupabaseClient,
  refereeId: number | null
): Promise<RefereeAssignedMatch[]> {
  let query = client
    .from('match_referees')
    .select(`
      role,
      matches (
        id,
        event_id,
        team1_id,
        team2_id,
        date,
        time,
        status,
        events (
          id,
          name,
          status
        ),
        fields (
          id,
          name
        ),
        team1:teams!matches_team1_id_fkey (
          id,
          name
        ),
        team2:teams!matches_team2_id_fkey (
          id,
          name
        )
      )
    `);

  if (refereeId) {
    query = query.eq('referee_id', refereeId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as any[])
    .filter((row) => row.matches)
    .map(mapAssignedMatch)
    .sort((left, right) => {
      const byDate = (left.date ?? '').localeCompare(right.date ?? '');
      if (byDate !== 0) return byDate;
      const byTime = (left.time ?? '').localeCompare(right.time ?? '');
      if (byTime !== 0) return byTime;
      return left.id - right.id;
    });
}

export function buildRefereeScannerContext(matches: RefereeAssignedMatch[]): ScannerContextData {
  const eventMap = new Map<number, ScannerEventOption>();

  matches.forEach((match) => {
    if (!eventMap.has(match.eventId)) {
      eventMap.set(match.eventId, {
        id: match.eventId,
        name: match.eventName,
        status: null,
      });
    }
  });

  const events = Array.from(eventMap.values());
  const activeEvent = events[0] ?? null;

  const scannerMatches = matches.map((match) => ({
    id: match.id,
    eventId: match.eventId,
    label: match.label,
    status: match.status,
    date: match.date,
    time: match.time,
    team1: match.team1,
    team2: match.team2,
  })) satisfies ScannerMatchOption[];

  return {
    activeEvent,
    events,
    matches: activeEvent
      ? scannerMatches.filter((match) => match.eventId === activeEvent.id)
      : [],
  };
}
