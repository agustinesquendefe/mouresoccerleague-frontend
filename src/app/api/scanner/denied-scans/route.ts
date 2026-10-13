import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseAdmin';
import type { ScannerDeniedPlayer } from '@/models/scanner';

function normalizeName(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = Number(searchParams.get('matchId'));
    const teamIdValue = searchParams.get('teamId');
    const teamId = teamIdValue ? Number(teamIdValue) : null;

    if (!Number.isFinite(matchId) || matchId <= 0) {
      return NextResponse.json({ error: 'Match ID is required.' }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    let query = supabaseAdmin
      .from('scanner_denied_scans')
      .select(`
        id,
        player_id,
        scanned_code,
        reason,
        method,
        validated_at,
        team_id,
        team:teams (
          id,
          name
        ),
        player:players (
          id,
          full_name,
          first_name,
          last_name,
          document_id,
          photo_url
        )
      `)
      .eq('match_id', matchId)
      .order('validated_at', { ascending: false });

    if (teamId !== null && Number.isFinite(teamId) && teamId > 0) {
      query = query.eq('team_id', teamId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const rows: ScannerDeniedPlayer[] = (data ?? []).map((row: any) => {
      const player = Array.isArray(row.player) ? row.player[0] ?? null : row.player ?? null;
      const team = Array.isArray(row.team) ? row.team[0] ?? null : row.team ?? null;
      const firstLastName = `${player?.first_name ?? ''} ${player?.last_name ?? ''}`.trim();
      const playerName = player
        ? normalizeName(player.full_name, firstLastName || `Player #${row.player_id}`)
        : `Unknown player (${row.scanned_code})`;

      return {
        id: String(row.id),
        playerId: row.player_id == null ? null : Number(row.player_id),
        playerName,
        documentId: player?.document_id ?? row.scanned_code ?? null,
        photoUrl: player?.photo_url ?? null,
        teamId: row.team_id == null ? null : Number(row.team_id),
        teamName: team?.name ?? null,
        reason: row.reason ?? 'Player validation failed.',
        method: row.method ?? null,
        scannedAt: row.validated_at ?? null,
      };
    });

    return NextResponse.json({ data: rows });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load denied scanner validations.' },
      { status: 500 }
    );
  }
}
