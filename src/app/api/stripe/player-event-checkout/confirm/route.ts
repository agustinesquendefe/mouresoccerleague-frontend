import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getStripeSecretKey() {
  return process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
}

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

export async function POST(request: Request) {
  try {
    const secretKey = getStripeSecretKey();

    if (!secretKey) {
      return NextResponse.json(
        { error: 'Stripe secret key is not configured.' },
        { status: 500 }
      );
    }

    const { sessionId } = (await request.json()) as { sessionId?: string };

    if (!sessionId) {
      return NextResponse.json({ error: 'Checkout session ID is required.' }, { status: 400 });
    }

    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
    }

    const response = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      {
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );
    const session = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: session?.error?.message ?? 'Unable to verify checkout session.' },
        { status: 500 }
      );
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ paid: false });
    }

    const membershipId = Number(session.metadata?.membership_id);
    const playerId = Number(session.metadata?.player_id);
    const amountPaid = Number(session.metadata?.payment_amount ?? Number(session.amount_total ?? 0) / 100);
    const eventPrice = Number(session.metadata?.event_price);
    const balanceDueBeforePayment = Number(session.metadata?.balance_due_before_payment);

    if (
      !Number.isFinite(membershipId) ||
      !Number.isFinite(playerId) ||
      !Number.isFinite(amountPaid) ||
      !Number.isFinite(eventPrice) ||
      !Number.isFinite(balanceDueBeforePayment) ||
      amountPaid <= 0
    ) {
      return NextResponse.json({ error: 'Invalid checkout session metadata.' }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user?.email) {
      return NextResponse.json({ error: 'Invalid player session.' }, { status: 401 });
    }

    const { data: player, error: playerError } = await supabaseAdmin
      .from('players')
      .select('id')
      .ilike('email', userData.user.email.trim().toLowerCase())
      .eq('is_active', true)
      .maybeSingle();

    if (playerError) throw new Error(playerError.message);

    if (!player || player.id !== playerId) {
      return NextResponse.json({ error: 'Checkout session does not belong to this player.' }, { status: 403 });
    }

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('event_memberships')
      .select('amount_paid')
      .eq('id', membershipId)
      .single();

    if (membershipError) throw new Error(membershipError.message);

    const currentAmount = Number(membership.amount_paid ?? 0);
    const amountPaidBeforeCheckout = Math.max(eventPrice - balanceDueBeforePayment, 0);
    const expectedAmountPaid = amountPaidBeforeCheckout + amountPaid;

    const { error: updateError } = await supabaseAdmin
      .from('event_memberships')
      .update({
        amount_paid: Math.max(currentAmount, expectedAmountPaid),
        updated_at: new Date().toISOString(),
      })
      .eq('id', membershipId);

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ paid: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to confirm checkout session.' },
      { status: 500 }
    );
  }
}
