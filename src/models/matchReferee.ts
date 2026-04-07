import type { Referee } from './referee';

export type MatchReferee = {
  id: number;
  match_id: number;
  referee_id: number;
  role?: string | null;
  created_at?: string | null;
};

export type MatchRefereeWithReferee = MatchReferee & {
  referee?: Referee | null;
};