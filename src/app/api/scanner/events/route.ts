import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { getScannerEventOptions } from '@/services/scanner/getScannerContext';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() ?? '';
    const supabaseAdmin = createSupabaseAdminClient();
    const data = await getScannerEventOptions(supabaseAdmin, search, 20);

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to search scanner events.' },
      { status: 500 }
    );
  }
}
