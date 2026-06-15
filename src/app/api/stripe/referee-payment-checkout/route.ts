import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculatePaymentFees, getPaymentFeeSettings } from '@/lib/paymentFees';
import { randomUUID } from 'crypto';

type RequestBody = {
  matchId?: number;
  teamId?: number;
  refereeId?: number | null;
  amount?: number;
  payerDocumentId?: string;
  returnPath?: string;
};

function getStripeSecretKey() {
  return process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
}

function createShortCode() {
  return randomUUID().replace(/-/g, '').slice(0, 10);
}

function getPublicOrigin(request: Request) {
  const configuredOrigin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.APP_URL ||
    process.env.APP_BASE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;

  if (configuredOrigin) {
    const withProtocol = configuredOrigin.startsWith('http')
      ? configuredOrigin
      : `https://${configuredOrigin}`;
    return withProtocol.replace(/\/$/, '');
  }

  const forwardedHost = request.headers.get('x-forwarded-host');
  const host = forwardedHost || request.headers.get('host');

  if (host && !host.includes('localhost')) {
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    return `${protocol}://${host}`.replace(/\/$/, '');
  }

  const requestOrigin = new URL(request.url).origin;
  if (!requestOrigin.includes('localhost')) {
    return requestOrigin.replace(/\/$/, '');
  }

  return (request.headers.get('origin') ?? requestOrigin).replace(/\/$/, '');
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
    const matchId = Number(body.matchId);
    const teamId = Number(body.teamId);
    const amount = Number(body.amount);
    const payerDocumentId = body.payerDocumentId?.trim() ?? '';

    if (!Number.isFinite(matchId) || !Number.isFinite(teamId)) {
      return NextResponse.json({ error: 'Match and team are required.' }, { status: 400 });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Payment amount must be greater than zero.' }, { status: 400 });
    }

    if (!payerDocumentId) {
      return NextResponse.json({ error: 'Payer document ID is required.' }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();
    const [{ data: match, error: matchError }, { data: team, error: teamError }] =
      await Promise.all([
        supabaseAdmin
          .from('matches')
          .select('id, event_id, team1_id, team2_id, date, time')
          .eq('id', matchId)
          .single(),
        supabaseAdmin
          .from('teams')
          .select('id, name')
          .eq('id', teamId)
          .single(),
      ]);

    if (matchError) throw new Error(matchError.message);
    if (teamError) throw new Error(teamError.message);

    if (Number(match.team1_id) !== teamId && Number(match.team2_id) !== teamId) {
      return NextResponse.json({ error: 'Selected team is not part of this match.' }, { status: 400 });
    }

    const { data: payer, error: payerError } = await supabaseAdmin
      .from('players')
      .select('id, full_name, email, document_id')
      .eq('document_id', payerDocumentId)
      .maybeSingle();

    if (payerError) throw new Error(payerError.message);

    const payerName = payer?.full_name ?? payerDocumentId;
    const refereeId =
      body.refereeId !== null && body.refereeId !== undefined && Number.isFinite(Number(body.refereeId))
        ? Number(body.refereeId)
        : null;

    const origin = getPublicOrigin(request);
    const returnPath = body.returnPath?.startsWith('/') ? body.returnPath : '/admin/matches';
    const separator = returnPath.includes('?') ? '&' : '?';
    const successUrl = `${origin}${returnPath}${separator}referee_payment_session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}${returnPath}`;
    const feeSettings = await getPaymentFeeSettings(supabaseAdmin);
    const feeBreakdown = calculatePaymentFees(amount, feeSettings);

    const checkoutBody = new URLSearchParams({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][unit_amount]': String(Math.round(feeBreakdown.baseAmount * 100)),
      'line_items[0][price_data][product_data][name]': `Referee fee - ${team.name || `Team #${team.id}`}`,
      'line_items[0][quantity]': '1',
      'metadata[source]': 'admin_referee_payment',
      'metadata[match_id]': String(matchId),
      'metadata[team_id]': String(teamId),
      'metadata[referee_id]': refereeId ? String(refereeId) : '',
      'metadata[payer_document_id]': payerDocumentId,
      'metadata[payer_player_id]': payer?.id ? String(payer.id) : '',
      'metadata[payer_name]': payerName,
      'metadata[payment_amount]': String(feeBreakdown.baseAmount),
      'metadata[stripe_fee_amount]': String(feeBreakdown.stripeFeeAmount),
      'metadata[state_fee_amount]': String(feeBreakdown.stateFeeAmount),
      'metadata[total_fee_amount]': String(feeBreakdown.totalFeeAmount),
      'metadata[total_paid_amount]': String(feeBreakdown.totalAmount),
      'metadata[operating_state]': feeBreakdown.settings.operatingState,
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

    if (payer?.email) {
      checkoutBody.set('customer_email', payer.email);
    }

    const session = await stripeRequest<{ id: string; url: string | null }>(
      'checkout/sessions',
      checkoutBody,
      secretKey
    );

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe did not return a checkout URL.' }, { status: 500 });
    }

    const code = createShortCode();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error: linkError } = await supabaseAdmin
      .from('referee_payment_checkout_links')
      .insert({
        code,
        checkout_url: session.url,
        stripe_checkout_session_id: session.id,
        match_id: matchId,
        team_id: teamId,
        expires_at: expiresAt,
      });

    if (linkError) throw new Error(linkError.message);

    const shortCheckoutUrl = `${origin}/pay/ref/${code}`;

    return NextResponse.json({
      checkout_url: session.url,
      short_checkout_url: shortCheckoutUrl,
      session_id: session.id,
      fee_breakdown: feeBreakdown,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create referee payment checkout.' },
      { status: 500 }
    );
  }
}
