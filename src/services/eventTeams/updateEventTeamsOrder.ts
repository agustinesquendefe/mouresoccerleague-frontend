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

  const { error } = await supabase
    .from('event_teams')
    .upsert(teams, { onConflict: 'id' });

  if (error) {
    throw new Error(error.message);
  }
}