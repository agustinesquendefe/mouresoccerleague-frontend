import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculatePaymentFees, getPaymentFeeSettings } from '@/lib/paymentFees';

type RequestBody = {
  eventId?: number;
  amount?: number;
};

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

async function stripeRequest<T>(
  path: string,
  body: URLSearchParams,
  secretKey: string
): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message ?? 'Stripe checkout request failed.');
  }

  return data as T;
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

    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
    }

    const body = (await request.json()) as RequestBody;
    const eventId = Number(body.eventId);
    const requestedAmount = Number(body.amount);

    if (!Number.isFinite(eventId)) {
      return NextResponse.json({ error: 'Event ID is required.' }, { status: 400 });
    }

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return NextResponse.json(
        { error: 'Payment amount must be greater than zero.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getAdminClient();
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user?.email) {
      return NextResponse.json({ error: 'Invalid player session.' }, { status: 401 });
    }

    const email = userData.user.email.trim().toLowerCase();

    const [{ data: player, error: playerError }, { data: event, error: eventError }] =
      await Promise.all([
        supabaseAdmin
          .from('players')
          .select('id, email')
          .ilike('email', email)
          .eq('is_active', true)
          .maybeSingle(),
        supabaseAdmin
          .from('events')
          .select('id, name, event_price, membership_price, stripe_price_id')
          .eq('id', eventId)
          .single(),
      ]);

    if (playerError) throw new Error(playerError.message);
    if (eventError) throw new Error(eventError.message);

    if (!player) {
      return NextResponse.json({ error: 'Player profile not found.' }, { status: 404 });
    }

    const eventPrice = Number(event.event_price ?? event.membership_price ?? 0);

    if (eventPrice <= 0) {
      return NextResponse.json(
        { error: 'This event does not have a valid price configured.' },
        { status: 400 }
      );
    }

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('event_memberships')
      .upsert(
        {
          event_id: eventId,
          player_id: player.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'event_id,player_id' }
      )
      .select('id, amount_paid')
      .single();

    if (membershipError) throw new Error(membershipError.message);

    const amountPaid = Number(membership.amount_paid ?? 0);
    const balanceDue = Math.max(eventPrice - amountPaid, 0);

    if (balanceDue <= 0) {
      return NextResponse.json({ error: 'This event is already paid.' }, { status: 400 });
    }

    if (requestedAmount > balanceDue) {
      return NextResponse.json(
        { error: `Payment amount cannot be greater than the balance due of $${balanceDue.toFixed(2)}.` },
        { status: 400 }
      );
    }

    const feeSettings = await getPaymentFeeSettings(supabaseAdmin);
    const feeBreakdown = calculatePaymentFees(requestedAmount, feeSettings);
    const origin = request.headers.get('origin') ?? new URL(request.url).origin;
    const checkoutBody = new URLSearchParams({
      mode: 'payment',
      success_url: `${origin}/player-portal?checkout_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/player-portal`,
      customer_email: email,
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': String(Math.round(feeBreakdown.baseAmount * 100)),
      'line_items[0][price_data][product_data][name]': event.name || `Event #${eventId}`,
      'line_items[0][quantity]': '1',
      'metadata[event_id]': String(eventId),
      'metadata[player_id]': String(player.id),
      'metadata[membership_id]': String(membership.id),
      'metadata[event_price]': String(eventPrice),
      'metadata[balance_due_before_payment]': String(balanceDue),
      'metadata[payment_amount]': String(feeBreakdown.baseAmount),
      'metadata[stripe_fee_amount]': String(feeBreakdown.stripeFeeAmount),
      'metadata[state_fee_amount]': String(feeBreakdown.stateFeeAmount),
      'metadata[total_fee_amount]': String(feeBreakdown.totalFeeAmount),
      'metadata[operating_state]': feeBreakdown.settings.operatingState,
      'metadata[source]': 'player_event_checkout',
    });

    let lineItemIndex = 1;

    if (feeBreakdown.stripeFeeAmount > 0) {
      checkoutBody.set(`line_items[${lineItemIndex}][price_data][currency]`, 'usd');
      checkoutBody.set(
        `line_items[${lineItemIndex}][price_data][unit_amount]`,
        String(Math.round(feeBreakdown.stripeFeeAmount * 100))
      );
      checkoutBody.set(
        `line_items[${lineItemIndex}][price_data][product_data][name]`,
        'Stripe processing fee'
      );
      checkoutBody.set(`line_items[${lineItemIndex}][quantity]`, '1');
      lineItemIndex += 1;
    }

    if (feeBreakdown.stateFeeAmount > 0) {
      checkoutBody.set(`line_items[${lineItemIndex}][price_data][currency]`, 'usd');
      checkoutBody.set(
        `line_items[${lineItemIndex}][price_data][unit_amount]`,
        String(Math.round(feeBreakdown.stateFeeAmount * 100))
      );
      checkoutBody.set(
        `line_items[${lineItemIndex}][price_data][product_data][name]`,
        `${feeBreakdown.settings.stateFeeLabel} (${feeBreakdown.settings.operatingState})`
      );
      checkoutBody.set(`line_items[${lineItemIndex}][quantity]`, '1');
    }

    const session = await stripeRequest<{ id: string; url: string | null }>(
      'checkout/sessions',
      checkoutBody,
      secretKey
    );

    return NextResponse.json({ checkout_url: session.url, session_id: session.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create checkout session.' },
      { status: 500 }
    );
  }
}
