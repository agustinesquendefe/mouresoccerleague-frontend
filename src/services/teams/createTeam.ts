import { supabase } from '@/lib/supabaseClient';
import type { Team, TeamFormData } from '@/models/team';

export async function createTeam(payload: TeamFormData): Promise<Team> {
  const { data, error } = await supabase
    .from('teams')
    .insert([
      {
        key: payload.key,
        name: payload.name,
        code: payload.code || null,
        club: payload.club,
        national: payload.national,
      },
    ])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Team;
}