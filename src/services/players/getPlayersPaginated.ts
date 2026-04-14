import { supabase } from '@/lib/supabaseClient';
import type { Player } from '@/models/player';

type Params = {
  page: number;
  pageSize: number;
  search: string;
};

export async function getPlayersPaginated({
  page,
  pageSize,
  search,
}: Params): Promise<{ rows: Player[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('players')
    .select('*', { count: 'exact' })
    .order('document_id', { ascending: true })
    .range(from, to);

  if (search.trim()) {
    const q = search.trim();
    query = query.or(
      `document_id.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return {
    rows: (data ?? []) as Player[],
    count: count ?? 0,
  };
}