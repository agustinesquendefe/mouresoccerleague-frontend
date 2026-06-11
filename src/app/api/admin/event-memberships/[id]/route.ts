import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { registerExternalPayment, type ExternalPaymentMethod } from '@/lib/externalPayments';

type Params = {
  params: Promise<{ id: string }>;
};

type RequestBody = {
  action?: 'add_payment' | 'count_game';
  amount?: number;
  method?: ExternalPaymentMethod;
  reference?: string;
  note?: string;
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
      .select(`
        amount_paid,
        appearances_count,
        event:events (
          event_price,
          membership_price
        )
      `)
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

      const method = body.method ?? 'cash';

      if (!['cash', 'zelle', 'venmo', 'cashapp'].includes(method)) {
        return NextResponse.json({ error: 'Unsupported payment method.' }, { status: 400 });
      }

      await registerExternalPayment({
        supabaseAdmin,
        membershipId,
        amount,
        method,
        source: 'admin',
        reference: body.reference,
        note: body.note,
      });

      return NextResponse.json({ ok: true });
    }

    if (body.action === 'count_game') {
      const event = Array.isArray(membership.event) ? membership.event[0] ?? null : membership.event ?? null;
      const eventPrice = Number(event?.event_price ?? event?.membership_price ?? 0);
      const amountPaid = Number(membership.amount_paid ?? 0);
      const balanceDue = Math.max(eventPrice - amountPaid, 0);

      if (balanceDue <= 0) {
        return NextResponse.json({ error: 'This player is fully paid; game count is no longer required.' }, { status: 400 });
      }

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
