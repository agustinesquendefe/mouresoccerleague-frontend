import { supabase } from '@/lib/supabaseClient';

export type PublicMatchRow = {
  id: number;
  event_id: number;
  date: string | null;
  round_number: number | null;
  status: string | null;
  stage_type: string | null;
  bracket_round: string | null;
  score1: number | null;
  score2: number | null;
  team1_id: number;
  team2_id: number;
  team1_name: string;
  team2_name: string;
  field_name: string | null;
};

type RawMatch = {
  id: number;
  event_id: number;
  date: string | null;
  round_number: number | null;
  status: string | null;
  stage_type: string | null;
  bracket_round: string | null;
  score1: number | null;
  score2: number | null;
  team1_id: number | null;
  team2_id: number | null;
  field_id: number | null;
};

export async function getPublicMatches(eventId: number): Promise<PublicMatchRow[]> {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      id,
      event_id,
      date,
      round_number,
      status,
      stage_type,
      bracket_round,
      score1,
      score2,
      team1_id,
      team2_id,
      field_id
    `)
    .eq('event_id', eventId)
    .order('stage_type', { ascending: true })
    .order('round_number', { ascending: true })
    .order('date', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);

  const matches = (data ?? []) as RawMatch[];

  const teamIds = Array.from(
    new Set(matches.flatMap((m) => [m.team1_id, m.team2_id]).filter((id): id is number => Number.isFinite(id)))
  );
  const fieldIds = Array.from(
    new Set(matches.map((m) => m.field_id).filter((id): id is number => Number.isFinite(id)))
  );

  const [teamRes, fieldRes] = await Promise.all([
    teamIds.length > 0
      ? supabase.from('teams').select('id, name').in('id', teamIds)
      : Promise.resolve({ data: [], error: null }),
    fieldIds.length > 0
      ? supabase.from('fields').select('id, name').in('id', fieldIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (teamRes.error) throw new Error(teamRes.error.message);
  if (fieldRes.error) throw new Error(fieldRes.error.message);

  const teamById = new Map<number, string>(
    ((teamRes.data ?? []) as { id: number; name: string }[]).map((t) => [t.id, t.name])
  );
  const fieldById = new Map<number, string>(
    ((fieldRes.data ?? []) as { id: number; name: string }[]).map((f) => [f.id, f.name])
  );

  return matches.map((m) => ({
    id: m.id,
    event_id: m.event_id,
    date: m.date,
    round_number: m.round_number,
    status: m.status,
    stage_type: m.stage_type,
    bracket_round: m.bracket_round,
    score1: m.score1,
    score2: m.score2,
    team1_id: m.team1_id ?? 0,
    team2_id: m.team2_id ?? 0,
    team1_name: m.team1_id != null ? (teamById.get(m.team1_id) ?? '-') : '-',
    team2_name: m.team2_id != null ? (teamById.get(m.team2_id) ?? '-') : '-',
    field_name: m.field_id != null ? (fieldById.get(m.field_id) ?? null) : null,
  }));
}
