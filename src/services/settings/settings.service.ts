import { supabase } from '@/lib/supabaseClient';
import type { AppSettings } from '@/models/appSettings';

export async function getAppSettings(): Promise<AppSettings | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function upsertAppSettings(payload: Partial<AppSettings>) {
  const { error } = await supabase
    .from('app_settings')
    .upsert(
      { id: 1, ...payload },
      { onConflict: 'id' }
    );

  if (error) {
    throw new Error(error.message);
  }
}