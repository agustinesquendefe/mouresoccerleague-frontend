import { supabase } from '@/lib/supabaseClient';
import type { Team, TeamFormData } from '@/models/team';
import type { Category } from '@/models/category';

export async function createTeam(payload: TeamFormData & { category_ids?: number[]; playing_days?: number[] }): Promise<Team> {
  // Crear el equipo
  const { data, error } = await supabase
    .from('teams')
    .insert([
      {
        key: payload.key,
        name: payload.name,
        code: payload.code || null,
        club: payload.club,
        national: payload.national,
        logo_url: payload.logo_url ?? null,
      },
    ])
    .select()
    .single();

  if (error) throw new Error(error.message);
  const team = data as Team;

  // Insertar categorías en la tabla intermedia
  if (payload.category_ids && payload.category_ids.length > 0) {
    const inserts = payload.category_ids.map((category_id) => ({
      team_id: team.id,
      category_id,
    }));
    const { error: catError } = await supabase
      .from('team_categories')
      .insert(inserts);
    if (catError) throw new Error(catError.message);
  }

  if (payload.playing_days && payload.playing_days.length > 0) {
    const inserts = payload.playing_days.map((day_of_week) => ({
      team_id: team.id,
      day_of_week,
    }));
    const { error: daysError } = await supabase
      .from('team_playing_days')
      .insert(inserts);
    if (daysError) throw new Error(daysError.message);
  }

  return team;
}
