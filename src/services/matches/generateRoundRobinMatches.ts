import { supabase } from '@/lib/supabaseClient';
import { getFieldsByEvent } from '@/services/eventFields/getFieldsByEvent';

type EventTeamRow = {
  id: number;
  team_id: number;
};

type EventConfig = {
  id: number;
  format_type: string;
  round_robin_cycles: number;
  start_date: string;
  match_day_of_week: number | null;
  simultaneous_matches: boolean;
  match_format?: string | null;
};

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
 * Circle method / Berger tables
 * Devuelve jornadas reales.
 * Si hay número impar de equipos, agrega un BYE (null).
 */
function generateRoundRobinRounds(teamIds: number[]): RoundRobinPair[][] {
  const teams = [...teamIds];

  if (teams.length % 2 !== 0) {
    teams.push(-1); // BYE
  }

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
        roundMatches.push({
          team1_id: home,
          team2_id: away,
        });
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

export async function generateRoundRobinMatches(eventId: number): Promise<void> {
  if (!Number.isFinite(eventId)) {
    throw new Error('Invalid event id');
  }

  // 1. Obtener configuración del evento
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(`
      id,
      format_type,
      round_robin_cycles,
      start_date,
      match_day_of_week,
      simultaneous_matches,
      match_format
    `)
    .eq('id', eventId)
    .single();
  if (eventError) throw new Error(eventError.message);
  const eventConfig = event as EventConfig;
  if (eventConfig.format_type !== 'round_robin') throw new Error('Fixture generation is only available for round robin events.');
  if (!eventConfig.start_date) throw new Error('The event must have a start date.');
  if (!eventConfig.match_day_of_week) throw new Error('The event must have a match day configured.');


  // 2. Obtener todos los partidos existentes del evento
  const { data: allMatches, error: allMatchesError } = await supabase
    .from('matches')
    .select('*')
    .eq('event_id', eventId)
    .order('round_number', { ascending: true });
  if (allMatchesError) throw new Error(allMatchesError.message);

  // 3. Obtener equipos actuales y anteriores
  const { data: eventTeams, error: eventTeamsError } = await supabase
    .from('event_teams')
    .select('id, team_id')
    .eq('event_id', eventId)
    .order('team_id', { ascending: true });
  if (eventTeamsError) throw new Error(eventTeamsError.message);
  const currentTeamIds = new Set((eventTeams ?? []).map((row: any) => row.team_id));
  // Equipos que aparecen en partidos futuros pero no están en event_teams
  const futureMatches = (allMatches ?? []).filter(m => m.status !== 'played');
  const futureTeamIds = new Set();
  for (const m of futureMatches) {
    if (!currentTeamIds.has(m.team1_id)) futureTeamIds.add(m.team1_id);
    if (!currentTeamIds.has(m.team2_id)) futureTeamIds.add(m.team2_id);
  }
  // Equipos eliminados
  const eliminatedTeamIds = Array.from(futureTeamIds);
  // Equipos agregados
  const allPastTeamIds = new Set((allMatches ?? []).flatMap(m => [m.team1_id, m.team2_id]));
  const addedTeamIds = Array.from(currentTeamIds).filter(id => !allPastTeamIds.has(id));

  // 4. Determinar el round actual (el último con algún partido jugado)
  let lastPlayedRound = 0;
  for (const match of allMatches ?? []) {
    if ((match.status === 'played' || match.status === 'in_progress') && match.round_number && match.round_number > lastPlayedRound) {
      lastPlayedRound = match.round_number;
    }
  }

  // 5. Reemplazar equipos eliminados por agregados en partidos futuros
  if (eliminatedTeamIds.length > 0 && addedTeamIds.length > 0) {
    // Reemplazo 1 a 1 en orden
    const updates = [];
    for (let i = 0; i < Math.min(eliminatedTeamIds.length, addedTeamIds.length); i++) {
      const elimId = eliminatedTeamIds[i];
      const addId = addedTeamIds[i];
      for (const match of futureMatches) {
        if (match.team1_id === elimId) {
          updates.push({ id: match.id, field: 'team1_id', value: addId });
        }
        if (match.team2_id === elimId) {
          updates.push({ id: match.id, field: 'team2_id', value: addId });
        }
      }
    }
    // Ejecutar updates
    for (const up of updates) {
      await supabase.from('matches').update({ [up.field]: up.value }).eq('id', up.id);
    }
  }

  // 6. Eliminar partidos futuros (round_number > lastPlayedRound y status !== 'played')
  const futureMatchIds = (allMatches ?? [])
    .filter(m => m.round_number && m.round_number > lastPlayedRound && m.status !== 'played')
    .map(m => m.id);
  if (futureMatchIds.length > 0) {
    const { error: delError } = await supabase.from('matches').delete().in('id', futureMatchIds);
    if (delError) throw new Error(delError.message);
  }

  // 7. Obtener equipos actuales para rounds futuros
  const rows = (eventTeams ?? []) as EventTeamRow[];
  if (rows.length < 2) throw new Error('At least 2 teams are required to generate a fixture.');
  const fields = await getFieldsByEvent(eventId);
  if (fields.length === 0) throw new Error('This event has no fields assigned.');
  const teamIds = rows.map((row) => row.team_id);
  const baseRounds = generateRoundRobinRounds(teamIds);
  const cycles = eventConfig.round_robin_cycles || 1;
  const matchesPerRound = baseRounds[0]?.length ?? 0;
  if (
    eventConfig.simultaneous_matches &&
    fields.length < matchesPerRound &&
    eventConfig.match_format !== '11v11'
  ) {
    throw new Error(
      `This event needs at least ${matchesPerRound} assigned fields to play all matches of a round on the same day.`
    );
  }
  const firstMatchDate = getFirstValidMatchDate(
    eventConfig.start_date,
    eventConfig.match_day_of_week
  );

  // 8. Generar solo los rounds futuros
  const matchesToInsert: Array<{
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
    round_number: number | null;
  }> = [];
  let posCounter = 1;
  let numCounter = 1;
  let globalRoundIndex = 0;
  for (let cycle = 1; cycle <= cycles; cycle++) {
    for (const roundMatches of baseRounds) {
      const roundNumber = globalRoundIndex + 1;
      if (roundNumber > lastPlayedRound) {
        const currentDate = addDays(firstMatchDate, globalRoundIndex * 7);
        roundMatches.forEach((pair, index) => {
          const assignedField = fields.length === 1 ? fields[0] : fields[index] ?? null;
          const invertHomeAway = cycle % 2 === 0;
          matchesToInsert.push({
            event_id: eventId,
            pos: posCounter,
            num: numCounter,
            team1_id: invertHomeAway ? pair.team2_id : pair.team1_id,
            team2_id: invertHomeAway ? pair.team1_id : pair.team2_id,
            status: 'scheduled',
            date: formatDateToYYYYMMDD(currentDate),
            field_number: index + 1,
            field_id: assignedField?.id ?? null,
            round_id: null,
            round_number: roundNumber, 
          });
          posCounter += 1;
          numCounter += 1;
        });
      }
      globalRoundIndex += 1;
    }
  }
  if (matchesToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('matches')
      .insert(matchesToInsert);
    if (insertError) throw new Error(insertError.message);
  }
}