import { supabase } from '@/lib/supabaseClient';

export type UpcomingMatchRow = {
  id: number;
  date: string | null;
  round_number: number | null;
  team1_name: string;
  team2_name: string;
  field_name: string | null;
};

type UpcomingMatchQueryRow = {
  id: number;
  date: string | null;
  round_number: number | null;
  team1_id: number | null;
  team2_id: number | null;
  field_id: number | null;
};

type TeamNameRow = {
  id: number;
  name: string;
};

type FieldNameRow = {
  id: number;
  name: string;
};

export async function getUpcomingMatches(limit = 8): Promise<UpcomingMatchRow[]> {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('matches')
    .select(`
      id,
      date,
      round_number,
      team1_id,
      team2_id,
      field_id
    `)
    .eq('status', 'scheduled')
    .gte('date', today)
    .order('date', { ascending: true })
    .order('round_number', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  const matches = (data ?? []) as UpcomingMatchQueryRow[];

  const teamIds = Array.from(
    new Set(matches.flatMap((match) => [match.team1_id, match.team2_id]).filter((id): id is number => Number.isFinite(id)))
  );
  const fieldIds = Array.from(
    new Set(matches.map((match) => match.field_id).filter((id): id is number => Number.isFinite(id)))
  );

  let teamNameById = new Map<number, string>();
  let fieldNameById = new Map<number, string>();

  if (teamIds.length > 0) {
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name')
      .in('id', teamIds);

    if (teamsError) throw new Error(teamsError.message);

    teamNameById = new Map(
      ((teams ?? []) as TeamNameRow[]).map((team) => [team.id, team.name])
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
    date: row.date,
    round_number: row.round_number,
    team1_name:
      row.team1_id !== null ? (teamNameById.get(row.team1_id) ?? '-') : '-',
    team2_name:
      row.team2_id !== null ? (teamNameById.get(row.team2_id) ?? '-') : '-',
    field_name:
      row.field_id !== null ? (fieldNameById.get(row.field_id) ?? null) : null,
  }));
}
