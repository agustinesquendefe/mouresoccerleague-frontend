import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import type { ScannerCheckedInPlayer } from '@/models/scanner';

function normalizeName(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = Number(searchParams.get('matchId'));
    const teamId = Number(searchParams.get('teamId'));

    if (!Number.isFinite(matchId) || matchId <= 0) {
      return NextResponse.json({ error: 'Match ID is required.' }, { status: 400 });
    }

    if (!Number.isFinite(teamId) || teamId <= 0) {
      return NextResponse.json({ error: 'Team ID is required.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data, error } = await supabaseAdmin
      .from('match_check_ins')
      .select(`
        id,
        player_id,
        team_id,
        checked_in_at,
        status,
        method,
        player:players (
          id,
          full_name,
          first_name,
          last_name,
          document_id
        ),
        team:teams (
          id,
          name
        )
      `)
      .eq('match_id', matchId)
      .eq('team_id', teamId)
      .order('checked_in_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const rows: ScannerCheckedInPlayer[] = (data ?? []).map((row: any) => {
      const player = Array.isArray(row.player) ? row.player[0] ?? null : row.player ?? null;
      const team = Array.isArray(row.team) ? row.team[0] ?? null : row.team ?? null;
      const firstLastName = `${player?.first_name ?? ''} ${player?.last_name ?? ''}`.trim();

      return {
        id: Number(row.id),
        playerId: Number(row.player_id),
        playerName: normalizeName(player?.full_name, firstLastName || `Player #${row.player_id}`),
        documentId: player?.document_id ?? null,
        teamId: Number(row.team_id),
        teamName: team?.name ?? null,
        status: row.status ?? null,
        method: row.method ?? null,
        checkedInAt: row.checked_in_at ?? null,
      };
    });

    return NextResponse.json({ data: rows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load scanner check-ins.' },
      { status: 500 }
    );
  }
}
