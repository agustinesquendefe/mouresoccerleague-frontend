import { supabase } from '@/lib/supabaseClient';
import type { Team } from '@/models/team';
import type { Category } from '@/models/category';

export async function getTeamsWithCategories(): Promise<(Team & { categories: Category[]; playing_days: number[] })[]> {
  const { data, error } = await supabase
    .from('teams')
    .select(`*, team_categories:team_categories(*, category:categories(*)), team_playing_days(day_of_week)`)
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
    playing_days: Array.isArray(team.team_playing_days)
      ? team.team_playing_days.map((row: any) => Number(row.day_of_week)).sort((a: number, b: number) => a - b)
      : [],
  }));
}
