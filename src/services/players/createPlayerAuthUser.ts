import type { PlayerFormData } from '@/models/player';

type CreatePlayerAuthUserResponse = {
  auth_user_id: string | null;
  already_exists: boolean;
};

export async function createPlayerAuthUser(
  payload: PlayerFormData
): Promise<CreatePlayerAuthUserResponse> {
  const email = payload.email.trim().toLowerCase();

  if (!email) {
    return {
      auth_user_id: null,
      already_exists: false,
    };
  }

  const response = await fetch('/api/players/auth-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      firstName: payload.first_name,
      lastName: payload.last_name,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error ?? 'Failed to create player auth user.');
  }

  return data as CreatePlayerAuthUserResponse;
}
