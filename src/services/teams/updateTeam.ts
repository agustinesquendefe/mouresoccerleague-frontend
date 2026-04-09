import { supabase } from '@/lib/supabaseClient';
import type { Team, TeamFormData } from '@/models/team';

export async function updateTeam(
  id: number,
  payload: TeamFormData
): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .update({
      key: payload.key,
      name: payload.name,
      code: payload.code || null,
      club: payload.club,
      national: payload.national,
      logo_url: payload.logo_url ?? null,
      category_id: payload.category_id ?? null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Team;
}