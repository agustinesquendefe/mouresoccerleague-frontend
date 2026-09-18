import { supabase } from '@/lib/supabaseClient';
import type { EventTeamStatus } from '@/models/eventTeam';

export async function updateEventTeamStatus(
  eventId: number,
  eventTeamId: number,
  status: EventTeamStatus
) {
  const { data: currentEventTeam, error: currentEventTeamError } = await supabase
    .from('event_teams')
    .select('id, event_id, team_id, status')
    .eq('id', eventTeamId)
    .eq('event_id', eventId)
    .single();

  if (currentEventTeamError) throw new Error(currentEventTeamError.message);

  const { data, error } = await supabase
    .from('event_teams')
    .update({ status })
    .eq('id', eventTeamId)
    .eq('event_id', eventId)
    .select('id, event_id, team_id, status')
    .single();

  if (error) throw new Error(error.message);

  if (status !== 'disqualified') {
    return { ...data, cancelled_match_count: 0 };
  }

  const { data: cancelledMatches, error: matchesError } = await supabase
    .from('matches')
    .update({ status: 'cancelled' })
    .eq('event_id', eventId)
    .eq('status', 'scheduled')
    .or(`team1_id.eq.${currentEventTeam.team_id},team2_id.eq.${currentEventTeam.team_id}`)
    .select('id');

  if (matchesError) {
    // Avoid leaving the team disqualified while its future matches remain active.
    await supabase
      .from('event_teams')
      .update({ status: currentEventTeam.status })
      .eq('id', eventTeamId)
      .eq('event_id', eventId);
    throw new Error(matchesError.message);
  }

  return { ...data, cancelled_match_count: cancelledMatches?.length ?? 0 };
}
