import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { registerExternalPayment, type ExternalPaymentMethod } from '@/lib/externalPayments';

type RequestBody = {
  eventId?: number;
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

export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
    }

    const body = (await request.json()) as RequestBody;
    const eventId = Number(body.eventId);
    const amount = Number(body.amount);
    const method = body.method;

    if (!Number.isFinite(eventId)) {
      return NextResponse.json({ error: 'Event ID is required.' }, { status: 400 });
    }

    if (!method || !['zelle', 'venmo', 'cashapp'].includes(method)) {
      return NextResponse.json({ error: 'Unsupported player portal payment method.' }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user?.email) {
      return NextResponse.json({ error: 'Invalid player session.' }, { status: 401 });
    }

    const [{ data: player, error: playerError }, { data: settings, error: settingsError }] =
      await Promise.all([
        supabaseAdmin
          .from('players')
          .select('id')
          .ilike('email', userData.user.email.trim().toLowerCase())
          .eq('is_active', true)
          .maybeSingle(),
        supabaseAdmin
          .from('app_settings')
          .select('zelle_enabled, zelle_recipient, venmo_enabled, venmo_recipient, cashapp_enabled, cashapp_recipient')
          .eq('id', 1)
          .maybeSingle(),
      ]);

    if (playerError) throw new Error(playerError.message);
    if (settingsError) throw new Error(settingsError.message);

    if (!player) {
      return NextResponse.json({ error: 'Player profile not found.' }, { status: 404 });
    }

    const methodIsEnabled =
      (method === 'zelle' && settings?.zelle_enabled && settings?.zelle_recipient) ||
      (method === 'venmo' && settings?.venmo_enabled && settings?.venmo_recipient) ||
      (method === 'cashapp' && settings?.cashapp_enabled && settings?.cashapp_recipient);

    if (!methodIsEnabled) {
      return NextResponse.json({ error: 'This payment method is not enabled.' }, { status: 400 });
    }

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('event_memberships')
      .select('id')
      .eq('event_id', eventId)
      .eq('player_id', player.id)
      .single();

    if (membershipError) throw new Error(membershipError.message);

    const result = await registerExternalPayment({
      supabaseAdmin,
      membershipId: Number(membership.id),
      amount,
      method,
      source: 'player_portal',
      reference: body.reference,
      note: body.note,
      createdBy: userData.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to record payment.' },
      { status: 500 }
    );
  }
}
