import { supabase } from '@/lib/supabaseClient';
import { getFieldsByEvent } from '@/services/eventFields/getFieldsByEvent';
import {
  addDays,
  buildPendingFixturePairs,
  buildDesiredRounds,
  formatDate,
  getFirstMatchDate,
  packIntoRounds,
} from './incrementalFixture';

export async function generateRoundRobinMatches(eventId: number): Promise<void> {
  if (!Number.isFinite(eventId)) throw new Error('Invalid event id');
  const [eventResult, teamsResult, matchesResult, fields] = await Promise.all([
    supabase.from('events').select('format_type, round_robin_cycles, start_date, match_day_of_week').eq('id', eventId).single(),
    supabase.from('event_teams').select('id, team_id, order_index, status').eq('event_id', eventId).eq('status', 'active').order('order_index').order('id'),
    supabase.from('matches').select('id, team1_id, team2_id, round_number, pos, num, is_extra, status, date').eq('event_id', eventId).eq('stage_type', 'league'),
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
  const allMatches = matchesResult.data ?? [];
  const cycles = event.round_robin_cycles || 1;
  const activeTeamIds = new Set(teamIds);
  const lockedRoundNumbers = new Set(allMatches
    .filter((match) => match.status === 'played' || match.status === 'in_progress')
    .map((match) => Number(match.round_number))
    .filter((roundNumber) => Number.isInteger(roundNumber) && roundNumber > 0));
  const isActiveFixtureMatch = (match: typeof allMatches[number]) =>
    !match.is_extra &&
    activeTeamIds.has(match.team1_id) &&
    activeTeamIds.has(match.team2_id);
  const fixedMatches = allMatches.filter((match) =>
    isActiveFixtureMatch(match) &&
    (match.status === 'played' ||
      match.status === 'in_progress' ||
      (match.status === 'scheduled' && lockedRoundNumbers.has(Number(match.round_number)))));
  const reusableMatches = allMatches.filter((match) =>
    isActiveFixtureMatch(match) &&
    match.status === 'scheduled' &&
    !lockedRoundNumbers.has(Number(match.round_number)));
  type PendingMatch = { team1_id: number; team2_id: number; id?: number };
  const desiredRounds: PendingMatch[][] = buildDesiredRounds(teamIds, cycles);
  const pendingMatches = buildPendingFixturePairs(
    desiredRounds,
    fixedMatches,
    reusableMatches,
    cycles
  );
  const firstPendingRound = Math.max(0, ...lockedRoundNumbers) + 1;
  const assignments = packIntoRounds(pendingMatches).flatMap((round, roundIndex) =>
    round.map((pair) => ({ pair, roundNumber: firstPendingRound + roundIndex })));
  let pos = Math.max(0, ...allMatches.map((match) => Number(match.pos) || 0)) + 1;
  let num = Math.max(0, ...allMatches.map((match) => Number(match.num) || 0)) + 1;
  const firstDate = getFirstMatchDate(event.start_date, event.match_day_of_week);
  const existingDateByRound = new Map<number, string>();
  allMatches.forEach((match) => {
    const roundNumber = Number(match.round_number);
    if (Number.isInteger(roundNumber) && roundNumber > 0 && match.date && !existingDateByRound.has(roundNumber)) {
      existingDateByRound.set(roundNumber, match.date);
    }
  });
  const plannedMatches = assignments.map(({ pair, roundNumber }, matchIndex) => {
    const roundMatchIndex = assignments
      .slice(0, matchIndex)
      .filter((assignment) => assignment.roundNumber === roundNumber)
      .length;
    return {
      ...pair,
      roundNumber,
      date: existingDateByRound.get(roundNumber) ?? formatDate(addDays(firstDate, (roundNumber - 1) * 7)),
      field_number: (roundMatchIndex % fields.length) + 1,
      field_id: fields[roundMatchIndex % fields.length]?.id ?? null,
    };
  });
  const reusedIds = new Set(plannedMatches.flatMap((match) => match.id == null ? [] : [match.id]));
  const obsoleteIds = allMatches
    .filter((match) =>
      !match.is_extra &&
      match.status === 'scheduled' &&
      !lockedRoundNumbers.has(Number(match.round_number)) &&
      !reusedIds.has(match.id))
    .map((match) => match.id);
  const updates = plannedMatches.filter((match) => match.id != null);
  const inserts = plannedMatches.filter((match) => match.id == null).map((match) => ({
    event_id: eventId, pos: pos++, num: num++,
    team1_id: match.team1_id, team2_id: match.team2_id,
    status: 'scheduled', date: match.date,
    field_number: match.field_number, field_id: match.field_id,
    round_id: null, round_number: match.roundNumber, stage_type: 'league',
  }));

  const updateResults = await Promise.all(updates.map((match) => supabase
    .from('matches')
    .update({
      round_number: match.roundNumber,
      date: match.date,
      field_number: match.field_number,
      field_id: match.field_id,
    })
    .eq('id', match.id!)
    .eq('status', 'scheduled')
    .select('id')));
  const failedUpdate = updateResults.find((result) => result.error);
  if (failedUpdate?.error) throw new Error(failedUpdate.error.message);
  if (updateResults.some((result) => (result.data?.length ?? 0) !== 1)) {
    throw new Error('The fixture changed while it was being generated. Reload it and try again.');
  }

  if (obsoleteIds.length > 0) {
    const { error } = await supabase.from('matches').update({ status: 'cancelled' }).in('id', obsoleteIds);
    if (error) throw new Error(error.message);
  }
  if (inserts.length > 0) {
    const { error } = await supabase.from('matches').insert(inserts);
    if (error) throw new Error(error.message);
  }
}
