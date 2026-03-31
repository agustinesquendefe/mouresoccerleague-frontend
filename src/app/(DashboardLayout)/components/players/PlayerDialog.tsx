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
  Stack,
  TextField,
} from '@mui/material';
import type { Player, PlayerFormData } from '@/models/player';
import { checkPlayerConflicts } from '@/services/players';

type PlayerDialogProps = {
  open: boolean;
  mode: 'create' | 'edit';
  player?: Player | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: PlayerFormData) => Promise<void>;
};

type ConflictState = {
  keyExists: boolean;
  emailExists: boolean;
  documentExists: boolean;
};

const initialValues: PlayerFormData = {
  first_name: '',
  last_name: '',
  key: '',
  birth_date: '',
  jersey_number: null,
  phone: '',
  email: '',
  document_id: '',
  is_active: true,
  notes: '',
};

const initialConflicts: ConflictState = {
  keyExists: false,
  emailExists: false,
  documentExists: false,
};

function generatePlayerKey(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

export default function PlayerDialog({
  open,
  mode,
  player,
  loading = false,
  onClose,
  onSubmit,
}: PlayerDialogProps) {
  const [values, setValues] = useState<PlayerFormData>(initialValues);
  const [conflicts, setConflicts] = useState(initialConflicts);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && player) {
      setValues({
        first_name: player.first_name ?? '',
        last_name: player.last_name ?? '',
        key: player.key ?? '',
        birth_date: player.birth_date ?? '',
        jersey_number: player.jersey_number ?? null,
        phone: player.phone ?? '',
        email: player.email ?? '',
        document_id: player.document_id ?? '',
        is_active: player.is_active ?? true,
        notes: player.notes ?? '',
      });
      setConflicts(initialConflicts);
      setSubmitError(null);
      return;
    }

    setValues(initialValues);
    setConflicts(initialConflicts);
    setSubmitError(null);
  }, [open, mode, player]);

  const generatedKey = useMemo(
    () => generatePlayerKey(values.first_name, values.last_name),
    [values.first_name, values.last_name]
  );

  useEffect(() => {
    if (!open) return;

    setValues((prev) => ({
      ...prev,
      key: generatedKey,
    }));
  }, [generatedKey, open]);

  useEffect(() => {
    if (!open) return;

    const trimmedKey = values.key.trim();
    if (!trimmedKey) {
      setConflicts(initialConflicts);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setCheckingConflicts(true);

        const result = await checkPlayerConflicts(
          trimmedKey,
          values.email.trim(),
          values.document_id.trim(),
          mode === 'edit' && player ? player.id : undefined
        );

        setConflicts(result);
      } catch (error) {
        console.error(error);
      } finally {
        setCheckingConflicts(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [open, values.key, values.email, values.document_id, mode, player]);

  const handleChange = (
    fieldName: keyof PlayerFormData,
    value: string | number | boolean | null
  ) => {
    setSubmitError(null);

    setValues((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const hasConflicts =
    conflicts.keyExists || conflicts.emailExists || conflicts.documentExists;

  const isDisabled =
    !values.first_name.trim() ||
    !values.last_name.trim() ||
    !values.key.trim() ||
    loading ||
    checkingConflicts ||
    hasConflicts;

  const handleSubmit = async () => {
    try {
      setSubmitError(null);

      const latestConflicts = await checkPlayerConflicts(
        values.key.trim(),
        values.email.trim(),
        values.document_id.trim(),
        mode === 'edit' && player ? player.id : undefined
      );

      setConflicts(latestConflicts);

      if (
        latestConflicts.keyExists ||
        latestConflicts.emailExists ||
        latestConflicts.documentExists
      ) {
        setSubmitError('Please resolve duplicate values before saving.');
        return;
      }

      await onSubmit({
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        key: values.key.trim(),
        birth_date: values.birth_date,
        jersey_number: values.jersey_number,
        phone: values.phone.trim(),
        email: values.email.trim(),
        document_id: values.document_id.trim(),
        is_active: values.is_active,
        notes: values.notes.trim(),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save player';
      setSubmitError(message);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Create Player' : 'Edit Player'}</DialogTitle>

      <DialogContent>
        <Box mt={1}>
          <Stack spacing={2}>
            {submitError && <Alert severity="error">{submitError}</Alert>}

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="First Name"
                value={values.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Last Name"
                value={values.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                fullWidth
                required
              />
            </Stack>

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

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Birth Date"
                type="date"
                value={values.birth_date}
                onChange={(e) => handleChange('birth_date', e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Jersey Number"
                type="number"
                value={values.jersey_number ?? ''}
                onChange={(e) =>
                  handleChange(
                    'jersey_number',
                    e.target.value === '' ? null : Number(e.target.value)
                  )
                }
                fullWidth
              />
            </Stack>

            <TextField
              label="Phone"
              value={values.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              fullWidth
            />

            <TextField
              label="Email"
              value={values.email}
              onChange={(e) => handleChange('email', e.target.value)}
              fullWidth
              error={conflicts.emailExists}
              helperText={conflicts.emailExists ? 'This email is already in use.' : ' '}
            />

            <TextField
              label="Document ID"
              value={values.document_id}
              onChange={(e) => handleChange('document_id', e.target.value)}
              fullWidth
              error={conflicts.documentExists}
              helperText={
                conflicts.documentExists ? 'This document ID is already in use.' : ' '
              }
            />

            <TextField
              label="Notes"
              value={values.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              fullWidth
              multiline
              minRows={3}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={values.is_active}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                />
              }
              label="Active"
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