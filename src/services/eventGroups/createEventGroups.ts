import { supabase } from '@/lib/supabaseClient';
import type { EventGroup } from '@/models/eventGroup';

const GROUP_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export async function createEventGroups(eventId: number, groupCount: number): Promise<EventGroup[]> {
  // Delete existing groups (cascade will clear group_id on event_teams/matches)
  await supabase.from('event_groups').delete().eq('event_id', eventId);

  const toInsert = Array.from({ length: groupCount }, (_, i) => ({
    event_id: eventId,
    name: `Group ${GROUP_LETTERS[i] ?? String.fromCharCode(65 + i)}`,
    order_index: i,
  }));

  const { data, error } = await supabase
    .from('event_groups')
    .insert(toInsert)
    .select();

  if (error) throw new Error(error.message);
  return (data ?? []) as EventGroup[];
}
