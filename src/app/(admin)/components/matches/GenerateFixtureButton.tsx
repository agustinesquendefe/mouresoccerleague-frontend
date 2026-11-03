'use client';

import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import {
  applyFixtureRegeneration,
  createPendingFixtureAssignments,
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
      const usesPendingAssignments = preview.pendingAssignments.length > 0;
      let successMessage: string;
      if (usesPendingAssignments) {
        const assignmentCount = await createPendingFixtureAssignments(preview);
        successMessage = `${assignmentCount} pending team assignments created without changing scheduled matches.`;
      } else {
        const result = await applyFixtureRegeneration(preview);
        successMessage = `Fixture regenerated from round ${preview.firstEditableRound}. ` +
          `${result.inserted_match_count} scheduled matches created.`;
      }
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
          {preview?.pendingAssignments.length ? 'Add teams to future rounds?' : 'Generate a new fixture?'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity={preview?.pendingAssignments.length ? 'info' : 'warning'}>
              {preview?.pendingAssignments.length
                ? `The joining teams will be marked as pending from round ${preview.selectedTeamStartRound}. Existing matches will not be changed until each round is assigned manually.`
                : `Played and in-progress rounds will remain unchanged. All scheduled league matches from round ${preview?.firstEditableRound ?? '—'} onward will be cancelled and replaced by this new fixture.`}
            </Alert>

            {dialogError && <Alert severity="error">{dialogError}</Alert>}

            {preview && (
              <>
                <Typography>
                  Last started round: <strong>{preview.lastStartedRound || 'None'}</strong><br />
                  First editable round: <strong>{preview.firstEditableRound}</strong><br />
                  Last existing round: <strong>{preview.lastExistingRound}</strong>
                </Typography>

                {preview.joiningTeamNames.length > 0 && (
                  <Alert severity="info">
                    Joining {preview.joiningTeamNames.length === 1 ? 'team' : 'teams'}:{' '}
                    {preview.joiningTeamNames.join(', ')}
                  </Alert>
                )}

                {preview.joiningTeamNames.length > 0 && (
                  <FormControl fullWidth>
                    <InputLabel id="fixture-team-start-round-label">Teams begin in round</InputLabel>
                    <Select
                      labelId="fixture-team-start-round-label"
                      label="Teams begin in round"
                      value={preview.selectedTeamStartRound}
                      disabled={loading}
                      onChange={(event) => void loadPreview(Number(event.target.value))}
                    >
                      {preview.selectableStartRounds.map((roundNumber) => (
                        <MenuItem key={roundNumber} value={roundNumber}>Round {roundNumber}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <Typography variant="body2" color="text.secondary">
                  {preview.pendingAssignments.length > 0
                    ? `${preview.pendingAssignments.length} pending round assignments will be created. No scheduled matches will be cancelled.`
                    : `${preview.scheduledMatchesToReplace} scheduled matches will be replaced with ${preview.plannedMatchCount} matches. No rounds will be added.`}
                </Typography>

                {preview.pendingAssignments.length === 0 && <Stack spacing={0.75} sx={{ maxHeight: 220, overflowY: 'auto' }}>
                  {preview.rounds.map((round) => (
                    <Typography key={round.roundNumber} variant="body2">
                      <strong>Round {round.roundNumber}:</strong>{' '}
                      {round.currentMatchCount} current → {round.plannedMatchCount} planned
                      {round.restingTeamNames.length > 0
                        ? ` · Resting: ${round.restingTeamNames.join(', ')}`
                        : ''}
                    </Typography>
                  ))}
                </Stack>}
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
              : preview?.pendingAssignments.length
                ? 'Create Pending Assignments'
                : 'Generate New Fixture'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
