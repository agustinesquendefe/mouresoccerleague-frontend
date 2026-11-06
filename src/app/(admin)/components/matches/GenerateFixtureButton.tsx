'use client';

import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import {
  applyFixtureRegeneration,
  previewFixtureRegeneration,
  type FixtureRegenerationPreview,
} from '@/services/matches/fixtureRegeneration';

type Props = {
  eventId: number;
  eventFormat?: string | null;
  onGenerated: () => Promise<void> | void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
};

export default function GenerateFixtureButton({ eventId, eventFormat, onGenerated, onSuccess, onError, disabled = false, size = 'medium' }: Props) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<FixtureRegenerationPreview | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const loadPreview = async (teamStartRound?: number) => {
    try {
      setLoading(true);
      setDialogError(null);
      const nextPreview = await previewFixtureRegeneration(eventId, teamStartRound);
      setPreview(nextPreview);
      setOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to preview fixture';
      if (open) setDialogError(message);
      else onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!preview) return;
    try {
      setLoading(true);
      setDialogError(null);
      const result = await applyFixtureRegeneration(preview);
      const successMessage = `Fixture reconciled. ${preview.preservedMatchCount} started matches were preserved and ` +
        `${result.reused_match_count} scheduled matches were reused; ${result.inserted_match_count} were created.`;
      await onGenerated();
      setOpen(false);
      setPreview(null);
      onSuccess?.(successMessage);
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : 'Failed to generate fixture');
    } finally {
      setLoading(false);
    }
  };

  const supported = eventFormat === 'round_robin' || eventFormat === 'groups';

  return (
    <>
      <Button
        variant="contained"
        size={size}
        onClick={() => void loadPreview()}
        disabled={loading || !supported || disabled}
      >
        {loading && !open ? 'Preparing...' : 'Generate Fixture'}
      </Button>

      <Dialog open={open} onClose={loading ? undefined : () => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          Reconcile fixture?
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="warning">
              Played, in-progress, and scored matches will remain unchanged. Scheduled league matches without a result may be moved or replaced to complete the configured fixture.
            </Alert>

            {dialogError && <Alert severity="error">{dialogError}</Alert>}

            {preview && (
              <>
                <Typography>
                  Last started round: <strong>{preview.lastStartedRound || 'None'}</strong><br />
                  Earliest scheduled round affected: <strong>{preview.firstEditableRound}</strong><br />
                  Last planned round: <strong>{preview.lastExistingRound}</strong><br />
                  Started matches preserved: <strong>{preview.preservedMatchCount}</strong>
                </Typography>

                {preview.joiningTeamNames.length > 0 && (
                  <Alert severity="info">
                    Joining {preview.joiningTeamNames.length === 1 ? 'team' : 'teams'}:{' '}
                    {preview.joiningTeamNames.join(', ')}
                  </Alert>
                )}

                <Typography variant="body2" color="text.secondary">
                  {`${preview.scheduledMatchesToReplace} scheduled matches will be replaced with ${preview.plannedMatchCount} reconciled matches. ` +
                    `The fixture will use rounds 1–${preview.lastExistingRound}.`}
                </Typography>

                <Stack spacing={0.75} sx={{ maxHeight: 220, overflowY: 'auto' }}>
                  {preview.rounds.map((round) => (
                    <Typography key={round.roundNumber} variant="body2">
                      <strong>Round {round.roundNumber}:</strong>{' '}
                      {round.currentMatchCount} current → {round.plannedMatchCount} planned
                      {round.restingTeamNames.length > 0
                        ? ` · Resting: ${round.restingTeamNames.join(', ')}`
                        : ''}
                    </Typography>
                  ))}
                </Stack>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={() => void handleApply()}
            disabled={loading || !preview}
          >
            {loading
              ? 'Saving...'
              : 'Reconcile Fixture'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
