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

  let fixtureStartRound: number | undefined;
  if (status === 'active') {
    const { data: startedMatches, error: startedMatchesError } = await supabase
      .from('matches')
      .select('round_number, status, score1, score2')
      .eq('event_id', eventId)
      .or('stage_type.eq.league,stage_type.is.null');
    if (startedMatchesError) throw new Error(startedMatchesError.message);
    fixtureStartRound = Math.max(0, ...(startedMatches ?? [])
      .filter((match) =>
        match.status !== 'cancelled' && (
          match.status === 'played' ||
          match.status === 'in_progress' ||
          match.score1 != null ||
          match.score2 != null))
      .map((match) => Number(match.round_number) || 0)) + 1;
  }

  const { data, error } = await supabase
    .from('event_teams')
    .update({
      status,
      ...(fixtureStartRound == null ? {} : { fixture_start_round: fixtureStartRound }),
    })
    .eq('id', eventTeamId)
    .eq('event_id', eventId)
    .select('id, event_id, team_id, status, fixture_start_round')
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

  const { error: pendingError } = await supabase
    .from('fixture_pending_assignments')
    .update({ status: 'cancelled' })
    .eq('event_id', eventId)
    .eq('event_team_id', eventTeamId)
    .eq('status', 'pending');
  if (pendingError) throw new Error(pendingError.message);

  return { ...data, cancelled_match_count: cancelledMatches?.length ?? 0 };
}
