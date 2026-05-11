import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type Params = {
  params: Promise<{ id: string }>;
};

type RequestBody = {
  action?: 'add_payment' | 'count_game';
  amount?: number;
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

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const membershipId = Number(id);

    if (!Number.isFinite(membershipId)) {
      return NextResponse.json({ error: 'Membership ID is required.' }, { status: 400 });
    }

    const body = (await request.json()) as RequestBody;
    const supabaseAdmin = getAdminClient();

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('event_memberships')
      .select('amount_paid, appearances_count')
      .eq('id', membershipId)
      .single();

    if (membershipError) throw new Error(membershipError.message);

    if (body.action === 'add_payment') {
      const amount = Number(body.amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json(
          { error: 'Payment amount must be greater than zero.' },
          { status: 400 }
        );
      }

      const { error: updateError } = await supabaseAdmin
        .from('event_memberships')
        .update({
          amount_paid: Number(membership.amount_paid ?? 0) + amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', membershipId);

      if (updateError) throw new Error(updateError.message);

      return NextResponse.json({ ok: true });
    }

    if (body.action === 'count_game') {
      const { error: updateError } = await supabaseAdmin
        .from('event_memberships')
        .update({
          appearances_count: Number(membership.appearances_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', membershipId);

      if (updateError) throw new Error(updateError.message);

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update event membership.' },
      { status: 500 }
    );
  }
}
