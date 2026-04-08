import { supabase } from "@/lib/supabaseClient";
import type { Event } from '@/models/event';

export type UpcomingMatchRow = {
  id: number;
  event_id: number | null;
  date: string | null;
  round_number: number | null;
  status: string | null;
  stage_type: string | null;
  bracket_round: string | null;
  team1_name: string;
  team1_logo: string | null;
  team2_name: string;
  team2_logo: string | null;
  field_name: string | null;
};

export type UpcomingMatchesWithEvent = {
  event: Event;
  matches: UpcomingMatchRow[];
};

type UpcomingMatchQueryRow = {
  id: number;
  date: string | null;
  round_number: number | null;
  status: string | null;
  stage_type: string | null;
  bracket_round: string | null;
  team1_id: number | null;
  team2_id: number | null;
  field_id: number | null;
  event_id: number | null;
};

type TeamNameRow = {
  id: number;
  name: string;
  logo_url: string | null;
};

type FieldNameRow = {
  id: number;
  name: string;
};


export async function getUpcomingMatches(eventIdOrLimit?: number, eventId?: number): Promise<UpcomingMatchRow[]> {
  const today = new Date().toISOString().slice(0, 10);

  // If only one arg is passed, treat it as eventId (no limit)
  const resolvedEventId = eventId ?? (eventIdOrLimit !== undefined && !eventId ? eventIdOrLimit : undefined);
  const resolvedLimit = eventId !== undefined ? eventIdOrLimit : undefined;

  let query = supabase
    .from('matches')
    .select(`
      id,
      date,
      round_number,
      status,
      stage_type,
      bracket_round,
      team1_id,
      team2_id,
      field_id,
      event_id
    `)
    .eq('status', 'scheduled')
    .gte('date', today);

  if (resolvedEventId) {
    query = query.eq('event_id', resolvedEventId);
  }

  query = query.order('date', { ascending: true })
    .order('round_number', { ascending: true });

  if (resolvedLimit) {
    query = query.limit(resolvedLimit);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  const matches = (data ?? []) as UpcomingMatchQueryRow[];

  const teamIds = Array.from(
    new Set(matches.flatMap((match) => [match.team1_id, match.team2_id]).filter((id): id is number => Number.isFinite(id)))
  );
  const fieldIds = Array.from(
    new Set(matches.map((match) => match.field_id).filter((id): id is number => Number.isFinite(id)))
  );

  let teamNameById = new Map<number, TeamNameRow>();
  let fieldNameById = new Map<number, string>();

  if (teamIds.length > 0) {
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, logo_url')
      .in('id', teamIds);

    if (teamsError) throw new Error(teamsError.message);

    teamNameById = new Map(
      ((teams ?? []) as TeamNameRow[]).map((team) => [team.id, team])
    );
  }

  if (fieldIds.length > 0) {
    const { data: fields, error: fieldsError } = await supabase
      .from('fields')
      .select('id, name')
      .in('id', fieldIds);

    if (fieldsError) throw new Error(fieldsError.message);

    fieldNameById = new Map(
      ((fields ?? []) as FieldNameRow[]).map((field) => [field.id, field.name])
    );
  }

  return matches.map((row) => ({
    id: row.id,
    event_id: row.event_id,
    date: row.date,
    round_number: row.round_number,
    status: row.status,
    stage_type: row.stage_type,
    bracket_round: row.bracket_round,
    team1_name:
      row.team1_id !== null ? (teamNameById.get(row.team1_id)?.name ?? '-') : '-',
    team1_logo:
      row.team1_id !== null ? (teamNameById.get(row.team1_id)?.logo_url ?? null) : null,
    team2_name:
      row.team2_id !== null ? (teamNameById.get(row.team2_id)?.name ?? '-') : '-',
    team2_logo:
      row.team2_id !== null ? (teamNameById.get(row.team2_id)?.logo_url ?? null) : null,
    field_name:
      row.field_id !== null ? (fieldNameById.get(row.field_id) ?? null) : null,
  }));
}

export async function getUpcomingMatchesWithEvent(eventId: number): Promise<UpcomingMatchesWithEvent | null> {
  const [matches, eventResult] = await Promise.all([
    getUpcomingMatches(eventId),
    supabase.from('events').select('*').eq('id', eventId).single(),
  ]);

  if (eventResult.error || !eventResult.data) return null;

  return {
    event: eventResult.data as Event,
    matches,
  };
}
