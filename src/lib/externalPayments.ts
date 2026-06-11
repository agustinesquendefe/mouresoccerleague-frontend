import type { SupabaseClient } from '@supabase/supabase-js';

export type ExternalPaymentMethod = 'cash' | 'zelle' | 'venmo' | 'cashapp';
export type ExternalPaymentSource = 'admin' | 'player_portal';

type RegisterExternalPaymentParams = {
  supabaseAdmin: SupabaseClient;
  membershipId: number;
  amount: number;
  method: ExternalPaymentMethod;
  source: ExternalPaymentSource;
  reference?: string | null;
  note?: string | null;
  createdBy?: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getPaymentEmailFrom() {
  return process.env.PAYMENT_EMAIL_FROM || process.env.RESEND_FROM_EMAIL || 'Moure Premier <onboarding@resend.dev>';
}

function getMethodLabel(method: ExternalPaymentMethod) {
  const labels: Record<ExternalPaymentMethod, string> = {
    cash: 'Cash',
    zelle: 'Zelle',
    venmo: 'Venmo',
    cashapp: 'Cash App',
  };
  return labels[method];
}

async function sendResendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;

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
    throw new Error(data?.message ?? 'Unable to send payment email.');
  }
}

function buildPaymentEmail(params: {
  title: string;
  leagueName: string;
  eventName: string;
  playerName: string;
  playerEmail: string | null;
  amount: number;
  method: ExternalPaymentMethod;
  reference?: string | null;
  note?: string | null;
  paymentId: number;
  createdAt: string;
}) {
  const rows = [
    ['League', params.leagueName],
    ['Player', params.playerName],
    ['Player email', params.playerEmail ?? '-'],
    ['Event', params.eventName],
    ['Amount', formatCurrency(params.amount)],
    ['Payment method', getMethodLabel(params.method)],
    ['Reference', params.reference || '-'],
    ['Note', params.note || '-'],
    ['Payment record', `#${params.paymentId}`],
    ['Date', new Date(params.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })],
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

  return {
    subject: params.title,
    html: `
      <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;">
        <h2 style="margin:0 0 12px;">${escapeHtml(params.title)}</h2>
        <p style="margin:0 0 16px;color:#4b5563;">This is a backup receipt for a non-Stripe payment recorded in the league system.</p>
        <table style="border-collapse:collapse;width:100%;max-width:760px;border:1px solid #e5e7eb;">
          <tbody>${htmlRows}</tbody>
        </table>
      </div>
    `,
    text: rows.map(([label, value]) => `${label}: ${value}`).join('\n'),
  };
}

export async function registerExternalPayment({
  supabaseAdmin,
  membershipId,
  amount,
  method,
  source,
  reference,
  note,
  createdBy,
}: RegisterExternalPaymentParams) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('event_memberships')
    .select(`
      id,
      event_id,
      player_id,
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
        email
      )
    `)
    .eq('id', membershipId)
    .single();

  if (membershipError) throw new Error(membershipError.message);

  const eventRow = Array.isArray(membership.event) ? membership.event[0] ?? null : membership.event ?? null;
  const playerRow = Array.isArray(membership.player) ? membership.player[0] ?? null : membership.player ?? null;
  const eventPrice = Number(eventRow?.event_price ?? eventRow?.membership_price ?? 0);
  const currentAmountPaid = Number(membership.amount_paid ?? 0);
  const balanceDue = Math.max(eventPrice - currentAmountPaid, 0);

  if (amount > balanceDue) {
    throw new Error(`Payment amount cannot be greater than $${balanceDue.toFixed(2)}.`);
  }

  const { data: payment, error: paymentError } = await supabaseAdmin
    .from('event_membership_payments')
    .insert({
      event_membership_id: membershipId,
      event_id: membership.event_id,
      player_id: membership.player_id,
      amount,
      fee_amount: 0,
      net_amount: amount,
      method,
      source,
      reference: reference?.trim() || null,
      note: note?.trim() || null,
      created_by: createdBy ?? null,
    })
    .select('id, created_at')
    .single();

  if (paymentError) throw new Error(paymentError.message);

  const { error: updateError } = await supabaseAdmin
    .from('event_memberships')
    .update({
      amount_paid: currentAmountPaid + amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', membershipId);

  if (updateError) throw new Error(updateError.message);

  const { data: settings, error: settingsError } = await supabaseAdmin
    .from('app_settings')
    .select('league_name, contact_email, payment_order_email')
    .eq('id', 1)
    .maybeSingle();

  if (settingsError) throw new Error(settingsError.message);

  const leagueName = settings?.league_name || 'Moure Premier Soccer League';
  const eventName = eventRow?.name || `Event #${membership.event_id}`;
  const playerName = playerRow?.full_name || `Player #${membership.player_id}`;
  const companyEmail = settings?.payment_order_email?.trim() || settings?.contact_email?.trim();
  const playerEmail = playerRow?.email?.trim() || null;

  const companyReceipt = buildPaymentEmail({
    title: `Payment recorded: ${playerName}`,
    leagueName,
    eventName,
    playerName,
    playerEmail,
    amount,
    method,
    reference,
    note,
    paymentId: Number(payment.id),
    createdAt: payment.created_at,
  });

  const playerReceipt = buildPaymentEmail({
    title: `Payment receipt: ${eventName}`,
    leagueName,
    eventName,
    playerName,
    playerEmail,
    amount,
    method,
    reference,
    note,
    paymentId: Number(payment.id),
    createdAt: payment.created_at,
  });

  const emailJobs = [];
  if (companyEmail) {
    emailJobs.push(sendResendEmail({ to: companyEmail, ...companyReceipt }));
  }
  if (playerEmail) {
    emailJobs.push(sendResendEmail({ to: playerEmail, ...playerReceipt }));
  }

  const emailResults = await Promise.allSettled(emailJobs);
  const failedEmailCount = emailResults.filter((result) => result.status === 'rejected').length;

  return {
    ok: true,
    paymentId: payment.id,
    emailWarning: failedEmailCount > 0
      ? `Payment was recorded, but ${failedEmailCount} receipt email${failedEmailCount === 1 ? '' : 's'} could not be sent.`
      : null,
  };
}
