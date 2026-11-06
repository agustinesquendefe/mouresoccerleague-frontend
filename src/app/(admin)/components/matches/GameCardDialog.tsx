'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { Match } from '@/models/match';
import type { Field } from '@/models/field';
import { supabase } from '@/lib/supabaseClient';
import { formatTime12Hour } from '@/utils/formatTime';

type CheckInRow = {
  id: number;
  team_id: number;
  status: string | null;
  player: { first_name: string | null; last_name: string | null } | null;
};

type Props = {
  open: boolean;
  match: Match | null;
  teamMap: Record<number, string>;
  fields: Field[];
  onClose: () => void;
};

function formatStoredDate(value: string | null): string {
  if (!value) return 'Date not set';
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function playerName(row: CheckInRow): string {
  if (!row.player) return 'Unknown player';
  return `${row.player.first_name ?? ''} ${row.player.last_name ?? ''}`.trim() || 'Unknown player';
}

export default function GameCardDialog({ open, match, teamMap, fields, onClose }: Props) {
  const [checkIns, setCheckIns] = useState<CheckInRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !match) return;
    let active = true;

    setLoading(true);
    setError(null);
    const loadGameCard = async () => {
      try {
        const { data, error: loadError } = await supabase
          .from('match_check_ins')
          .select('id, team_id, status, player:players(first_name, last_name)')
          .eq('match_id', match.id)
          .order('checked_in_at', { ascending: true });
        if (!active) return;
        if (loadError) throw new Error(loadError.message);
        setCheckIns((data ?? []).map((row: any) => ({
          id: Number(row.id),
          team_id: Number(row.team_id),
          status: row.status ?? null,
          player: Array.isArray(row.player) ? row.player[0] ?? null : row.player ?? null,
        })));
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load the game card.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadGameCard();

    return () => { active = false; };
  }, [open, match]);

  if (!match) return null;

  const team1 = teamMap[match.team1_id] ?? `Team #${match.team1_id}`;
  const team2 = teamMap[match.team2_id] ?? `Team #${match.team2_id}`;
  const fieldName = fields.find((field) => field.id === match.field_id)?.name ??
    (match.field_number ? `Field ${match.field_number}` : 'Field not set');
  const score = match.score1 != null && match.score2 != null
    ? `${match.score1} – ${match.score2}`
    : 'No result';

  const teamCheckIns = (teamId: number) => checkIns.filter((row) => row.team_id === teamId);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Game Card</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
              <Box sx={{ flex: 1, textAlign: 'right' }}>
                <Typography variant="h6" fontWeight={800}>{team1}</Typography>
              </Box>
              <Box sx={{ minWidth: 100, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight={900}>{score}</Typography>
                <Chip size="small" label={String(match.status ?? 'scheduled').replaceAll('_', ' ')} sx={{ mt: 0.75 }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight={800}>{team2}</Typography>
              </Box>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="center" spacing={{ xs: 0.5, sm: 3 }}>
              <Typography variant="body2">{formatStoredDate(match.date)}</Typography>
              <Typography variant="body2">{match.time ? formatTime12Hour(match.time) : 'Time not set'}</Typography>
              <Typography variant="body2">{fieldName}</Typography>
              <Typography variant="body2">Round {match.round_number ?? '—'}</Typography>
            </Stack>
          </Paper>

          {error && <Alert severity="error">{error}</Alert>}
          {loading ? (
            <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress size={28} /></Stack>
          ) : (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              {[match.team1_id, match.team2_id].map((teamId) => {
                const rows = teamCheckIns(teamId);
                return (
                  <Paper key={teamId} variant="outlined" sx={{ p: 2, flex: 1 }}>
                    <Typography fontWeight={800} sx={{ mb: 1.25 }}>
                      {teamMap[teamId] ?? `Team #${teamId}`} · Roster
                    </Typography>
                    {rows.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">No checked-in players.</Typography>
                    ) : rows.map((row) => (
                      <Stack key={row.id} direction="row" justifyContent="space-between" gap={1} sx={{ py: 0.6 }}>
                        <Typography variant="body2">{playerName(row)}</Typography>
                        <Chip size="small" variant="outlined" label={row.status ?? 'checked in'} />
                      </Stack>
                    ))}
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
