import { supabase } from '@/lib/supabaseClient';

type EventConflictResult = {
  nameExists: boolean;
  keyExists: boolean;
};

export async function checkEventConflicts(
  name: string,
  key: string,
  excludeId?: number
): Promise<EventConflictResult> {
  let query = supabase
    .from('events')
    .select('id, name, key')
    .or(`name.eq.${name},key.eq.${key}`);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  const rows = data ?? [];

  return {
    nameExists: rows.some((row) => row.name === name),
    keyExists: rows.some((row) => row.key === key),
  };
}