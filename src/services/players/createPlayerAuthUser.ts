import type { PlayerFormData } from '@/models/player';
import { supabase } from '@/lib/supabaseClient';

type CreatePlayerAuthUserResponse = {
  auth_user_id: string | null;
  already_exists: boolean;
};

export async function createPlayerAuthUser(
  payload: PlayerFormData,
  options: { authUserId?: string | null; previousEmail?: string | null } = {}
): Promise<CreatePlayerAuthUserResponse> {
  const email = payload.email.trim().toLowerCase();

  if (!email) {
    return {
      auth_user_id: options.authUserId ?? null,
      already_exists: false,
    };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('An administrative session is required to provision portal access.');

  const response = await fetch('/api/players/auth-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      email,
      firstName: payload.first_name,
      lastName: payload.last_name,
      authUserId: options.authUserId ?? null,
      previousEmail: options.previousEmail ?? null,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error ?? 'Failed to create player auth user.');
  }

  return data as CreatePlayerAuthUserResponse;
}
