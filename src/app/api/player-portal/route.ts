import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPlayerPortalData } from '@/services/playerPortal';

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

export async function GET(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
    }

    const supabaseAdmin = getAdminClient();
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user?.email) {
      return NextResponse.json({ error: 'Invalid player session.' }, { status: 401 });
    }

    const portalData = await getPlayerPortalData(data.user.email, supabaseAdmin);

    return NextResponse.json({ data: portalData });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load player portal.' },
      { status: 500 }
    );
  }
}
