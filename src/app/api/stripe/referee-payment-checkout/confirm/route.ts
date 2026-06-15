import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type AppSettingsRow = {
  league_name: string | null;
  contact_email: string | null;
  payment_order_email: string | null;
};

function getResendApiKey() {
  return process.env.RESEND_API_KEY;
}

function getPaymentEmailFrom() {
  return process.env.PAYMENT_EMAIL_FROM || process.env.RESEND_FROM_EMAIL || 'Moure Premier <onboarding@resend.dev>';
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatDateFromSeconds(value: number | null | undefined) {
  if (!value) return '-';

  return new Date(value * 1000).toLocaleString('en-US', {
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

async function sendResendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const resendApiKey = getResendApiKey();

  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getPaymentEmailFrom(),
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message ?? 'Unable to send referee payment email.');
  }
}

function buildRefereePaymentEmail(params: {
  title: string;
  intro: string;
  rows: Array<[string, string | number | null | undefined]>;
}) {
  const htmlRows = params.rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#4b5563;font-weight:600;">${escapeHtml(label)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#111827;">${escapeHtml(value)}</td>
        </tr>
      `
    )
    .join('');

  return {
    subject: params.title,
    html: `
      <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;">
        <h2 style="margin:0 0 12px;">${escapeHtml(params.title)}</h2>
        <p style="margin:0 0 16px;color:#4b5563;">${escapeHtml(params.intro)}</p>
        <table style="border-collapse:collapse;width:100%;max-width:760px;border:1px solid #e5e7eb;">
          <tbody>${htmlRows}</tbody>
        </table>
      </div>
    `,
    text: params.rows.map(([label, value]) => `${label}: ${value ?? '-'}`).join('\n'),
  };
}

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

    const response = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=payment_intent.payment_method&expand[]=payment_intent.latest_charge`,
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

    if (session.metadata?.source !== 'admin_referee_payment') {
      return NextResponse.json({ error: 'Invalid checkout session source.' }, { status: 400 });
    }

    const matchId = Number(session.metadata?.match_id);
    const teamId = Number(session.metadata?.team_id);
    const amount = Number(session.metadata?.payment_amount ?? Number(session.amount_total ?? 0) / 100);
    const stripeFeeAmount = Number(session.metadata?.stripe_fee_amount ?? 0);
    const stateFeeAmount = Number(session.metadata?.state_fee_amount ?? 0);
    const totalFeeAmount = Number(session.metadata?.total_fee_amount ?? 0);
    const totalPaidAmount = Number(session.metadata?.total_paid_amount ?? Number(session.amount_total ?? 0) / 100);
    const refereeId = Number(session.metadata?.referee_id);
    const payerPlayerId = Number(session.metadata?.payer_player_id);
    const payerDocumentId = String(session.metadata?.payer_document_id ?? '').trim();
    const payerName = String(session.metadata?.payer_name ?? '').trim();

    if (!Number.isFinite(matchId) || !Number.isFinite(teamId) || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid checkout session metadata.' }, { status: 400 });
    }

    const paidAt = new Date().toISOString();
    const supabaseAdmin = getAdminClient();
    const { data: paymentRecord, error } = await supabaseAdmin
      .from('match_referee_payments')
      .upsert(
        {
          match_id: matchId,
          team_id: teamId,
          referee_id: Number.isFinite(refereeId) && refereeId > 0 ? refereeId : null,
          payer_player_id: Number.isFinite(payerPlayerId) && payerPlayerId > 0 ? payerPlayerId : null,
          payer_document_id: payerDocumentId || null,
          payer_name: payerName || null,
          amount,
          stripe_fee_amount: Number.isFinite(stripeFeeAmount) ? stripeFeeAmount : 0,
          state_fee_amount: Number.isFinite(stateFeeAmount) ? stateFeeAmount : 0,
          total_fee_amount: Number.isFinite(totalFeeAmount) ? totalFeeAmount : 0,
          total_paid_amount: Number.isFinite(totalPaidAmount) ? totalPaidAmount : amount,
          method: 'stripe',
          status: 'paid',
          reference: session.payment_intent ?? session.id,
          paid_at: paidAt,
          stripe_checkout_session_id: session.id,
          updated_at: paidAt,
        },
        { onConflict: 'match_id,team_id' }
      )
      .select('id, created_at, updated_at')
      .single();

    if (error) throw new Error(error.message);

    const [
      { data: settings, error: settingsError },
      { data: match, error: matchError },
      { data: team, error: teamError },
      { data: referee, error: refereeError },
      { data: payer, error: payerError },
    ] = await Promise.all([
      supabaseAdmin
        .from('app_settings')
        .select('league_name, contact_email, payment_order_email')
        .eq('id', 1)
        .maybeSingle(),
      supabaseAdmin
        .from('matches')
        .select('id, event_id, date, time, field_number, event:events(name)')
        .eq('id', matchId)
        .maybeSingle(),
      supabaseAdmin
        .from('teams')
        .select('id, name')
        .eq('id', teamId)
        .maybeSingle(),
      Number.isFinite(refereeId) && refereeId > 0
        ? supabaseAdmin
            .from('referees')
            .select('id, first_name, last_name, email')
            .eq('id', refereeId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      payerDocumentId
        ? supabaseAdmin
            .from('players')
            .select('id, full_name, email, document_id, phone')
            .eq('document_id', payerDocumentId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (settingsError) throw new Error(settingsError.message);
    if (matchError) throw new Error(matchError.message);
    if (teamError) throw new Error(teamError.message);
    if (refereeError) throw new Error(refereeError.message);
    if (payerError) throw new Error(payerError.message);

    const settingsRow = settings as AppSettingsRow | null;
    const leagueName = settingsRow?.league_name || 'Moure Premier Soccer League';
    const adminEmail = settingsRow?.payment_order_email?.trim() || settingsRow?.contact_email?.trim();
    const payerEmail = payer?.email?.trim() || session.customer_details?.email || session.customer_email || null;
    const eventRow = Array.isArray(match?.event) ? match?.event[0] : match?.event;
    const eventName = eventRow?.name || `Event #${match?.event_id ?? '-'}`;
    const refereeName = referee
      ? `${referee.first_name ?? ''} ${referee.last_name ?? ''}`.trim() || `Referee #${referee.id}`
      : '-';
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
    const receiptUrl =
      paymentIntent?.latest_charge && typeof paymentIntent.latest_charge === 'object'
        ? paymentIntent.latest_charge.receipt_url
        : null;

    const commonRows: Array<[string, string | number | null | undefined]> = [
      ['League', leagueName],
      ['Event', eventName],
      ['Match', `Match #${matchId}`],
      ['Match date', match?.date ? `${match.date}${match.time ? ` ${match.time}` : ''}` : '-'],
      ['Team paying referee fee', team?.name || `Team #${teamId}`],
      ['Referee', refereeName],
      ['Payer', payer?.full_name || payerName || payerDocumentId],
      ['Payer email', payerEmail ?? '-'],
      ['Payer document ID', (payer?.document_id ?? payerDocumentId) || '-'],
      ['Base referee fee', formatCurrency(amount)],
      ['Stripe fee charged', formatCurrency(stripeFeeAmount)],
      ['State fee charged', formatCurrency(stateFeeAmount)],
      ['Total fees charged', formatCurrency(totalFeeAmount)],
      ['Total charged by Stripe', formatCurrency(totalPaidAmount)],
      ['Payment date', formatDateFromSeconds(session.created)],
      ['Payment status', session.payment_status ?? '-'],
      ['Payment method', card ? `${card.brand?.toUpperCase() ?? 'CARD'} ending in ${card.last4}` : 'Card'],
      ['Checkout Session', session.id],
      ['Payment Intent', typeof session.payment_intent === 'string' ? session.payment_intent : paymentIntent?.id ?? '-'],
      ['Receipt URL', receiptUrl ?? '-'],
      ['Payment record', paymentRecord?.id ? `#${paymentRecord.id}` : '-'],
    ];

    const adminReceipt = buildRefereePaymentEmail({
      title: `Referee payment received: ${team?.name || `Team #${teamId}`}`,
      intro: 'Stripe processed a referee fee payment. This email is an internal backup order notification.',
      rows: commonRows,
    });

    const payerReceipt = buildRefereePaymentEmail({
      title: `Referee payment receipt: ${team?.name || `Team #${teamId}`}`,
      intro: 'This is your receipt for the referee fee payment recorded in the league system.',
      rows: commonRows,
    });

    const emailJobs = [];
    if (adminEmail) {
      emailJobs.push(sendResendEmail({ to: adminEmail, ...adminReceipt }));
    }
    if (payerEmail) {
      emailJobs.push(sendResendEmail({ to: payerEmail, ...payerReceipt }));
    }

    const emailResults = await Promise.allSettled(emailJobs);
    const failedEmailCount = emailResults.filter((result) => result.status === 'rejected').length;

    return NextResponse.json({
      paid: true,
      payment: {
        id: paymentRecord?.id ?? null,
        amount,
        method: 'stripe',
        status: 'paid',
        reference: session.payment_intent ?? session.id,
        paid_at: paidAt,
        stripe_checkout_session_id: session.id,
        stripe_fee_amount: Number.isFinite(stripeFeeAmount) ? stripeFeeAmount : 0,
        state_fee_amount: Number.isFinite(stateFeeAmount) ? stateFeeAmount : 0,
        total_fee_amount: Number.isFinite(totalFeeAmount) ? totalFeeAmount : 0,
        total_paid_amount: Number.isFinite(totalPaidAmount) ? totalPaidAmount : amount,
      },
      emailWarning:
        failedEmailCount > 0
          ? `Payment was confirmed, but ${failedEmailCount} receipt email${failedEmailCount === 1 ? '' : 's'} could not be sent.`
          : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to confirm referee payment.' },
      { status: 500 }
    );
  }
}
