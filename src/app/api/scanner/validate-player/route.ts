import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import type { ScannerValidationRequest } from '@/models/scanner';
import { validatePlayerBarcode } from '@/services/scanner/validatePlayerBarcode';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ScannerValidationRequest;
    const supabaseAdmin = createSupabaseAdminClient();
    const data = await validatePlayerBarcode(supabaseAdmin, body);

    return NextResponse.json({ data }, { status: data.approved ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to validate player barcode.',
      },
      { status: 500 }
    );
  }
}