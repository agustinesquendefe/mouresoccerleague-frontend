'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import type { Event, EventFormData } from '@/models/event';
import { checkEventConflicts } from '@/services/events';

type EventDialogProps = {
  open: boolean;
  mode: 'create' | 'edit';
  event?: Event | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: EventFormData) => Promise<void>;
};

type ConflictState = {
  nameExists: boolean;
  keyExists: boolean;
};

const initialValues: EventFormData = {
  key: '',
  name: '',
  league_id: 1,
  season_id: 1,
  start_date: '',
  end_date: '',
  auto: true,
  status: 'draft',
  format_type: 'round_robin',
  round_robin_cycles: 1,
};

const initialConflicts: ConflictState = {
  nameExists: false,
  keyExists: false,
};

function generateEventKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

export default function EventDialog({
  open,
  mode,
  event,
  loading = false,
  onClose,
  onSubmit,
}: EventDialogProps) {
  const [values, setValues] = useState<EventFormData>(initialValues);
  const [conflicts, setConflicts] = useState<ConflictState>(initialConflicts);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && event) {
      setValues({
        key: event.key ?? '',
        name: event.name ?? '',
        league_id: event.league_id ?? 1,
        season_id: event.season_id ?? 1,
        start_date: event.start_date ?? '',
        end_date: event.end_date ?? '',
        auto: event.auto ?? true,
        status: event.status ?? 'draft',
        format_type: event.format_type ?? 'round_robin',
        round_robin_cycles: event.round_robin_cycles ?? 1,
      });
      setConflicts(initialConflicts);
      setSubmitError(null);
      return;
    }

    setValues(initialValues);
    setConflicts(initialConflicts);
    setSubmitError(null);
  }, [open, mode, event]);

  const generatedKey = useMemo(() => generateEventKey(values.name), [values.name]);

  useEffect(() => {
    if (!open) return;

    setValues((prev) => ({
      ...prev,
      key: generatedKey,
    }));
  }, [generatedKey, open]);

  useEffect(() => {
    if (!open) return;

    if (values.format_type !== 'round_robin' && values.round_robin_cycles !== 1) {
      setValues((prev) => ({
        ...prev,
        round_robin_cycles: 1,
      }));
    }
  }, [values.format_type, values.round_robin_cycles, open]);

  useEffect(() => {
    if (!open) return;

    const trimmedName = values.name.trim();
    const trimmedKey = values.key.trim();

    if (!trimmedName || !trimmedKey) {
      setConflicts(initialConflicts);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setCheckingConflicts(true);

        const result = await checkEventConflicts(
          trimmedName,
          trimmedKey,
          mode === 'edit' && event ? event.id : undefined
        );

        setConflicts(result);
      } catch (error) {
        console.error(error);
      } finally {
        setCheckingConflicts(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [open, values.name, values.key, mode, event]);

  const handleChange = (
    field: keyof EventFormData,
    value: string | number | boolean
  ) => {
    setSubmitError(null);

    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const hasConflicts = conflicts.nameExists || conflicts.keyExists;

  const isDisabled =
    !values.name.trim() ||
    !values.key.trim() ||
    !values.start_date ||
    !values.format_type ||
    loading ||
    checkingConflicts ||
    hasConflicts;

  const handleSubmit = async () => {
    try {
      setSubmitError(null);

      const latestConflicts = await checkEventConflicts(
        values.name.trim(),
        values.key.trim(),
        mode === 'edit' && event ? event.id : undefined
      );

      setConflicts(latestConflicts);

      if (latestConflicts.nameExists || latestConflicts.keyExists) {
        setSubmitError('Please resolve duplicate values before saving.');
        return;
      }

      await onSubmit({
        key: values.key.trim(),
        name: values.name.trim(),
        league_id: Number(values.league_id),
        season_id: Number(values.season_id),
        start_date: values.start_date,
        end_date: values.end_date,
        auto: values.auto,
        status: values.status,
        format_type: values.format_type,
        round_robin_cycles:
          values.format_type === 'round_robin'
            ? Number(values.round_robin_cycles)
            : 1,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save event';
      setSubmitError(message);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Create Event' : 'Edit Event'}</DialogTitle>

      <DialogContent>
        <Box mt={1}>
          <Stack spacing={2}>
            {submitError && <Alert severity="error">{submitError}</Alert>}

            <TextField
              label="Name"
              value={values.name}
              onChange={(e) => handleChange('name', e.target.value)}
              fullWidth
              required
              error={conflicts.nameExists}
              helperText={conflicts.nameExists ? 'An event with this name already exists.' : ' '}
            />

            <TextField
              label="Key"
              value={values.key}
              fullWidth
              InputProps={{ readOnly: true }}
              error={conflicts.keyExists}
              helperText={
                conflicts.keyExists
                  ? 'This key is already in use.'
                  : 'Generated automatically from the name.'
              }
            />

            <TextField
              label="League ID"
              type="number"
              value={values.league_id}
              onChange={(e) => handleChange('league_id', Number(e.target.value))}
              fullWidth
            />

            <TextField
              label="Season ID"
              type="number"
              value={values.season_id}
              onChange={(e) => handleChange('season_id', Number(e.target.value))}
              fullWidth
            />

            <TextField
              select
              label="Format Type"
              value={values.format_type}
              onChange={(e) => handleChange('format_type', e.target.value)}
              fullWidth
            >
              <MenuItem value="round_robin">Round Robin</MenuItem>
              <MenuItem value="groups">Groups</MenuItem>
              <MenuItem value="knockout">Knockout</MenuItem>
              <MenuItem value="mixed">Mixed</MenuItem>
            </TextField>

            {values.format_type === 'round_robin' && (
              <TextField
                select
                label="Round Robin Cycles"
                value={values.round_robin_cycles}
                onChange={(e) =>
                  handleChange('round_robin_cycles', Number(e.target.value))
                }
                fullWidth
                helperText="How many full round-robin cycles this tournament will have."
              >
                <MenuItem value={1}>1 cycle</MenuItem>
                <MenuItem value={2}>2 cycles</MenuItem>
                <MenuItem value={3}>3 cycles</MenuItem>
              </TextField>
            )}

            <TextField
              label="Start Date"
              type="date"
              value={values.start_date}
              onChange={(e) => handleChange('start_date', e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="End Date"
              type="date"
              value={values.end_date}
              onChange={(e) => handleChange('end_date', e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              select
              label="Status"
              value={values.status}
              onChange={(e) => handleChange('status', e.target.value)}
              fullWidth
            >
              <MenuItem value="draft">Draft</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="archived">Archived</MenuItem>
            </TextField>

            <FormControlLabel
              control={
                <Checkbox
                  checked={values.auto}
                  onChange={(e) => handleChange('auto', e.target.checked)}
                />
              }
              label="Auto"
            />

            {checkingConflicts && (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={16} />
                <Box component="span">Checking duplicates...</Box>
              </Stack>
            )}
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>

        <Button variant="contained" onClick={handleSubmit} disabled={isDisabled}>
          {mode === 'create' ? 'Create' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}