import { supabase } from '@/lib/supabaseClient';

type KnockoutMatchRow = {
  id: number;
  event_id: number;
  team1_id: number;
  team2_id: number;
  score1: number | null;
  score2: number | null;
  status: string | null;
  bracket_round: string | null;
  leg_number: number | null;
  winner_team_id: number | null;
};

const ROUND_ORDER = [
  'round_of_16',
  'quarterfinal',
  'semifinal',
  'final',
] as const;

type BracketRound = (typeof ROUND_ORDER)[number];

function getNextRound(currentRound: BracketRound): BracketRound | null {
  const index = ROUND_ORDER.indexOf(currentRound);
  if (index === -1 || index === ROUND_ORDER.length - 1) return null;
  return ROUND_ORDER[index + 1];
}

function getWinner(match: KnockoutMatchRow): number {
  if (match.winner_team_id) {
    return match.winner_team_id;
  }

  if (match.score1 === null || match.score2 === null) {
    throw new Error(`Match ${match.id} does not have a valid score.`);
  }

  if (match.score1 === match.score2) {
    throw new Error(
      `Match ${match.id} is tied and no winner has been set.`
    );
  }

  return match.score1 > match.score2 ? match.team1_id : match.team2_id;
}

export async function advanceKnockoutRound(eventId: number): Promise<void> {
  if (!Number.isFinite(eventId)) {
    throw new Error('Invalid event id');
  }

  const { data: knockoutMatches, error } = await supabase
    .from('matches')
    .select(`
      id,
      event_id,
      team1_id,
      team2_id,
      score1,
      score2,
      status,
      bracket_round,
      leg_number,
      winner_team_id
    `)
    .eq('event_id', eventId)
    .eq('stage_type', 'knockout');

  if (error) {
    throw new Error(error.message);
  }

  const matches = (knockoutMatches ?? []) as KnockoutMatchRow[];

  if (matches.length === 0) {
    throw new Error('This event has no knockout matches yet.');
  }

  const existingRounds = Array.from(
    new Set(
      matches
        .map((match) => match.bracket_round)
        .filter((value): value is BracketRound =>
          Boolean(value && ROUND_ORDER.includes(value as BracketRound))
        )
    )
  ).sort((a, b) => ROUND_ORDER.indexOf(a) - ROUND_ORDER.indexOf(b));

  if (existingRounds.length === 0) {
    throw new Error('No valid knockout round found.');
  }

  const currentRound = existingRounds[existingRounds.length - 1];
  const currentRoundMatches = matches.filter(
    (match) => match.bracket_round === currentRound
  );

  if (currentRoundMatches.length === 0) {
    throw new Error(`No matches found for current knockout round: ${currentRound}`);
  }

  const pendingMatches = currentRoundMatches.filter(
    (match) => String(match.status ?? '').toLowerCase() !== 'played'
  );

  if (pendingMatches.length > 0) {
    throw new Error(
      `There are still ${pendingMatches.length} matches pending in ${currentRound}.`
    );
  }

  const nextRound = getNextRound(currentRound);

  if (!nextRound) {
    throw new Error('This knockout bracket is already at the final round.');
  }

  const { data: alreadyGeneratedNextRound, error: nextRoundError } = await supabase
    .from('matches')
    .select('id')
    .eq('event_id', eventId)
    .eq('stage_type', 'knockout')
    .eq('bracket_round', nextRound)
    .limit(1);

  if (nextRoundError) {
    throw new Error(nextRoundError.message);
  }

  if (alreadyGeneratedNextRound && alreadyGeneratedNextRound.length > 0) {
    throw new Error(`${nextRound} matches have already been generated.`);
  }

  const winners = currentRoundMatches.map(getWinner);

  if (winners.length % 2 !== 0) {
    throw new Error(
      `Cannot generate ${nextRound}: winners count is not even.`
    );
  }

  const { data: maxPosData, error: maxPosError } = await supabase
    .from('matches')
    .select('pos, num')
    .eq('event_id', eventId)
    .order('pos', { ascending: false })
    .limit(1);

  if (maxPosError) {
    throw new Error(maxPosError.message);
  }

  let posCounter = (maxPosData?.[0]?.pos ?? 0) + 1;
  let numCounter = (maxPosData?.[0]?.num ?? 0) + 1;

  const matchesToInsert: Array<{
    event_id: number;
    pos: number;
    num: number;
    team1_id: number;
    team2_id: number;
    status: string;
    date: string | null;
    field_number: number | null;
    field_id: number | null;
    round_id: number | null;
    round_number: number | null;
    stage_type: string;
    bracket_round: string;
    leg_number: number | null;
  }> = [];

  for (let i = 0; i < winners.length; i += 2) {
    matchesToInsert.push({
      event_id: eventId,
      pos: posCounter,
      num: numCounter,
      team1_id: winners[i],
      team2_id: winners[i + 1],
      status: 'scheduled',
      date: null,
      field_number: null,
      field_id: null,
      round_id: null,
      round_number: null,
      stage_type: 'knockout',
      bracket_round: nextRound,
      leg_number: 1,
    });

    posCounter += 1;
    numCounter += 1;
  }

  const { error: insertError } = await supabase
    .from('matches')
    .insert(matchesToInsert);

  if (insertError) {
    throw new Error(insertError.message);
  }
}