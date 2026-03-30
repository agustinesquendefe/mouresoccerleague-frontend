import { supabase } from '@/lib/supabaseClient';
import { getEventStandings } from '@/services/standings/getEventStandings';

type EventConfig = {
  id: number;
  has_playoffs: boolean;
  playoff_teams_count: number | null;
  playoff_home_away: boolean;
};

function getBracketRoundName(teamCount: number): 'final' | 'semifinal' | 'quarterfinal' | 'round_of_16' {
  if (teamCount === 2) return 'final';
  if (teamCount === 4) return 'semifinal';
  if (teamCount === 8) return 'quarterfinal';
  return 'round_of_16';
}

export async function generateKnockoutMatches(eventId: number): Promise<void> {
  if (!Number.isFinite(eventId)) {
    throw new Error('Invalid event id');
  }

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(`
      id,
      has_playoffs,
      playoff_teams_count,
      playoff_home_away
    `)
    .eq('id', eventId)
    .single();

  if (eventError) {
    throw new Error(eventError.message);
  }

  const eventConfig = event as EventConfig;

  if (!eventConfig.has_playoffs) {
    throw new Error('This event is not configured to generate playoffs.');
  }

  if (!eventConfig.playoff_teams_count) {
    throw new Error('This event does not have a playoff teams count configured.');
  }

  const playoffTeamsCount = eventConfig.playoff_teams_count;

  if (![2, 4, 8, 16].includes(playoffTeamsCount)) {
    throw new Error('Playoff teams count must be 2, 4, 8, or 16.');
  }

  const { data: existingKnockoutMatches, error: existingKnockoutError } = await supabase
    .from('matches')
    .select('id')
    .eq('event_id', eventId)
    .eq('stage_type', 'knockout')
    .limit(1);

  if (existingKnockoutError) {
    throw new Error(existingKnockoutError.message);
  }

  if (existingKnockoutMatches && existingKnockoutMatches.length > 0) {
    throw new Error('Knockout matches have already been generated for this event.');
  }

  const standings = await getEventStandings(eventId, 'general');

  if (standings.length < playoffTeamsCount) {
    throw new Error(
      `This event needs at least ${playoffTeamsCount} ranked teams to generate playoffs.`
    );
  }

  const qualifiedTeams = standings.slice(0, playoffTeamsCount);
  const bracketRound = getBracketRoundName(playoffTeamsCount);

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

  let posCounter = 1;
  let numCounter = 1;

  const pairCount = playoffTeamsCount / 2;

  for (let i = 0; i < pairCount; i++) {
    const higherSeed = qualifiedTeams[i];
    const lowerSeed = qualifiedTeams[playoffTeamsCount - 1 - i];

    matchesToInsert.push({
      event_id: eventId,
      pos: posCounter,
      num: numCounter,
      team1_id: higherSeed.team_id,
      team2_id: lowerSeed.team_id,
      status: 'scheduled',
      date: null,
      field_number: null,
      field_id: null,
      round_id: null,
      round_number: null,
      stage_type: 'knockout',
      bracket_round: bracketRound,
      leg_number: 1,
    });

    posCounter += 1;
    numCounter += 1;

    if (eventConfig.playoff_home_away) {
      matchesToInsert.push({
        event_id: eventId,
        pos: posCounter,
        num: numCounter,
        team1_id: lowerSeed.team_id,
        team2_id: higherSeed.team_id,
        status: 'scheduled',
        date: null,
        field_number: null,
        field_id: null,
        round_id: null,
        round_number: null,
        stage_type: 'knockout',
        bracket_round: bracketRound,
        leg_number: 2,
      });

      posCounter += 1;
      numCounter += 1;
    }
  }

  const { error: insertError } = await supabase
    .from('matches')
    .insert(matchesToInsert);

  if (insertError) {
    throw new Error(insertError.message);
  }
}