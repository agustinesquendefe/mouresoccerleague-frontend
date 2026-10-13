import type { SupabaseClient } from '@supabase/supabase-js';

export class AdministrativeAccessError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdministrativeAccessError';
    this.status = status;
  }
}

export async function requireAdministrativeUser(client: SupabaseClient, request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    throw new AdministrativeAccessError('Authentication is required.', 401);
  }

  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) {
    throw new AdministrativeAccessError('Invalid administrative session.', 401);
  }

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  if (profile?.role !== 'admin' && profile?.role !== 'editor') {
    throw new AdministrativeAccessError('Administrative access is required.', 403);
  }

  return userData.user;
}

export function getAdministrativeErrorStatus(error: unknown) {
  return error instanceof AdministrativeAccessError ? error.status : 500;
}
