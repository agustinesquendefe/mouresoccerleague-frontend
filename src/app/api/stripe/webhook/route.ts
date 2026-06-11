import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const runtime = 'nodejs';

type AppSettingsRow = {
  league_name: string | null;
  contact_email: string | null;
  payment_order_email: string | null;
};

type MembershipRow = {
  amount_paid: number | null;
  event: {
    id: number;
    name: string | null;
    event_price: number | null;
    membership_price: number | null;
  } | null;
  player: {
    id: number;
    full_name: string | null;
    email: string | null;
    document_id: string | null;
    phone: string | null;
  } | null;
};

function getStripeSecretKey() {
  return process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
}

function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET;
}

function getResendApiKey() {
  return process.env.RESEND_API_KEY;
}

function getPaymentEmailFrom() {
  return process.env.PAYMENT_EMAIL_FROM || process.env.RESEND_FROM_EMAIL || 'Moure Premier <onboarding@resend.dev>';
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatDate(value: number | string | null | undefined) {
  if (!value) return '-';
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function markWebhookEvent(
  supabaseAdmin: SupabaseClient,
  eventId: string,
  status: 'processed' | 'failed',
  errorMessage?: string
) {
  await supabaseAdmin
    .from('stripe_webhook_events')
    .update({
      status,
      error_message: errorMessage ?? null,
      processed_at: status === 'processed' ? new Date().toISOString() : null,
    })
    .eq('id', eventId);
}

async function reserveWebhookEvent(
  supabaseAdmin: SupabaseClient,
  event: Stripe.Event,
  checkoutSessionId?: string
) {
  const { error } = await supabaseAdmin.from('stripe_webhook_events').insert({
    id: event.id,
    type: event.type,
    checkout_session_id: checkoutSessionId ?? null,
    status: 'processing',
  });

  if (!error) return { shouldProcess: true };

  if (error.code !== '23505') {
    throw new Error(error.message);
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('stripe_webhook_events')
    .select('status')
    .eq('id', event.id)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  return { shouldProcess: existing?.status === 'failed' };
}

async function updateMembershipPayment(
  supabaseAdmin: SupabaseClient,
  session: Stripe.Checkout.Session
) {
  const membershipId = toNumber(session.metadata?.membership_id, NaN);
  const playerId = toNumber(session.metadata?.player_id, NaN);
  const amountPaid = toNumber(
    session.metadata?.payment_amount,
    toNumber(session.amount_total, 0) / 100
  );
  const eventPrice = toNumber(session.metadata?.event_price, NaN);
  const balanceDueBeforePayment = toNumber(session.metadata?.balance_due_before_payment, NaN);
  const feeAmount = toNumber(session.metadata?.total_fee_amount, 0);

  if (
    !Number.isFinite(membershipId) ||
    !Number.isFinite(playerId) ||
    !Number.isFinite(amountPaid) ||
    !Number.isFinite(eventPrice) ||
    !Number.isFinite(balanceDueBeforePayment) ||
    amountPaid <= 0
  ) {
    throw new Error('Invalid checkout session metadata.');
  }

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('event_memberships')
    .select(
      `
      amount_paid,
      event:events (
        id,
        name,
        event_price,
        membership_price
      ),
      player:players (
        id,
        full_name,
        email,
        document_id,
        phone
      )
    `
    )
    .eq('id', membershipId)
    .single();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const currentAmount = toNumber(membership.amount_paid);
  const amountPaidBeforeCheckout = Math.max(eventPrice - balanceDueBeforePayment, 0);
  const expectedAmountPaid = amountPaidBeforeCheckout + amountPaid;

  const { error: updateError } = await supabaseAdmin
    .from('event_memberships')
    .update({
      amount_paid: Math.max(currentAmount, expectedAmountPaid),
      updated_at: new Date().toISOString(),
    })
    .eq('id', membershipId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { data: existingPaymentRecord, error: existingPaymentRecordError } = await supabaseAdmin
    .from('event_membership_payments')
    .select('id')
    .eq('method', 'stripe')
    .eq('reference', session.id)
    .maybeSingle();

  if (existingPaymentRecordError) {
    throw new Error(existingPaymentRecordError.message);
  }

  if (!existingPaymentRecord) {
    const { error: paymentRecordError } = await supabaseAdmin
      .from('event_membership_payments')
      .insert({
        event_membership_id: membershipId,
        event_id: toNumber(session.metadata?.event_id),
        player_id: playerId,
        amount: amountPaid,
        fee_amount: feeAmount,
        net_amount: Math.max(amountPaid - feeAmount, 0),
        method: 'stripe',
        source: 'stripe_webhook',
        reference: session.id,
        note: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null,
      });

    if (paymentRecordError) {
      throw new Error(paymentRecordError.message);
    }
  }

  const eventRow = Array.isArray(membership.event) ? membership.event[0] ?? null : membership.event ?? null;
  const playerRow = Array.isArray(membership.player) ? membership.player[0] ?? null : membership.player ?? null;

  return {
    amount_paid: membership.amount_paid,
    event: eventRow,
    player: playerRow,
  } as MembershipRow;
}

async function getAppSettings(supabaseAdmin: SupabaseClient) {
  const { data, error } = await supabaseAdmin
    .from('app_settings')
    .select('league_name, contact_email, payment_order_email')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as AppSettingsRow | null;
}

async function sendPaymentOrderEmail(params: {
  to: string;
  settings: AppSettingsRow | null;
  session: Stripe.Checkout.Session;
  membership: MembershipRow;
}) {
  const resendApiKey = getResendApiKey();

  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  const { to, settings, session, membership } = params;
  const leagueName = settings?.league_name || 'Moure Premier Soccer League';
  const metadata = session.metadata ?? {};
  const paymentIntent =
    typeof session.payment_intent === 'object' && session.payment_intent
      ? session.payment_intent
      : null;
  const paymentMethod =
    paymentIntent &&
    typeof paymentIntent.payment_method === 'object' &&
    paymentIntent.payment_method
      ? paymentIntent.payment_method
      : null;
  const card = paymentMethod?.card ?? null;
  const receiptUrl = paymentIntent?.latest_charge && typeof paymentIntent.latest_charge === 'object'
    ? paymentIntent.latest_charge.receipt_url
    : null;

  const baseAmount = toNumber(metadata.payment_amount);
  const stripeFeeAmount = toNumber(metadata.stripe_fee_amount);
  const stateFeeAmount = toNumber(metadata.state_fee_amount);
  const totalFeeAmount = toNumber(metadata.total_fee_amount);
  const amountTotal = toNumber(session.amount_total) / 100;

  const subject = `Payment received: ${membership.player?.full_name || `Player #${metadata.player_id ?? '-'}`}`;
  const rows = [
    ['League', leagueName],
    ['Player', membership.player?.full_name || `Player #${metadata.player_id ?? '-'}`],
    ['Player email', membership.player?.email ?? session.customer_details?.email ?? session.customer_email ?? '-'],
    ['Player document ID', membership.player?.document_id ?? '-'],
    ['Player phone', membership.player?.phone ?? '-'],
    ['Event', membership.event?.name || `Event #${metadata.event_id ?? '-'}`],
    ['Payment source', metadata.source ?? '-'],
    ['Base payment', formatCurrency(baseAmount)],
    ['Stripe fee charged', formatCurrency(stripeFeeAmount)],
    ['State fee charged', formatCurrency(stateFeeAmount)],
    ['Total fees charged', formatCurrency(totalFeeAmount)],
    ['Total charged by Stripe', formatCurrency(amountTotal)],
    ['Payment date', formatDate(session.created)],
    ['Payment status', session.payment_status ?? '-'],
    ['Payment method', card ? `${card.brand?.toUpperCase() ?? 'CARD'} ending in ${card.last4}` : '-'],
    ['Funding', card?.funding ?? '-'],
    ['Card country', card?.country ?? '-'],
    ['Checkout Session', session.id],
    ['Payment Intent', typeof session.payment_intent === 'string' ? session.payment_intent : paymentIntent?.id ?? '-'],
    ['Receipt URL', receiptUrl ?? '-'],
  ];

  const htmlRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#4b5563;font-weight:600;">${escapeHtml(label)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#111827;">${escapeHtml(value)}</td>
        </tr>
      `
    )
    .join('');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;">
      <h2 style="margin:0 0 12px;">Payment received</h2>
      <p style="margin:0 0 16px;color:#4b5563;">Stripe processed a checkout payment. This email is an internal backup order notification.</p>
      <table style="border-collapse:collapse;width:100%;max-width:760px;border:1px solid #e5e7eb;">
        <tbody>${htmlRows}</tbody>
      </table>
    </div>
  `;

  const text = rows.map(([label, value]) => `${label}: ${value}`).join('\n');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getPaymentEmailFrom(),
      to,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message ?? 'Unable to send payment order email.');
  }
}

export async function POST(request: Request) {
  const secretKey = getStripeSecretKey();
  const webhookSecret = getStripeWebhookSecret();

  if (!secretKey || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe webhook credentials are not configured.' },
      { status: 500 }
    );
  }

  const stripe = new Stripe(secretKey);
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Stripe signature is missing.' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const payload = await request.text();
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid Stripe webhook signature.' },
      { status: 400 }
    );
  }

  if (!event.type.startsWith('checkout.session.')) {
    return NextResponse.json({ received: true });
  }

  const sessionFromEvent = event.data.object as Stripe.Checkout.Session;
  const supabaseAdmin = getAdminClient();
  const reservation = await reserveWebhookEvent(supabaseAdmin, event, sessionFromEvent.id);

  if (!reservation.shouldProcess) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'checkout.session.async_payment_succeeded'
    ) {
      const session = await stripe.checkout.sessions.retrieve(sessionFromEvent.id, {
        expand: ['payment_intent.payment_method', 'payment_intent.latest_charge'],
      });

      if (session.payment_status !== 'paid') {
        await markWebhookEvent(supabaseAdmin, event.id, 'processed');
        return NextResponse.json({ received: true, paid: false });
      }

      const membership = await updateMembershipPayment(supabaseAdmin, session);
      const settings = await getAppSettings(supabaseAdmin);
      const paymentOrderEmail = settings?.payment_order_email?.trim() || settings?.contact_email?.trim();

      if (!paymentOrderEmail) {
        throw new Error('Payment order email is not configured in settings.');
      }

      await sendPaymentOrderEmail({
        to: paymentOrderEmail,
        settings,
        session,
        membership,
      });
    }

    await markWebhookEvent(supabaseAdmin, event.id, 'processed');
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to process Stripe webhook.';
    await markWebhookEvent(supabaseAdmin, event.id, 'failed', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
