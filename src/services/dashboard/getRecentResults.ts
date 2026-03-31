import { supabase } from '@/lib/supabaseClient';

export type RecentResultRow = {
  id: number;
  date: string | null;
  team1_name: string;
  team2_name: string;
  score1: number | null;
  score2: number | null;
  penalty_score1: number | null;
  penalty_score2: number | null;
  stage_type: string | null;
  bracket_round: string | null;
  round_number: number | null;
};

type RecentMatchQueryRow = {
  id: number;
  date: string | null;
  team1_id: number | null;
  team2_id: number | null;
  score1: number | null;
  score2: number | null;
  penalty_score1: number | null;
  penalty_score2: number | null;
  stage_type: string | null;
  bracket_round: string | null;
  round_number: number | null;
};

type TeamNameRow = {
  id: number;
  name: string;
};

export async function getRecentResults(limit = 5): Promise<RecentResultRow[]> {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      id,
      date,
      team1_id,
      team2_id,
      score1,
      score2,
      penalty_score1,
      penalty_score2,
      stage_type,
      bracket_round,
      round_number
    `)
    .eq('status', 'played')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const matches = (data ?? []) as RecentMatchQueryRow[];
  const teamIds = Array.from(
    new Set(matches.flatMap((match) => [match.team1_id, match.team2_id]).filter((id): id is number => Number.isFinite(id)))
  );

  let teamNameById = new Map<number, string>();

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

  return matches.map((row) => ({
    id: row.id,
    date: row.date,
    team1_name:
      row.team1_id !== null ? (teamNameById.get(row.team1_id) ?? '-') : '-',
    team2_name:
      row.team2_id !== null ? (teamNameById.get(row.team2_id) ?? '-') : '-',
    score1: row.score1,
    score2: row.score2,
    penalty_score1: row.penalty_score1,
    penalty_score2: row.penalty_score2,
    stage_type: row.stage_type,
    bracket_round: row.bracket_round,
    round_number: row.round_number,
  }));
}
