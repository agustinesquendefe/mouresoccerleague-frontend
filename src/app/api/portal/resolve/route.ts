import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';

type PortalType = 'player' | 'coach' | 'referee';

const PORTAL_PATHS: Record<PortalType, string> = {
  player: '/player-portal',
  coach: '/coach',
  referee: '/referee/matches',
};

async function findByEmail(table: string, email: string, columns: string) {
  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from(table)
    .select(columns)
    .ilike('email', email)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as any | null;
}

function getDisplayName(row: any, fallback: string) {
  const fullName = row?.full_name?.trim();
  if (fullName) return fullName;

  const firstLastName = `${row?.first_name ?? ''} ${row?.last_name ?? ''}`.trim();
  return firstLastName || fallback;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const [player, coach, referee] = await Promise.all([
      findByEmail('players', email, 'id, first_name, last_name, full_name, email'),
      findByEmail('coaches', email, 'id, first_name, last_name, email'),
      findByEmail('referees', email, 'id, first_name, last_name, email'),
    ]);

    const portals = [
      player
        ? {
            type: 'player' as const,
            label: 'Player',
            href: PORTAL_PATHS.player,
            name: getDisplayName(player, email),
          }
        : null,
      coach
        ? {
            type: 'coach' as const,
            label: 'Coach',
            href: PORTAL_PATHS.coach,
            name: getDisplayName(coach, email),
          }
        : null,
      referee
        ? {
            type: 'referee' as const,
            label: 'Referee',
            href: PORTAL_PATHS.referee,
            name: getDisplayName(referee, email),
          }
        : null,
    ].filter(Boolean);

    if (portals.length === 0) {
      return NextResponse.json(
        { error: 'No player, coach, or referee profile was found for this email.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        email,
        portals,
        redirectTo: portals.length === 1 ? portals[0]?.href : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to resolve portal access.' },
      { status: 500 }
    );
  }
}
