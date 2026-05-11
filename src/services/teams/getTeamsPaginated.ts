import { supabase } from '@/lib/supabaseClient';
import type { Category } from '@/models/category';
import type { Team } from '@/models/team';

type Params = {
  page: number;
  pageSize: number;
  search: string;
};

type TeamWithCategories = Team & { categories: Category[] };

function mapTeamCategories(team: any): TeamWithCategories {
  return {
    ...team,
    categories: Array.isArray(team.team_categories)
      ? team.team_categories
          .map((teamCategory: any) => teamCategory.category)
          .filter((category: Category | null) => !!category)
      : [],
  };
}

async function getTeamIdsByCategory(search: string): Promise<number[]> {
  const term = search.trim();

  if (!term) return [];

  const { data, error } = await supabase
    .from('team_categories')
    .select('team_id, category:categories!inner(name)')
    .ilike('category.name', `%${term}%`);

  if (error) {
    throw new Error(error.message);
  }

  return Array.from(new Set((data ?? []).map((row: any) => Number(row.team_id))));
}

export async function getTeamsPaginated({
  page,
  pageSize,
  search,
}: Params): Promise<{ rows: TeamWithCategories[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const term = search.trim();

  let categoryTeamIds: number[] = [];

  if (term) {
    categoryTeamIds = await getTeamIdsByCategory(term);
  }

  let query = supabase
    .from('teams')
    .select('*, team_categories:team_categories(*, category:categories(*))', {
      count: 'exact',
    })
    .order('id', { ascending: true })
    .range(from, to);

  if (term) {
    const conditions = [`name.ilike.%${term}%`, `code.ilike.%${term}%`];

    if (categoryTeamIds.length > 0) {
      conditions.push(`id.in.(${categoryTeamIds.join(',')})`);
    }

    query = query.or(conditions.join(','));
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return {
    rows: (data ?? []).map(mapTeamCategories),
    count: count ?? 0,
  };
}
