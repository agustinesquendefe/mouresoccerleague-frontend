import { supabase } from '@/lib/supabaseClient';

export type BracketRound =
  | 'round_of_16'
  | 'quarterfinal'
  | 'semifinal'
  | 'third_place'
  | 'final';

export type PlayoffMatch = {
  id: number;
  bracket_round: BracketRound | string;
  status: string | null;
  score1: number | null;
  score2: number | null;
  penalty_score1: number | null;
  penalty_score2: number | null;
  winner_team_id: number | null;
  team1_id: number;
  team2_id: number;
  team1_name: string;
  team2_name: string;
  date: string | null;
  time: string | null;
};

export type PlayoffRoundGroup = {
  round: BracketRound | string;
  label: string;
  matches: PlayoffMatch[];
};

const ROUND_ORDER: (BracketRound | string)[] = [
  'round_of_16',
  'quarterfinal',
  'semifinal',
  'third_place',
  'final',
];

const ROUND_LABELS: Record<string, string> = {
  round_of_16: 'Round of 16',
  quarterfinal: 'Quarterfinals',
  semifinal: 'Semifinals',
  third_place: '3rd Place',
  final: 'Final',
};

export async function getPlayoffMatches(eventId: number): Promise<PlayoffRoundGroup[]> {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      id,
      bracket_round,
      status,
      score1,
      score2,
      penalty_score1,
      penalty_score2,
      winner_team_id,
      team1_id,
      team2_id,
      date,
      time,
      team1:team1_id ( id, name ),
      team2:team2_id ( id, name )
    `)
    .eq('event_id', eventId)
    .eq('stage_type', 'knockout')
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);

  const matches: PlayoffMatch[] = ((data ?? []) as any[]).map((m) => {
    const t1 = Array.isArray(m.team1) ? m.team1[0] : m.team1;
    const t2 = Array.isArray(m.team2) ? m.team2[0] : m.team2;
    return {
      id: m.id,
      bracket_round: m.bracket_round ?? 'final',
      status: m.status,
      score1: m.score1,
      score2: m.score2,
      penalty_score1: m.penalty_score1,
      penalty_score2: m.penalty_score2,
      winner_team_id: m.winner_team_id,
      team1_id: m.team1_id,
      team2_id: m.team2_id,
      team1_name: t1?.name ?? `#${m.team1_id}`,
      team2_name: t2?.name ?? `#${m.team2_id}`,
      date: m.date,
      time: m.time,
    };
  });

  const grouped = new Map<string, PlayoffMatch[]>();
  matches.forEach((m) => {
    const key = String(m.bracket_round);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(m);
  });

  const sorted = [...grouped.entries()].sort(([a], [b]) => {
    const ai = ROUND_ORDER.indexOf(a);
    const bi = ROUND_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return sorted.map(([round, matchList]) => ({
    round,
    label: ROUND_LABELS[round] ?? round,
    matches: matchList,
  }));
}
