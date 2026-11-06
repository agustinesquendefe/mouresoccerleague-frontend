import { supabase } from '@/lib/supabaseClient';
import type { Match, MatchStatus } from '@/models/match';

export type MatchScoreUpdate = {
  status: MatchStatus;
  score1: number | null;
  score2: number | null;
  penalty_score1: number | null;
  penalty_score2: number | null;
};

export async function updateMatchScore(
  match: Match,
  update: MatchScoreUpdate
): Promise<Match> {
  const score1 = update.score1;
  const score2 = update.score2;
  const hasScore = score1 != null && score2 != null;
  let winnerTeamId: number | null = null;

  if (update.status === 'played' && hasScore) {
    if (score1 > score2) winnerTeamId = match.team1_id;
    if (score2 > score1) winnerTeamId = match.team2_id;
    if (
      score1 === score2 &&
      update.penalty_score1 != null &&
      update.penalty_score2 != null
    ) {
      if (update.penalty_score1 > update.penalty_score2) winnerTeamId = match.team1_id;
      if (update.penalty_score2 > update.penalty_score1) winnerTeamId = match.team2_id;
    }
  }

  const { data, error } = await supabase
    .from('matches')
    .update({
      status: update.status,
      score1: update.score1,
      score2: update.score2,
      penalty_score1: update.penalty_score1,
      penalty_score2: update.penalty_score2,
      winner_team_id: winnerTeamId,
    })
    .eq('id', match.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Match;
}
