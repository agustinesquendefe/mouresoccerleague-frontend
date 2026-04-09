import { supabase } from '@/lib/supabaseClient';

export async function autoAssignGroups(eventId: number): Promise<void> {
  const { data: groups, error: groupsError } = await supabase
    .from('event_groups')
    .select('id, order_index')
    .eq('event_id', eventId)
    .order('order_index', { ascending: true });

  if (groupsError) throw new Error(groupsError.message);
  if (!groups?.length) throw new Error('No groups found. Create groups first.');

  const { data: eventTeams, error: teamsError } = await supabase
    .from('event_teams')
    .select('id')
    .eq('event_id', eventId);

  if (teamsError) throw new Error(teamsError.message);
  if (!eventTeams?.length) throw new Error('No teams found in this event.');

  // Fisher-Yates shuffle
  const ids = (eventTeams as any[]).map((et) => et.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }

  // Distribute round-robin across groups
  await Promise.all(
    ids.map((eventTeamId, index) =>
      supabase
        .from('event_teams')
        .update({ group_id: (groups as any[])[index % groups.length].id })
        .eq('id', eventTeamId)
    )
  );
}
