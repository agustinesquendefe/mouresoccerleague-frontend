import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { getRefereePortalUser } from '@/services/refereePortal/auth';
import {
  buildRefereeScannerContext,
  getRefereeAssignedMatches,
} from '@/services/refereePortal/getRefereeAssignedMatches';

export async function GET(request: Request) {
  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const portalUser = await getRefereePortalUser(supabaseAdmin, request.headers.get('authorization'));
    const matches = await getRefereeAssignedMatches(
      supabaseAdmin,
      portalUser.role === 'admin' ? null : portalUser.refereeId
    );

    return NextResponse.json({
      data: {
        user: portalUser,
        context: buildRefereeScannerContext(matches),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load referee scanner context.' },
      { status: 500 }
    );
  }
}
