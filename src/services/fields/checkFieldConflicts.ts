import { supabase } from '@/lib/supabaseClient';

type FieldConflictResult = {
  nameExists: boolean;
  keyExists: boolean;
};

export async function checkFieldConflicts(
  name: string,
  key: string,
  excludeId?: number
): Promise<FieldConflictResult> {
  let query = supabase
    .from('fields')
    .select('id, name, key')
    .or(`name.eq.${name},key.eq.${key}`);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];

  return {
    nameExists: rows.some((row) => row.name === name),
    keyExists: rows.some((row) => row.key === key),
  };
}