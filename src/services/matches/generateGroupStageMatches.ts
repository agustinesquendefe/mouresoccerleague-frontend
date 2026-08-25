import { supabase } from '@/lib/supabaseClient';
import { getFieldsByEvent } from '@/services/eventFields/getFieldsByEvent';
import { addDays, buildDesiredRounds, findMissingPairs, formatDate, getFirstMatchDate, packIntoRounds } from './incrementalFixture';

export async function generateGroupStageMatches(eventId: number): Promise<void> {
  if (!Number.isFinite(eventId)) throw new Error('Invalid event id');
  const [eventResult, teamsResult, groupsResult, matchesResult, fields] = await Promise.all([
    supabase.from('events').select('format_type, round_robin_cycles, start_date, match_day_of_week').eq('id', eventId).single(),
    supabase.from('event_teams').select('id, team_id, group_id, order_index, status').eq('event_id', eventId).eq('status', 'active').order('order_index').order('id'),
    supabase.from('event_groups').select('id, name, order_index').eq('event_id', eventId).order('order_index'),
    supabase.from('matches').select('id, team1_id, team2_id, group_id, round_number, pos, num, is_extra').eq('event_id', eventId).eq('stage_type', 'league'),
    getFieldsByEvent(eventId),
  ]);
  if (eventResult.error) throw new Error(eventResult.error.message);
  if (teamsResult.error) throw new Error(teamsResult.error.message);
  if (groupsResult.error) throw new Error(groupsResult.error.message);
  if (matchesResult.error) throw new Error(matchesResult.error.message);
  const event = eventResult.data;
  if (event.format_type !== 'groups') throw new Error('This service is only for group events.');
  if (!event.start_date || !event.match_day_of_week) throw new Error('The event must have a start date and match day configured.');
  if (!groupsResult.data?.length) throw new Error('No groups found. Create and assign groups first.');
  if (fields.length === 0) throw new Error('This event has no fields assigned.');

  const fixtureMatches = (matchesResult.data ?? []).filter((match) => !match.is_extra);
  const cycles = event.round_robin_cycles || 1;
  const missingByGroup = groupsResult.data.map((group) => {
    const teamIds = (teamsResult.data ?? []).filter((row) => row.group_id === group.id).map((row) => row.team_id);
    if (teamIds.length < 2) throw new Error(`${group.name} has fewer than 2 active teams assigned.`);
    const existing = fixtureMatches.filter((match) => match.group_id === group.id);
    return {
      groupId: group.id,
      rounds: packIntoRounds(findMissingPairs(
        buildDesiredRounds(teamIds, cycles),
        existing.map((match) => ({ team1_id: match.team1_id, team2_id: match.team2_id })),
        cycles
      )),
    };
  });
  if (missingByGroup.every((group) => group.rounds.length === 0)) return;

  const maxRound = Math.max(0, ...fixtureMatches.map((match) => Number(match.round_number) || 0));
  let pos = Math.max(0, ...fixtureMatches.map((match) => Number(match.pos) || 0)) + 1;
  let num = Math.max(0, ...fixtureMatches.map((match) => Number(match.num) || 0)) + 1;
  const firstDate = getFirstMatchDate(event.start_date, event.match_day_of_week);
  const maxNewRounds = Math.max(...missingByGroup.map((group) => group.rounds.length));
  const inserts = [];
  for (let roundIndex = 0; roundIndex < maxNewRounds; roundIndex += 1) {
    const roundNumber = maxRound + roundIndex + 1;
    let matchIndex = 0;
    for (const group of missingByGroup) {
      for (const pair of group.rounds[roundIndex] ?? []) {
        inserts.push({
          event_id: eventId, pos: pos++, num: num++, ...pair,
          status: 'scheduled',
          date: formatDate(addDays(firstDate, (roundNumber - 1) * 7)),
          field_number: (matchIndex % fields.length) + 1,
          field_id: fields[matchIndex % fields.length]?.id ?? null,
          round_id: null, round_number: roundNumber, stage_type: 'league', group_id: group.groupId,
        });
        matchIndex += 1;
      }
    }
  }
  const { error } = await supabase.from('matches').insert(inserts);
  if (error) throw new Error(error.message);
}
