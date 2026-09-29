import { supabase } from '@/lib/supabaseClient';

export type EventRosterImportMode = 'empty' | 'copy_default';

export async function addTeamToEvent(
  eventId: number,
  teamId: number,
  rosterImportMode: EventRosterImportMode = 'empty'
) {
  const [lastEventTeamResult, defaultRosterResult] = await Promise.all([
    supabase
      .from('event_teams')
      .select('order_index')
      .eq('event_id', eventId)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle(),
    rosterImportMode === 'copy_default'
      ? supabase
        .from('team_players')
        .select('player_id, jersey_number, is_active')
        .eq('team_id', teamId)
        .is('event_id', null)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const { data: lastEventTeam, error: lastEventTeamError } = lastEventTeamResult;

  if (lastEventTeamError) {
    throw new Error(lastEventTeamError.message);
  }
  if (defaultRosterResult.error) {
    throw new Error(defaultRosterResult.error.message);
  }

  const defaultRoster = Array.from(
    new Map((defaultRosterResult.data ?? []).map((row) => [row.player_id, row])).values()
  );

  if (defaultRoster.length > 0) {
    const { data: existingEventAssignments, error: assignmentsError } = await supabase
      .from('team_players')
      .select('player_id')
      .eq('event_id', eventId)
      .in('player_id', defaultRoster.map((row) => row.player_id));

    if (assignmentsError) throw new Error(assignmentsError.message);
    if ((existingEventAssignments ?? []).length > 0) {
      throw new Error(
        'One or more players from the default roster are already assigned to another team in this event. Add the team with an empty roster or resolve those assignments first.'
      );
    }
  }

  const { data: eventTeam, error } = await supabase
    .from('event_teams')
    .insert([
      {
        event_id: eventId,
        team_id: teamId,
        order_index: (lastEventTeam?.order_index ?? -1) + 1,
        status: 'active',
      },
    ])
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('This team is already added to the event.');
    }
    throw new Error(error.message);
  }

  if (defaultRoster.length > 0) {
    const { error: rosterError } = await supabase
      .from('team_players')
      .insert(defaultRoster.map((row) => ({
        player_id: row.player_id,
        team_id: teamId,
        event_id: eventId,
        jersey_number: row.jersey_number ?? null,
        is_active: row.is_active ?? true,
      })));

    if (rosterError) {
      await supabase.from('event_teams').delete().eq('id', eventTeam.id);
      throw new Error(`The team could not be added with its default roster: ${rosterError.message}`);
    }
  }

  return {
    eventTeamId: Number(eventTeam.id),
    copiedPlayers: defaultRoster.length,
  };
}
