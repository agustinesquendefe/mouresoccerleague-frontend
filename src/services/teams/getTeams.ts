import { supabase } from '@/lib/supabaseClient';
import type { Team } from '@/models/team';
import type { Category } from '@/models/category';

export async function getTeamsWithCategories(): Promise<(Team & { categories: Category[] })[]> {
  const { data, error } = await supabase
    .from('teams')
    .select(`*, team_categories:team_categories(*, category:categories(*))`)
    .order('id', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  // Transformar el resultado para que cada team tenga un array categories
  return (data ?? []).map((team: any) => ({
    ...team,
    categories: Array.isArray(team.team_categories)
      ? team.team_categories
          .map((tc: any) => tc.category)
          .filter((cat: Category | null) => !!cat)
      : [],
  }));
}