'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { Match, MatchStatus } from '@/models/match';
import type { MatchScoreUpdate } from '@/services/matches/updateMatchScore';

type Props = {
  open: boolean;
  match: Match | null;
  teamMap: Record<number, string>;
  loading?: boolean;
  onClose: () => void;
  onSave: (update: MatchScoreUpdate) => Promise<void>;
};

function toInputValue(value: number | null): string {
  return value == null ? '' : String(value);
}

function parseScore(value: string): number | null {
  if (value.trim() === '') return null;
  return Number(value);
}

export default function ScoreDialog({ open, match, teamMap, loading = false, onClose, onSave }: Props) {
  const [status, setStatus] = useState<MatchStatus>('played');
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [penaltyScore1, setPenaltyScore1] = useState('');
  const [penaltyScore2, setPenaltyScore2] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !match) return;
    const currentStatus = match.status as MatchStatus | null;
    setStatus(
      currentStatus === 'played' || currentStatus === 'in_progress' || currentStatus === 'cancelled'
        ? currentStatus
        : 'played'
    );
    setScore1(toInputValue(match.score1));
    setScore2(toInputValue(match.score2));
    setPenaltyScore1(toInputValue(match.penalty_score1));
    setPenaltyScore2(toInputValue(match.penalty_score2));
    setError(null);
  }, [open, match]);

  if (!match) return null;

  const isKnockout = match.stage_type === 'knockout';

  const handleSave = async () => {
    const parsedScore1 = parseScore(score1);
    const parsedScore2 = parseScore(score2);
    const parsedPenalty1 = parseScore(penaltyScore1);
    const parsedPenalty2 = parseScore(penaltyScore2);
    const values = [parsedScore1, parsedScore2, parsedPenalty1, parsedPenalty2].filter(
      (value): value is number => value != null
    );

    if (values.some((value) => !Number.isInteger(value) || value < 0)) {
      setError('Scores must be positive whole numbers or zero.');
      return;
    }
    if ((parsedScore1 == null) !== (parsedScore2 == null)) {
      setError('Enter a score for both teams.');
      return;
    }
    if (status === 'played' && (parsedScore1 == null || parsedScore2 == null)) {
      setError('A played match needs a score for both teams.');
      return;
    }
    if ((parsedPenalty1 == null) !== (parsedPenalty2 == null)) {
      setError('Enter both penalty scores or leave both empty.');
      return;
    }

    setError(null);
    await onSave({
      status,
      score1: parsedScore1,
      score2: parsedScore2,
      penalty_score1: isKnockout ? parsedPenalty1 : null,
      penalty_score2: isKnockout ? parsedPenalty2 : null,
    });
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Update score</DialogTitle>
      <DialogContent>
        <Stack spacing={2.25} sx={{ pt: 1 }}>
          <Typography color="text.secondary">
            Round {match.round_number ?? '—'} · Match #{match.id}
          </Typography>

          {error && <Alert severity="error">{error}</Alert>}

          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField
              label={teamMap[match.team1_id] ?? `Team #${match.team1_id}`}
              value={score1}
              onChange={(event) => setScore1(event.target.value)}
              type="number"
              inputProps={{ min: 0, step: 1, inputMode: 'numeric' }}
              fullWidth
              autoFocus
            />
            <Typography variant="h5" color="text.secondary">–</Typography>
            <TextField
              label={teamMap[match.team2_id] ?? `Team #${match.team2_id}`}
              value={score2}
              onChange={(event) => setScore2(event.target.value)}
              type="number"
              inputProps={{ min: 0, step: 1, inputMode: 'numeric' }}
              fullWidth
            />
          </Stack>

          {isKnockout && (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <TextField
                label="Team 1 penalties"
                value={penaltyScore1}
                onChange={(event) => setPenaltyScore1(event.target.value)}
                type="number"
                inputProps={{ min: 0, step: 1, inputMode: 'numeric' }}
                fullWidth
              />
              <Typography color="text.secondary">–</Typography>
              <TextField
                label="Team 2 penalties"
                value={penaltyScore2}
                onChange={(event) => setPenaltyScore2(event.target.value)}
                type="number"
                inputProps={{ min: 0, step: 1, inputMode: 'numeric' }}
                fullWidth
              />
            </Stack>
          )}

          <TextField
            select
            label="Game status"
            value={status}
            onChange={(event) => setStatus(event.target.value as MatchStatus)}
            fullWidth
          >
            <MenuItem value="scheduled">Scheduled</MenuItem>
            <MenuItem value="in_progress">In progress</MenuItem>
            <MenuItem value="played">Played</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" onClick={() => void handleSave()} disabled={loading}>
          {loading ? 'Saving…' : 'Save result'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
