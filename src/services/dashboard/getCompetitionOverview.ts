import { supabase } from '@/lib/supabaseClient';

export type CompetitionOverviewRow = {
  label: string;
  scheduled: number;
  played: number;
};

export async function getCompetitionOverview(): Promise<CompetitionOverviewRow[]> {
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (eventError) throw new Error(eventError.message);

  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('round_number, status, stage_type')
    .eq('event_id', event.id)
    .eq('stage_type', 'league')
    .order('round_number', { ascending: true });

  if (matchesError) throw new Error(matchesError.message);

  const grouped = new Map<number, CompetitionOverviewRow>();

  (matches ?? []).forEach((match: any) => {
    const round = match.round_number ?? 0;

    if (!grouped.has(round)) {
      grouped.set(round, {
        label: `Round ${round}`,
        scheduled: 0,
        played: 0,
      });
    }

    const current = grouped.get(round)!;
    current.scheduled += 1;

    if (String(match.status ?? '').toLowerCase() === 'played') {
      current.played += 1;
    }
  });

  return Array.from(grouped.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, value]) => value);
}