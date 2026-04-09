import { supabase } from '@/lib/supabaseClient';
import type { EventGroupWithTeams } from '@/models/eventGroup';

export async function getEventGroups(eventId: number): Promise<EventGroupWithTeams[]> {
  const { data: groups, error: groupsError } = await supabase
    .from('event_groups')
    .select('id, event_id, name, order_index, created_at, updated_at')
    .eq('event_id', eventId)
    .order('order_index', { ascending: true });

  if (groupsError) throw new Error(groupsError.message);
  if (!groups?.length) return [];

  const { data: eventTeams, error: teamsError } = await supabase
    .from('event_teams')
    .select('id, team_id, group_id, teams(name)')
    .eq('event_id', eventId);

  if (teamsError) throw new Error(teamsError.message);

  const teamsByGroup = new Map<number, Array<{ event_team_id: number; team_id: number; team_name: string }>>();

  ((eventTeams ?? []) as any[]).forEach((et) => {
    if (et.group_id === null || et.group_id === undefined) return;
    if (!teamsByGroup.has(et.group_id)) teamsByGroup.set(et.group_id, []);
    const team = Array.isArray(et.teams) ? et.teams[0] : et.teams;
    teamsByGroup.get(et.group_id)!.push({
      event_team_id: et.id,
      team_id: et.team_id,
      team_name: team?.name ?? `#${et.team_id}`,
    });
  });

  return (groups as any[]).map((g) => ({
    ...g,
    teams: teamsByGroup.get(g.id) ?? [],
  }));
}
