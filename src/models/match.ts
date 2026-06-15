"use client";

export type MatchStatus = 'scheduled' | 'in_progress' | 'played' | 'cancelled';
export type MatchStageType = 'league' | 'knockout';
export type MatchBracketRound =
  | 'round_of_16'
  | 'quarterfinal'
  | 'semifinal'
  | 'final'
  | 'third_place';
export type RefereePaymentMethod = 'stripe' | 'cash' | 'zelle' | 'cashapp' | 'venmo';
export type RefereePaymentStatus = 'pending' | 'paid' | 'waived';

export type MatchRefereePaymentFormData = {
  team_slot: 'team1' | 'team2';
  team_id: number | null;
  amount: number | null;
  method: RefereePaymentMethod | null;
  status: RefereePaymentStatus;
  payer_player_id: number | null;
  payer_document_id: string | null;
  payer_name: string | null;
  paid_at: string | null;
  stripe_fee_amount?: number | null;
  state_fee_amount?: number | null;
  total_fee_amount?: number | null;
  total_paid_amount?: number | null;
  reference: string | null;
  note: string | null;
};

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
  rescheduled_from_date: string | null;
  time: string | null;
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
  time: string | null;
  field_id: number | null;
  field_number: number | null;
  team1_id: number | null;
  team2_id: number | null;
  referee_id?: number | null;
  referee_payments?: MatchRefereePaymentFormData[];
};
