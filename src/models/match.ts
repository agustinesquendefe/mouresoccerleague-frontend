export type MatchStatus = 'scheduled' | 'in_progress' | 'played' | 'cancelled';

export type Match = {
  id: number;
  event_id: number;
  team1_id: number;
  team2_id: number;
  round_id: number | null;
  status: string | null;
  score1: number | null;
  score2: number | null;
  date: string | null;
  created_at: string;
  updated_at: string;
  field_number: number | null;
};

export type MatchFormData = {
  team1_id: number;
  team2_id: number;
  round_id?: number | null;
  status?: string | null;
  score1?: number | null;
  score2?: number | null;
  date?: string | null;
  field_number?: number | null;
};