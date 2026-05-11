import type { SupabaseClient } from '@supabase/supabase-js';

export type RefereePortalUser = {
  id: string;
  email: string;
  role: string | null;
  refereeId: number | null;
  refereeName: string | null;
};

export async function getRefereePortalUser(
  client: SupabaseClient,
  authorizationHeader: string | null
): Promise<RefereePortalUser> {
  const token = authorizationHeader?.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    throw new Error('Authentication token is required.');
  }

  const { data: userData, error: userError } = await client.auth.getUser(token);

  if (userError || !userData.user?.email) {
    throw new Error(userError?.message ?? 'Unable to verify referee user.');
  }

  const userId = userData.user.id;
  const email = userData.user.email;

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('role, full_name')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { data: referee, error: refereeError } = await client
    .from('referees')
    .select('id, first_name, last_name, email')
    .ilike('email', email)
    .maybeSingle();

  if (refereeError) {
    throw new Error(refereeError.message);
  }

  const refereeName = referee
    ? `${referee.first_name ?? ''} ${referee.last_name ?? ''}`.trim()
    : profile?.full_name ?? email;
  const role = profile?.role === 'admin' ? 'admin' : 'referee';

  if (profile?.role !== 'admin' && !referee) {
    throw new Error('No referee profile is linked to this email.');
  }

  return {
    id: userId,
    email,
    role,
    refereeId: referee ? Number(referee.id) : null,
    refereeName,
  };
}
