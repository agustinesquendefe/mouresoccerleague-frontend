import { supabase } from '@/lib/supabaseClient';
import { getFieldsByEvent } from '@/services/eventFields/getFieldsByEvent';

type RoundRobinPair = {
  team1_id: number;
  team2_id: number;
};

function mapEventDayToJsDay(matchDayOfWeek: number): number {
  return matchDayOfWeek === 7 ? 0 : matchDayOfWeek;
}

function getFirstValidMatchDate(startDate: string, matchDayOfWeek: number): Date {
  const date = new Date(`${startDate}T00:00:00`);
  const targetDay = mapEventDayToJsDay(matchDayOfWeek);
  while (date.getDay() !== targetDay) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Circle method / Berger tables.
 * Adds a BYE (-1) placeholder if team count is odd.
 */
function generateRoundRobinRounds(teamIds: number[]): RoundRobinPair[][] {
  const teams = [...teamIds];
  if (teams.length % 2 !== 0) teams.push(-1);

  const totalTeams = teams.length;
  const roundsCount = totalTeams - 1;
  const matchesPerRound = totalTeams / 2;

  const rounds: RoundRobinPair[][] = [];
  let rotation = [...teams];

  for (let round = 0; round < roundsCount; round++) {
    const roundMatches: RoundRobinPair[] = [];

    for (let i = 0; i < matchesPerRound; i++) {
      const home = rotation[i];
      const away = rotation[totalTeams - 1 - i];
      if (home !== -1 && away !== -1) {
        roundMatches.push({ team1_id: home, team2_id: away });
      }
    }

    rounds.push(roundMatches);

    const fixed = rotation[0];
    const rest = rotation.slice(1);
    rest.unshift(rest.pop()!);
    rotation = [fixed, ...rest];
  }

  return rounds;
}

export async function generateGroupStageMatches(eventId: number): Promise<void> {
  if (!Number.isFinite(eventId)) throw new Error('Invalid event id');

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, format_type, round_robin_cycles, start_date, match_day_of_week, simultaneous_matches')
    .eq('id', eventId)
    .single();

  if (eventError) throw new Error(eventError.message);

  if (event.format_type !== 'groups') {
    throw new Error('This service is only for events with format type "groups".');
  }

  if (!event.start_date) throw new Error('The event must have a start date.');
  if (!event.match_day_of_week) throw new Error('The event must have a match day configured.');

  const { data: existingMatches, error: existingError } = await supabase
    .from('matches')
    .select('id')
    .eq('event_id', eventId)
    .eq('stage_type', 'league')
    .limit(1);

  if (existingError) throw new Error(existingError.message);
  if (existingMatches && existingMatches.length > 0) {
    throw new Error('Group stage matches have already been generated for this event.');
  }

  // Load groups
  const { data: groups, error: groupsError } = await supabase
    .from('event_groups')
    .select('id, name, order_index')
    .eq('event_id', eventId)
    .order('order_index', { ascending: true });

  if (groupsError) throw new Error(groupsError.message);
  if (!groups?.length) throw new Error('No groups found. Create and assign groups first.');

  // Load event teams per group
  const { data: eventTeams, error: teamsError } = await supabase
    .from('event_teams')
    .select('id, team_id, group_id')
    .eq('event_id', eventId);

  if (teamsError) throw new Error(teamsError.message);

  const teamsByGroup = new Map<number, number[]>();
  (eventTeams ?? []).forEach((et: any) => {
    if (!et.group_id) return;
    if (!teamsByGroup.has(et.group_id)) teamsByGroup.set(et.group_id, []);
    teamsByGroup.get(et.group_id)!.push(et.team_id);
  });

  for (const group of groups as any[]) {
    const tids = teamsByGroup.get(group.id) ?? [];
    if (tids.length < 2) {
      throw new Error(`${group.name} has fewer than 2 teams assigned.`);
    }
  }

  const fields = await getFieldsByEvent(eventId);
  if (fields.length === 0) throw new Error('This event has no fields assigned.');

  const cycles = event.round_robin_cycles || 1;
  const firstMatchDate = getFirstValidMatchDate(event.start_date, event.match_day_of_week);

  type MatchInsert = {
    event_id: number;
    pos: number;
    num: number;
    team1_id: number;
    team2_id: number;
    status: string;
    date: string;
    field_number: number | null;
    field_id: number | null;
    round_id: number | null;
    round_number: number;
    stage_type: string;
    group_id: number;
  };

  const matchesToInsert: MatchInsert[] = [];
  let posCounter = 1;
  let numCounter = 1;

  // Build all rounds across all groups first so we can interleave them by round date
  const groupRounds: Array<{ groupId: number; rounds: RoundRobinPair[][] }> = (groups as any[]).map(
    (group) => ({
      groupId: group.id,
      rounds: generateRoundRobinRounds(teamsByGroup.get(group.id)!),
    })
  );

  const maxRoundsPerCycle = Math.max(...groupRounds.map((gr) => gr.rounds.length));

  let globalRoundIndex = 0;

  for (let cycle = 1; cycle <= cycles; cycle++) {
    for (let roundIdx = 0; roundIdx < maxRoundsPerCycle; roundIdx++) {
      const currentDate = addDays(firstMatchDate, globalRoundIndex * 7);
      let fieldIndex = 0;

      for (const { groupId, rounds } of groupRounds) {
        const roundMatches = rounds[roundIdx] ?? [];
        const invertHomeAway = cycle % 2 === 0;

        roundMatches.forEach((pair) => {
          const assignedField = fields[fieldIndex % fields.length] ?? null;

          matchesToInsert.push({
            event_id: eventId,
            pos: posCounter,
            num: numCounter,
            team1_id: invertHomeAway ? pair.team2_id : pair.team1_id,
            team2_id: invertHomeAway ? pair.team1_id : pair.team2_id,
            status: 'scheduled',
            date: formatDateToYYYYMMDD(currentDate),
            field_number: fieldIndex + 1,
            field_id: assignedField?.id ?? null,
            round_id: null,
            round_number: globalRoundIndex + 1,
            stage_type: 'league',
            group_id: groupId,
          });

          posCounter += 1;
          numCounter += 1;
          fieldIndex += 1;
        });
      }

      globalRoundIndex += 1;
    }
  }

  const { error: insertError } = await supabase.from('matches').insert(matchesToInsert);
  if (insertError) throw new Error(insertError.message);
}
