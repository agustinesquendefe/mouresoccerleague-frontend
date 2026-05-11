import { supabase } from '@/lib/supabaseClient';

export async function getLatestPlayerDocumentId(): Promise<string | null> {
  const { data, error } = await supabase
    .from('players')
    .select('document_id')
    .not('document_id', 'is', null)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.document_id ?? null;
}
