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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() ?? '';

    if (query.length < 2) {
      return NextResponse.json({ data: [] });
    }

    const supabaseAdmin = getAdminClient();
    const { data, error } = await supabaseAdmin
      .from('players')
      .select('id, full_name, document_id, email')
      .or(`full_name.ilike.%${query}%,document_id.ilike.%${query}%`)
      .order('full_name', { ascending: true })
      .limit(10);

    if (error) throw new Error(error.message);

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to search players.' },
      { status: 500 }
    );
  }
}
