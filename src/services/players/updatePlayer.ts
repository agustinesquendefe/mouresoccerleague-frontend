import { supabase } from '@/lib/supabaseClient';
import type { Player, PlayerFormData } from '@/models/player';
import { createPlayerAuthUser } from './createPlayerAuthUser';

export async function updatePlayer(
  id: number,
  payload: PlayerFormData
): Promise<Player> {
  const { data: currentPlayer, error: currentPlayerError } = await supabase
    .from('players')
    .select('auth_user_id')
    .eq('id', id)
    .maybeSingle();

  if (currentPlayerError) {
    throw new Error(currentPlayerError.message);
  }

  const authUser = currentPlayer?.auth_user_id
    ? { auth_user_id: currentPlayer.auth_user_id }
    : await createPlayerAuthUser(payload);

  const { data, error } = await supabase
    .from('players')
    .update({
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
      auth_user_id: authUser.auth_user_id || currentPlayer?.auth_user_id || null,
      registered_at: payload.registered_at || null,
      signature: payload.signature || null,
      we_have_id: typeof payload.we_have_id === 'boolean' ? payload.we_have_id : false,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Player;
}
