import { supabase } from '@/lib/supabaseClient';

type EventTeamOrderUpdate = {
  id: number;
  order_index: number;
};

export async function hasStartedLeagueMatches(eventId: number): Promise<boolean> {
  const { count, error } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('stage_type', 'league')
    .in('status', ['played', 'in_progress']);

  if (error) {
    throw new Error(error.message);
  }

  return (count ?? 0) > 0;
}

export async function updateEventTeamsOrder(eventId: number, teams: EventTeamOrderUpdate[]) {
  if (teams.length === 0) {
    return;
  }

  if (await hasStartedLeagueMatches(eventId)) {
    throw new Error('You cannot reorder teams after a league match has started or been played.');
  }

  const temporaryUpdates = await Promise.all(
    teams.map((team, index) =>
      supabase
        .from('event_teams')
        .update({ order_index: -(index + 1) })
        .eq('id', team.id)
        .eq('event_id', eventId)
    )
  );

  const failedTemporaryUpdate = temporaryUpdates.find((result) => result.error);

  if (failedTemporaryUpdate?.error) {
    throw new Error(failedTemporaryUpdate.error.message);
  }

  const finalUpdates = await Promise.all(
    teams.map((team) =>
      supabase
        .from('event_teams')
        .update({ order_index: team.order_index })
        .eq('id', team.id)
        .eq('event_id', eventId)
    )
  );

  const failedFinalUpdate = finalUpdates.find((result) => result.error);

  if (failedFinalUpdate?.error) {
    throw new Error(failedFinalUpdate.error.message);
  }
}
