import { supabase } from '@/lib/supabaseClient';
import { getFieldsByEvent } from '@/services/eventFields/getFieldsByEvent';
import { addDays, buildDesiredRounds, findMissingPairs, formatDate, getFirstMatchDate, packIntoRounds } from './incrementalFixture';

export async function generateRoundRobinMatches(eventId: number): Promise<void> {
  if (!Number.isFinite(eventId)) throw new Error('Invalid event id');
  const [eventResult, teamsResult, matchesResult, fields] = await Promise.all([
    supabase.from('events').select('format_type, round_robin_cycles, start_date, match_day_of_week').eq('id', eventId).single(),
    supabase.from('event_teams').select('id, team_id, order_index, status').eq('event_id', eventId).eq('status', 'active').order('order_index').order('id'),
    supabase.from('matches').select('id, team1_id, team2_id, round_number, pos, num, is_extra').eq('event_id', eventId).eq('stage_type', 'league'),
    getFieldsByEvent(eventId),
  ]);
  if (eventResult.error) throw new Error(eventResult.error.message);
  if (teamsResult.error) throw new Error(teamsResult.error.message);
  if (matchesResult.error) throw new Error(matchesResult.error.message);
  const event = eventResult.data;
  if (event.format_type !== 'round_robin') throw new Error('Fixture generation is only available for round robin events.');
  if (!event.start_date || !event.match_day_of_week) throw new Error('The event must have a start date and match day configured.');
  if (fields.length === 0) throw new Error('This event has no fields assigned.');

  const teamIds = Array.from(new Set((teamsResult.data ?? []).map((row) => row.team_id)));
  if (teamIds.length < 2) throw new Error('At least 2 active teams are required to generate a fixture.');
  const fixtureMatches = (matchesResult.data ?? []).filter((match) => !match.is_extra);
  const cycles = event.round_robin_cycles || 1;
  const missingPairs = findMissingPairs(
    buildDesiredRounds(teamIds, cycles),
    fixtureMatches.map((match) => ({ team1_id: match.team1_id, team2_id: match.team2_id })),
    cycles
  );
  if (missingPairs.length === 0) return;

  const newRounds = packIntoRounds(missingPairs);
  const maxRound = Math.max(0, ...fixtureMatches.map((match) => Number(match.round_number) || 0));
  let pos = Math.max(0, ...fixtureMatches.map((match) => Number(match.pos) || 0)) + 1;
  let num = Math.max(0, ...fixtureMatches.map((match) => Number(match.num) || 0)) + 1;
  const firstDate = getFirstMatchDate(event.start_date, event.match_day_of_week);
  const inserts = newRounds.flatMap((round, roundIndex) => {
    const roundNumber = maxRound + roundIndex + 1;
    return round.map((pair, matchIndex) => ({
      event_id: eventId, pos: pos++, num: num++, ...pair,
      status: 'scheduled',
      date: formatDate(addDays(firstDate, (roundNumber - 1) * 7)),
      field_number: (matchIndex % fields.length) + 1,
      field_id: fields[matchIndex % fields.length]?.id ?? null,
      round_id: null, round_number: roundNumber, stage_type: 'league',
    }));
  });
  const { error } = await supabase.from('matches').insert(inserts);
  if (error) throw new Error(error.message);
}
