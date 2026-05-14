import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculatePaymentFees, getPaymentFeeSettings } from '@/lib/paymentFees';

type RequestBody = {
  membershipId?: number;
  amount?: number;
  returnPath?: string;
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

    const body = (await request.json()) as RequestBody;
    const membershipId = Number(body.membershipId);
    const requestedAmount = Number(body.amount);

    if (!Number.isFinite(membershipId)) {
      return NextResponse.json({ error: 'Membership ID is required.' }, { status: 400 });
    }

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return NextResponse.json(
        { error: 'Payment amount must be greater than zero.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getAdminClient();
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('event_memberships')
      .select('id, event_id, player_id, amount_paid')
      .eq('id', membershipId)
      .single();

    if (membershipError) throw new Error(membershipError.message);

    const [{ data: event, error: eventError }, { data: player, error: playerError }] =
      await Promise.all([
        supabaseAdmin
          .from('events')
          .select('id, name, event_price, membership_price')
          .eq('id', membership.event_id)
          .single(),
        supabaseAdmin
          .from('players')
          .select('id, full_name, email')
          .eq('id', membership.player_id)
          .single(),
      ]);

    if (eventError) throw new Error(eventError.message);
    if (playerError) throw new Error(playerError.message);

    const eventPrice = Number(event.event_price ?? event.membership_price ?? 0);
    const amountPaid = Number(membership.amount_paid ?? 0);
    const balanceDue = Math.max(eventPrice - amountPaid, 0);

    if (eventPrice <= 0) {
      return NextResponse.json(
        { error: 'This event does not have a valid price configured.' },
        { status: 400 }
      );
    }

    if (balanceDue <= 0) {
      return NextResponse.json({ error: 'This membership is already paid.' }, { status: 400 });
    }

    if (requestedAmount > balanceDue) {
      return NextResponse.json(
        { error: `Payment amount cannot be greater than the balance due of $${balanceDue.toFixed(2)}.` },
        { status: 400 }
      );
    }

    const origin = request.headers.get('origin') ?? new URL(request.url).origin;
    const returnPath = body.returnPath?.startsWith('/') ? body.returnPath : '/admin/events';
    const successUrl = `${origin}${returnPath}?admin_checkout_session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}${returnPath}`;
    const feeSettings = await getPaymentFeeSettings(supabaseAdmin);
    const feeBreakdown = calculatePaymentFees(requestedAmount, feeSettings);

    const checkoutBody = new URLSearchParams({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': String(Math.round(feeBreakdown.baseAmount * 100)),
      'line_items[0][price_data][product_data][name]': `${event.name || `Event #${event.id}`} - ${player.full_name || `Player #${player.id}`}`,
      'line_items[0][quantity]': '1',
      'metadata[event_id]': String(event.id),
      'metadata[player_id]': String(player.id),
      'metadata[membership_id]': String(membership.id),
      'metadata[event_price]': String(eventPrice),
      'metadata[balance_due_before_payment]': String(balanceDue),
      'metadata[payment_amount]': String(feeBreakdown.baseAmount),
      'metadata[stripe_fee_amount]': String(feeBreakdown.stripeFeeAmount),
      'metadata[state_fee_amount]': String(feeBreakdown.stateFeeAmount),
      'metadata[total_fee_amount]': String(feeBreakdown.totalFeeAmount),
      'metadata[operating_state]': feeBreakdown.settings.operatingState,
      'metadata[source]': 'admin_event_membership',
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

    if (player.email) {
      checkoutBody.set('customer_email', player.email);
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
