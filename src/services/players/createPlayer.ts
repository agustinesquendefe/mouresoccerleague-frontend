import { supabase } from '@/lib/supabaseClient';
import type { Player, PlayerFormData } from '@/models/player';

export async function createPlayer(payload: PlayerFormData): Promise<Player> {
  const { data, error } = await supabase
    .from('players')
    .insert([
      {
        first_name: payload.first_name,
        last_name: payload.last_name,
        key: payload.key,
        birth_date: payload.birth_date || null,
        jersey_number: payload.jersey_number,
        phone: payload.phone || null,
        email: payload.email || null,
        document_id: payload.document_id || null,
        is_active: payload.is_active,
        notes: payload.notes || null,
        photo_url: payload.photo_url || null,
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Player;
}