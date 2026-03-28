import { supabase } from '@/lib/supabaseClient';

type TeamConflicts = {
  nameExists: boolean;
  keyExists: boolean;
  codeExists: boolean;
};

export async function checkTeamConflicts(
  name: string,
  key: string,
  code: string,
  excludeId?: number
): Promise<TeamConflicts> {
  let query = supabase
    .from('teams')
    .select('id, name, key, code')
    .or(`name.eq.${name},key.eq.${key},code.eq.${code}`);

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
    codeExists: rows.some((row) => row.code === code),
  };
}