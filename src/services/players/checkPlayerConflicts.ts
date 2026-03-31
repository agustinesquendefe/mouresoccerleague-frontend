import { supabase } from '@/lib/supabaseClient';

type PlayerConflictResult = {
  keyExists: boolean;
  emailExists: boolean;
  documentExists: boolean;
};

export async function checkPlayerConflicts(
  key: string,
  email?: string,
  documentId?: string,
  excludeId?: number
): Promise<PlayerConflictResult> {
  let query = supabase
    .from('players')
    .select('id, key, email, document_id');

  const conditions: string[] = [`key.eq.${key}`];

  if (email?.trim()) {
    conditions.push(`email.eq.${email.trim()}`);
  }

  if (documentId?.trim()) {
    conditions.push(`document_id.eq.${documentId.trim()}`);
  }

  query = query.or(conditions.join(','));

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];

  return {
    keyExists: rows.some((row) => row.key === key),
    emailExists: !!email?.trim() && rows.some((row) => row.email === email.trim()),
    documentExists:
      !!documentId?.trim() &&
      rows.some((row) => row.document_id === documentId.trim()),
  };
}