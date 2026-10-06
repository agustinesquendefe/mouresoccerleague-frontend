import { supabase } from '@/lib/supabaseClient';
import type { Event, EventFormatType, EventStatus } from '@/models/event';

export type EventListRow = Event & {
  season_name: string | null;
  category_name: string | null;
};

type Params = {
  page: number;
  pageSize: number;
  search?: string;
  categoryId?: number | null;
  seasonId?: number | null;
  dayOfWeek?: number | null;
  status?: EventStatus | null;
  formatType?: EventFormatType | null;
};

async function getMatchingLookupIds(
  table: 'categories' | 'seasons',
  search: string
): Promise<number[]> {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .ilike('name', `%${search}%`);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row: { id: number }) => Number(row.id));
}

export async function getEventsPaginated({
  page,
  pageSize,
  search = '',
  categoryId = null,
  seasonId = null,
  dayOfWeek = null,
  status = null,
  formatType = null,
}: Params): Promise<{ rows: EventListRow[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;
  const term = search.trim();

  const [matchingCategoryIds, matchingSeasonIds] = term
    ? await Promise.all([
        getMatchingLookupIds('categories', term),
        getMatchingLookupIds('seasons', term),
      ])
    : [[], []];

  let query = supabase
    .from('events')
    .select('*', { count: 'exact' })
    .order('id', { ascending: true })
    .range(from, to);

  if (categoryId !== null) query = query.eq('category_id', categoryId);
  if (seasonId !== null) query = query.eq('season_id', seasonId);
  if (dayOfWeek !== null) query = query.eq('match_day_of_week', dayOfWeek);
  if (status !== null) query = query.eq('status', status);
  if (formatType !== null) query = query.eq('format_type', formatType);

  if (term) {
    const conditions = [`name.ilike.%${term}%`, `key.ilike.%${term}%`];

    if (matchingCategoryIds.length > 0) {
      conditions.push(`category_id.in.(${matchingCategoryIds.join(',')})`);
    }
    if (matchingSeasonIds.length > 0) {
      conditions.push(`season_id.in.(${matchingSeasonIds.join(',')})`);
    }

    query = query.or(conditions.join(','));
  }

  const { data, error, count } = await query;

  if (error) throw new Error(error.message);

  const events = (data ?? []) as Event[];
  const categoryIds = Array.from(
    new Set(events.flatMap((event) => (event.category_id === null ? [] : [event.category_id])))
  );
  const seasonIds = Array.from(new Set(events.map((event) => event.season_id)));

  const [{ data: categories, error: categoriesError }, { data: seasons, error: seasonsError }] =
    await Promise.all([
      categoryIds.length > 0
        ? supabase.from('categories').select('id, name').in('id', categoryIds)
        : Promise.resolve({ data: [], error: null }),
      seasonIds.length > 0
        ? supabase.from('seasons').select('id, name').in('id', seasonIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (categoriesError) throw new Error(categoriesError.message);
  if (seasonsError) throw new Error(seasonsError.message);

  const categoryNames = new Map(
    (categories ?? []).map((category: { id: number; name: string }) => [category.id, category.name])
  );
  const seasonNames = new Map(
    (seasons ?? []).map((season: { id: number; name: string }) => [season.id, season.name])
  );

  return {
    rows: events.map((event) => ({
      ...event,
      category_name:
        event.category_id === null ? null : (categoryNames.get(event.category_id) ?? null),
      season_name: seasonNames.get(event.season_id) ?? null,
    })),
    count: count ?? 0,
  };
}
