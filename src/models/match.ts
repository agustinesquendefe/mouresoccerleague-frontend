export type MatchStatus = 'scheduled' | 'in_progress' | 'played' | 'cancelled';
export type MatchStageType = 'league' | 'knockout';
export type MatchBracketRound =
  | 'round_of_16'
  | 'quarterfinal'
  | 'semifinal'
  | 'final'
  | 'third_place';

export type Match = {
  id: number;
  event_id: number;
  team1_id: number;
  team2_id: number;
  round_id: number | null;
  round_number: number | null;
  status: MatchStatus | string | null;
  score1: number | null;
  score2: number | null;
  penalty_score1: number | null;
  penalty_score2: number | null;
  winner_team_id: number | null;
  date: string | null;
  field_number: number | null;
  field_id: number | null;
  stage_type: MatchStageType | string | null;
  bracket_round: MatchBracketRound | string | null;
  leg_number: number | null;
  created_at: string;
  updated_at: string;
};

export type MatchFormData = {
  status: MatchStatus;
  score1: number | null;
  score2: number | null;
  penalty_score1: number | null;
  penalty_score2: number | null;
  winner_team_id: number | null;
  date: string | null;
  field_id: number | null;
  field_number: number | null;
};