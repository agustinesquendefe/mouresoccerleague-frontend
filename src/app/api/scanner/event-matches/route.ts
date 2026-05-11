import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { getScannerMatchesForEvent } from '@/services/scanner/getScannerContext';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = Number(searchParams.get('eventId'));

    if (!Number.isFinite(eventId)) {
      return NextResponse.json({ error: 'Event ID is required.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const data = await getScannerMatchesForEvent(supabaseAdmin, eventId);

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load scanner matches.' },
      { status: 500 }
    );
  }
}