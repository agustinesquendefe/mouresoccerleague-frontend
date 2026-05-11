import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';

type PortalRole = 'player' | 'coach' | 'referee';

type RequestBody = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: PortalRole;
};

const ALLOWED_ROLES = new Set<PortalRole>(['player', 'coach', 'referee']);

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const email = body.email?.trim().toLowerCase();
    const role = body.role;

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: 'A valid portal role is required.' }, { status: 400 });
    }

    const fullName = `${body.firstName ?? ''} ${body.lastName ?? ''}`.trim();
    const supabaseAdmin = createSupabaseAdminClient();

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        name: fullName,
        full_name: fullName,
        role: 'viewer',
        portal_role: role,
      },
    });

    if (error) {
      const alreadyRegistered =
        error.message.toLowerCase().includes('already') ||
        error.message.toLowerCase().includes('registered') ||
        error.status === 422;

      if (alreadyRegistered) {
        return NextResponse.json({
          auth_user_id: null,
          already_exists: true,
        });
      }

      return NextResponse.json(
        {
          error: error.message,
          step: 'create_auth_user',
          status: error.status,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      auth_user_id: data.user?.id ?? null,
      already_exists: false,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to create portal auth user.',
        step: 'portal_auth_user_route',
      },
      { status: 500 }
    );
  }
}
