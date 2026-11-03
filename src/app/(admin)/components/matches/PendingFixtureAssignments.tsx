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
import {
  previewPendingResolution,
  resolvePendingAssignments,
  type PendingResolutionPreview,
} from '@/services/matches/pendingFixtureAssignments';

type Props = {
  eventId: number;
  target: { roundNumber: number; groupId: number | null } | null;
  onClose: () => void;
  onResolved: () => Promise<void> | void;
  onError: (message: string) => void;
};

export default function PendingFixtureAssignments({ eventId, target, onClose, onResolved, onError }: Props) {
  const [preview, setPreview] = useState<PendingResolutionPreview | null>(null);
  const [opponentTeamId, setOpponentTeamId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target) {
      setPreview(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    setOpponentTeamId('');
    previewPendingResolution(eventId, target.roundNumber, target.groupId)
      .then((result) => {
        if (active) setPreview(result);
      })
      .catch((cause) => {
        if (!active) return;
        onError(cause instanceof Error ? cause.message : 'Failed to preview pending assignment');
        onClose();
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [eventId, target, onClose, onError]);

  const resolve = async () => {
    if (!target || !preview) return;
    try {
      setLoading(true);
      setError(null);
      await resolvePendingAssignments(
        eventId,
        target.roundNumber,
        target.groupId,
        opponentTeamId === '' ? undefined : Number(opponentTeamId)
      );
      onClose();
      await onResolved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to assign pending opponent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={target != null} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Assign opponent · Round {target?.roundNumber}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {preview && (
            <>
              <Typography>
                Pending: <strong>{preview.pendingTeamNames.join(', ')}</strong>
              </Typography>
              {preview.pendingTeamNames.length >= 2 && (
                <Alert severity="info">
                  Pending teams will be paired with each other first, leaving existing matches unchanged.
                </Alert>
              )}
              {preview.requiresOpponent && (
                <TextField
                  select
                  fullWidth
                  label="Opponent"
                  value={opponentTeamId}
                  onChange={(event) => setOpponentTeamId(Number(event.target.value))}
                  helperText="If the selected opponent already has a match, that team's current opponent will become the resting team."
                >
                  {preview.opponentCandidates.map((team) => (
                    <MenuItem key={team.id} value={team.id}>{team.name}</MenuItem>
                  ))}
                </TextField>
              )}
              <Typography variant="body2" color="text.secondary">
                Existing matches will remain unchanged except for the single matchup needed to assign this opponent.
              </Typography>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => void resolve()}
          disabled={loading || !preview || (preview.requiresOpponent && opponentTeamId === '')}
        >
          {loading ? 'Assigning...' : 'Save Opponent'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
