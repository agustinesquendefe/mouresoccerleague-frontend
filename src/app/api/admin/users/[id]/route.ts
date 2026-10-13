import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import {
  getAdministrativeErrorStatus,
  requireAdministrativeUser,
} from '@/services/auth/requireAdministrativeUser';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    await requireAdministrativeUser(supabaseAdmin, request);

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileError) throw new Error(profileError.message);

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) throw new Error(authError.message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to delete user.' },
      { status: getAdministrativeErrorStatus(error) }
    );
  }
}
