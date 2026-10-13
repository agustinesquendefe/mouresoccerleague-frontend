import type { SupabaseClient, User } from '@supabase/supabase-js';

type PortalRole = 'player' | 'coach' | 'referee';

type SyncPortalAuthUserParams = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: PortalRole;
  authUserId?: string | null;
  previousEmail?: string | null;
};

async function findAuthUserByEmail(client: SupabaseClient, email: string): Promise<User | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const perPage = 200;

  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);

    const match = data.users.find((user) => user.email?.trim().toLowerCase() === normalizedEmail);
    if (match) return match;
    if (data.users.length < perPage) return null;
  }

  return null;
}

export async function syncPortalAuthUser(
  client: SupabaseClient,
  params: SyncPortalAuthUserParams
) {
  const email = params.email.trim().toLowerCase();
  if (!email) throw new Error('Email is required to provision portal access.');

  const fullName = `${params.firstName ?? ''} ${params.lastName ?? ''}`.trim();
  let user: User | null = null;

  if (params.authUserId) {
    const { data, error } = await client.auth.admin.getUserById(params.authUserId);
    if (!error) user = data.user;
  }

  if (!user && params.previousEmail?.trim()) {
    user = await findAuthUserByEmail(client, params.previousEmail);
  }

  if (!user) {
    user = await findAuthUserByEmail(client, email);
  }

  if (user) {
    const { data, error } = await client.auth.admin.updateUserById(user.id, {
      email,
      email_confirm: true,
      user_metadata: {
        ...(user.user_metadata ?? {}),
        name: fullName,
        full_name: fullName,
        role: 'viewer',
        portal_role: params.role,
      },
    });

    if (error) throw new Error(error.message);

    return {
      auth_user_id: data.user.id,
      already_exists: true,
      email_updated: user.email?.trim().toLowerCase() !== email,
    };
  }

  const { data, error } = await client.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      name: fullName,
      full_name: fullName,
      role: 'viewer',
      portal_role: params.role,
    },
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error('Supabase did not return the created portal user.');

  return {
    auth_user_id: data.user.id,
    already_exists: false,
    email_updated: false,
  };
}
