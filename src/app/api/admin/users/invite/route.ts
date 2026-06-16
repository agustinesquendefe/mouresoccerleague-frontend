import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import type { ProfileFormData } from '@/models/profile';

type RequestBody = {
  email?: string;
  fullName?: string;
  role?: ProfileFormData['role'];
};

const ALLOWED_ROLES = new Set<ProfileFormData['role']>(['admin', 'editor', 'referee', 'viewer']);

function getPublicOrigin(request: Request) {
  const configuredOrigin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.APP_URL ||
    process.env.APP_BASE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;

  if (configuredOrigin) {
    return (configuredOrigin.startsWith('http') ? configuredOrigin : `https://${configuredOrigin}`).replace(/\/$/, '');
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || request.headers.get('host');

  if (host && !host.includes('localhost')) {
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    return `${protocol}://${host}`.replace(/\/$/, '');
  }

  return (request.headers.get('origin') ?? new URL(request.url).origin).replace(/\/$/, '');
}

function getDefaultName(email: string) {
  return email.split('@')[0]?.replace(/[._-]+/g, ' ').trim() || email;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const email = body.email?.trim().toLowerCase();
    const role = body.role && ALLOWED_ROLES.has(body.role) ? body.role : 'admin';
    const fullName = body.fullName?.trim() || (email ? getDefaultName(email) : '');

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const redirectTo = `${getPublicOrigin(request)}/authentication/callback`;
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        full_name: fullName,
        role,
      },
    });

    if (error) throw new Error(error.message);

    const userId = data.user?.id;

    if (!userId) {
      throw new Error('Supabase did not return an invited user.');
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: userId,
          email,
          full_name: fullName,
          role,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (profileError) throw new Error(profileError.message);

    return NextResponse.json({ ok: true, userId, redirectTo });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to invite user.' },
      { status: 500 }
    );
  }
}
