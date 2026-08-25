import { supabase } from '@/lib/supabaseClient';

export async function removeTeamFromEvent(eventTeamId: number) {
  const { data: eventTeam, error: eventTeamError } = await supabase
    .from('event_teams')
    .select('event_id, team_id, order_index')
    .eq('id', eventTeamId)
    .maybeSingle();

  if (eventTeamError) {
    throw new Error(eventTeamError.message);
  }

  if (!eventTeam) {
    throw new Error('Event team not found.');
  }

  const { count: matchCount, error: matchesError } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventTeam.event_id)
    .or(`team1_id.eq.${eventTeam.team_id},team2_id.eq.${eventTeam.team_id}`);

  if (matchesError) throw new Error(matchesError.message);
  if ((matchCount ?? 0) > 0) {
    throw new Error('This team has event matches and cannot be removed. Disqualify it instead.');
  }

  const { error } = await supabase
    .from('event_teams')
    .delete()
    .eq('id', eventTeamId);

  if (error) {
    throw new Error(error.message);
  }

  const { data: remainingTeams, error: remainingTeamsError } = await supabase
    .from('event_teams')
    .select('id, order_index')
    .eq('event_id', eventTeam.event_id)
    .gt('order_index', eventTeam.order_index)
    .order('order_index', { ascending: true });

  if (remainingTeamsError) {
    throw new Error(remainingTeamsError.message);
  }

  if ((remainingTeams ?? []).length === 0) {
    return;
  }

  const { error: reorderError } = await supabase
    .from('event_teams')
    .upsert(
      (remainingTeams ?? []).map((team) => ({
        id: team.id,
        order_index: team.order_index - 1,
      })),
      { onConflict: 'id' }
    );

  if (reorderError) {
    throw new Error(reorderError.message);
  }
}
