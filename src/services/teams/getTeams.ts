import { supabase } from '@/lib/supabaseClient';
import { Team } from '@/models/team';

export async function getTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Team[];
}