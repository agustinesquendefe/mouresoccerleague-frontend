import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type RequestBody = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
};

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin credentials are not configured.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const fullName = `${body.firstName ?? ''} ${body.lastName ?? ''}`.trim();
    const supabaseAdmin = getAdminClient();

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        name: fullName,
        full_name: fullName,
        role: 'user',
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
        error: error instanceof Error ? error.message : 'Unable to create auth user.',
        step: 'auth_user_route',
      },
      { status: 500 }
    );
  }
}
