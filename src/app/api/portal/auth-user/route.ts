import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import {
  getAdministrativeErrorStatus,
  requireAdministrativeUser,
} from '@/services/auth/requireAdministrativeUser';
import { syncPortalAuthUser } from '@/services/auth/syncPortalAuthUser';

type PortalRole = 'player' | 'coach' | 'referee';

type RequestBody = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: PortalRole;
  authUserId?: string | null;
  previousEmail?: string | null;
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

    const supabaseAdmin = createSupabaseAdminClient();
    await requireAdministrativeUser(supabaseAdmin, request);
    const result = await syncPortalAuthUser(supabaseAdmin, {
      email,
      firstName: body.firstName,
      lastName: body.lastName,
      role,
      authUserId: body.authUserId,
      previousEmail: body.previousEmail,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to create portal auth user.',
        step: 'portal_auth_user_route',
      },
      { status: getAdministrativeErrorStatus(error) }
    );
  }
}
