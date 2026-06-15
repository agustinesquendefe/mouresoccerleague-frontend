import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code) {
      return NextResponse.redirect(new URL('/', _request.url));
    }

    const supabaseAdmin = getAdminClient();
    const { data, error } = await supabaseAdmin
      .from('referee_payment_checkout_links')
      .select('id, checkout_url, expires_at')
      .eq('code', code)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!data?.checkout_url) {
      return NextResponse.redirect(new URL('/matches', _request.url));
    }

    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
      return NextResponse.redirect(new URL('/matches', _request.url));
    }

    await supabaseAdmin
      .from('referee_payment_checkout_links')
      .update({ opened_at: new Date().toISOString() })
      .eq('id', data.id);

    return NextResponse.redirect(data.checkout_url);
  } catch {
    return NextResponse.redirect(new URL('/matches', _request.url));
  }
}
