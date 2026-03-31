import { supabase } from '@/lib/supabaseClient';

export type DashboardSummary = {
  totalTeams: number;
  totalFields: number;
  totalEvents: number;
  totalMatches: number;
  playedMatches: number;
  pendingMatches: number;
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [
    { count: totalTeams, error: teamsError },
    { count: totalFields, error: fieldsError },
    { count: totalEvents, error: eventsError },
    { data: matches, error: matchesError },
  ] = await Promise.all([
    supabase.from('teams').select('*', { count: 'exact', head: true }),
    supabase.from('fields').select('*', { count: 'exact', head: true }),
    supabase.from('events').select('*', { count: 'exact', head: true }),
    supabase.from('matches').select('status'),
  ]);

  if (teamsError) throw new Error(teamsError.message);
  if (fieldsError) throw new Error(fieldsError.message);
  if (eventsError) throw new Error(eventsError.message);
  if (matchesError) throw new Error(matchesError.message);

  const totalMatches = matches?.length ?? 0;
  const playedMatches =
    matches?.filter((match) => String(match.status ?? '').toLowerCase() === 'played')
      .length ?? 0;

  return {
    totalTeams: totalTeams ?? 0,
    totalFields: totalFields ?? 0,
    totalEvents: totalEvents ?? 0,
    totalMatches,
    playedMatches,
    pendingMatches: totalMatches - playedMatches,
  };
}