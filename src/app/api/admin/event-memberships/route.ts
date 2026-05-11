import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getEventMemberships } from '@/services/eventMemberships/getEventMemberships';

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
    const { searchParams } = new URL(request.url);
    const eventId = Number(searchParams.get('eventId'));

    if (!Number.isFinite(eventId)) {
      return NextResponse.json({ error: 'Event ID is required.' }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();
    const data = await getEventMemberships(eventId, supabaseAdmin);

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load event memberships.' },
      { status: 500 }
    );
  }
}
