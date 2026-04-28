import { supabase } from '@/lib/supabaseClient';
import type { Team, TeamFormData } from '@/models/team';
import type { Category } from '@/models/category';

export async function updateTeam(
  id: number,
  payload: TeamFormData & { category_ids?: number[] }
): Promise<Team> {
  // Actualizar datos del equipo
  const { data, error } = await supabase
    .from('teams')
    .update({
      key: payload.key,
      name: payload.name,
      code: payload.code || null,
      club: payload.club,
      national: payload.national,
      logo_url: payload.logo_url ?? null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  const team = data as Team;

  // Actualizar categorías en la tabla intermedia
  if (payload.category_ids) {
    // Eliminar las relaciones actuales
    await supabase.from('team_categories').delete().eq('team_id', id);
    // Insertar las nuevas
    if (payload.category_ids.length > 0) {
      const inserts = payload.category_ids.map((category_id) => ({
        team_id: id,
        category_id,
      }));
      const { error: catError } = await supabase
        .from('team_categories')
        .insert(inserts);
      if (catError) throw new Error(catError.message);
    }
  }

  return team;
}