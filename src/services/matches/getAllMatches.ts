import { supabase } from '@/lib/supabaseClient';
import type { Match } from '@/models/match';

export type GetAllMatchesParams = {
  eventId?: number | null;
  status?: string | null;
  stageType?: string | null;
};

export type MatchListRow = Match & {
  event_name?: string | null;
  team1_name?: string | null;
  team2_name?: string | null;
  field_name?: string | null;
};

export async function getAllMatches(
  params: GetAllMatchesParams = {}
): Promise<MatchListRow[]> {
  let matchesQuery = supabase
    .from('matches')
    .select('*')
    .order('date', { ascending: true })
    .order('id', { ascending: true });

  if (params.eventId) {
    matchesQuery = matchesQuery.eq('event_id', params.eventId);
  }

  if (params.status) {
    matchesQuery = matchesQuery.eq('status', params.status);
  }

  if (params.stageType) {
    matchesQuery = matchesQuery.eq('stage_type', params.stageType);
  }

  const { data: matches, error: matchesError } = await matchesQuery;

  if (matchesError) {
    throw new Error(matchesError.message);
  }

  const rows = (matches ?? []) as Match[];

  if (rows.length === 0) {
    return [];
  }

  const eventIds = Array.from(new Set(rows.map((row) => row.event_id)));
  const teamIds = Array.from(
    new Set(rows.flatMap((row) => [row.team1_id, row.team2_id]))
  );
  const fieldIds = Array.from(
    new Set(
      rows
        .map((row) => row.field_id)
        .filter((value): value is number => value !== null)
    )
  );

  const [{ data: events, error: eventsError }, { data: teams, error: teamsError }] =
    await Promise.all([
      supabase.from('events').select('id, name').in('id', eventIds),
      supabase.from('teams').select('id, name').in('id', teamIds),
    ]);

  if (eventsError) {
    throw new Error(eventsError.message);
  }

  if (teamsError) {
    throw new Error(teamsError.message);
  }

  const fieldsResult =
    fieldIds.length > 0
      ? await supabase.from('fields').select('id, name').in('id', fieldIds)
      : { data: [], error: null as null | Error };

  if (fieldsResult.error) {
    throw new Error(fieldsResult.error.message);
  }

  const eventMap = new Map((events ?? []).map((item) => [item.id, item.name]));
  const teamMap = new Map((teams ?? []).map((item) => [item.id, item.name]));
  const fieldMap = new Map(
    (fieldsResult.data ?? []).map((item) => [item.id, item.name])
  );

  return rows.map((row) => ({
    ...row,
    event_name: eventMap.get(row.event_id) ?? null,
    team1_name: teamMap.get(row.team1_id) ?? null,
    team2_name: teamMap.get(row.team2_id) ?? null,
    field_name: row.field_id ? fieldMap.get(row.field_id) ?? null : null,
  }));
}