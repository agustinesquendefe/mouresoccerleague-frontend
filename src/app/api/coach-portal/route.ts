import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { getCoachPortalData } from '@/services/coachPortal';

export async function GET(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user?.email) {
      return NextResponse.json({ error: 'Invalid coach session.' }, { status: 401 });
    }

    const data = await getCoachPortalData(supabaseAdmin, {
      id: userData.user.id,
      email: userData.user.email,
    });

    if (!data) {
      return NextResponse.json({ error: 'No active coach profile is linked to this account.' }, { status: 403 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load coach portal.' },
      { status: 500 }
    );
  }
}
