import { supabase } from '@/lib/supabaseClient';

export type PlayoffGenerationCheck = {
  canGenerate: boolean;
  reason: string | null;
};

export async function canGeneratePlayoffs(
  eventId: number
): Promise<PlayoffGenerationCheck> {
  if (!Number.isFinite(eventId)) {
    throw new Error('Invalid event id');
  }

  const { data: leagueMatches, error: leagueMatchesError } = await supabase
    .from('matches')
    .select('id, status, stage_type')
    .eq('event_id', eventId)
    .or('stage_type.eq.league,stage_type.is.null');

  if (leagueMatchesError) {
    throw new Error(leagueMatchesError.message);
  }

  const leagueRows = leagueMatches ?? [];

  if (leagueRows.length === 0) {
    return {
      canGenerate: false,
      reason: 'This event has no league matches yet.',
    };
  }

  const pendingLeagueMatches = leagueRows.filter(
    (match) => String(match.status ?? '').toLowerCase() !== 'played'
  );

  if (pendingLeagueMatches.length > 0) {
    return {
      canGenerate: false,
      reason: `There are still ${pendingLeagueMatches.length} league matches pending.`,
    };
  }

  const { data: knockoutMatches, error: knockoutMatchesError } = await supabase
    .from('matches')
    .select('id')
    .eq('event_id', eventId)
    .eq('stage_type', 'knockout')
    .limit(1);

  if (knockoutMatchesError) {
    throw new Error(knockoutMatchesError.message);
  }

  if (knockoutMatches && knockoutMatches.length > 0) {
    return {
      canGenerate: false,
      reason: 'Playoff matches have already been generated for this event.',
    };
  }

  return {
    canGenerate: true,
    reason: null,
  };
}