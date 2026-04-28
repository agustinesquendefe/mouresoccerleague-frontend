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

  // 1. Obtener configuración del evento
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
  if (eventError) throw new Error(eventError.message);
  const eventConfig = event as EventConfig;
  if (!eventConfig.has_playoffs) throw new Error('This event is not configured to generate playoffs.');
  if (!eventConfig.playoff_teams_count) throw new Error('This event does not have a playoff teams count configured.');
  const playoffTeamsCount = eventConfig.playoff_teams_count;
  if (![2, 4, 8, 16].includes(playoffTeamsCount)) throw new Error('Playoff teams count must be 2, 4, 8, or 16.');


  // 2. Obtener todos los partidos existentes del evento (solo knockout)
  const { data: allMatches, error: allMatchesError } = await supabase
    .from('matches')
    .select('*')
    .eq('event_id', eventId)
    .eq('stage_type', 'knockout')
    .order('id', { ascending: true });
  if (allMatchesError) throw new Error(allMatchesError.message);

  // 3. Obtener equipos actuales y anteriores
  const { data: eventTeams, error: eventTeamsError } = await supabase
    .from('event_teams')
    .select('id, team_id')
    .eq('event_id', eventId);
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

  // 4. Determinar si hay algún partido jugado
  let hasPlayed = false;
  for (const match of allMatches ?? []) {
    if (match.status === 'played' || match.status === 'in_progress') {
      hasPlayed = true;
      break;
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

  // 6. Eliminar partidos futuros (status !== 'played')
  const futureMatchIds = (allMatches ?? [])
    .filter(m => m.status !== 'played')
    .map(m => m.id);
  if (futureMatchIds.length > 0) {
    const { error: delError } = await supabase.from('matches').delete().in('id', futureMatchIds);
    if (delError) throw new Error(delError.message);
  }

  // 5. Obtener standings y equipos
  const standings = await getEventStandings(eventId, 'general');
  if (standings.length < playoffTeamsCount) throw new Error(`This event needs at least ${playoffTeamsCount} ranked teams to generate playoffs.`);
  const qualifiedTeams = standings.slice(0, playoffTeamsCount);
  const bracketRound = getBracketRoundName(playoffTeamsCount);

  // 6. Generar partidos solo si no hay partidos jugados
  if (!hasPlayed) {
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
    if (matchesToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('matches')
        .insert(matchesToInsert);
      if (insertError) throw new Error(insertError.message);
    }
  }
}