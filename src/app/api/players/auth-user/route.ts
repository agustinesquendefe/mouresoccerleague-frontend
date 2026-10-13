import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import {
  getAdministrativeErrorStatus,
  requireAdministrativeUser,
} from '@/services/auth/requireAdministrativeUser';
import { syncPortalAuthUser } from '@/services/auth/syncPortalAuthUser';

type RequestBody = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  authUserId?: string | null;
  previousEmail?: string | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    await requireAdministrativeUser(supabaseAdmin, request);
    const result = await syncPortalAuthUser(supabaseAdmin, {
      email,
      firstName: body.firstName,
      lastName: body.lastName,
      role: 'player',
      authUserId: body.authUserId,
      previousEmail: body.previousEmail,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to create auth user.',
        step: 'auth_user_route',
      },
      { status: getAdministrativeErrorStatus(error) }
    );
  }
}
