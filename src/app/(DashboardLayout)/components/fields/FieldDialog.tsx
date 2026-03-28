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
import type { Field, FieldFormData } from '@/models/field';
import { checkFieldConflicts } from '@/services/fields';

type FieldDialogProps = {
  open: boolean;
  mode: 'create' | 'edit';
  field?: Field | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: FieldFormData) => Promise<void>;
};

type ConflictState = {
  nameExists: boolean;
  keyExists: boolean;
};

const initialValues: FieldFormData = {
  name: '',
  key: '',
  field_type: 'outside',
  is_active: true,
  notes: '',
  supported_formats: [],
};

const initialConflicts: ConflictState = {
  nameExists: false,
  keyExists: false,
};

function generateFieldKey(name: string): string {
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

export default function FieldDialog({
  open,
  mode,
  field,
  loading = false,
  onClose,
  onSubmit,
}: FieldDialogProps) {
  const [values, setValues] = useState<FieldFormData>(initialValues);
  const [conflicts, setConflicts] = useState(initialConflicts);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && field) {
      setValues({
        name: field.name ?? '',
        key: field.key ?? '',
        field_type: field.field_type ?? 'outside',
        is_active: field.is_active ?? true,
        notes: field.notes ?? '',
        supported_formats:
          field.field_formats?.map((item) => item.format_type) ?? [],
      });
      setConflicts(initialConflicts);
      setSubmitError(null);
      return;
    }

    setValues(initialValues);
    setConflicts(initialConflicts);
    setSubmitError(null);
  }, [open, mode, field]);

  const generatedKey = useMemo(() => generateFieldKey(values.name), [values.name]);

  useEffect(() => {
    if (!open) return;

    setValues((prev) => ({
      ...prev,
      key: generatedKey,
    }));
  }, [generatedKey, open]);

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

        const result = await checkFieldConflicts(
          trimmedName,
          trimmedKey,
          mode === 'edit' && field ? field.id : undefined
        );

        setConflicts(result);
      } catch (error) {
        console.error(error);
      } finally {
        setCheckingConflicts(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [open, values.name, values.key, mode, field]);

  const handleChange = (
    fieldName: keyof FieldFormData,
    value: string | boolean
  ) => {
    setSubmitError(null);

    setValues((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const hasConflicts = conflicts.nameExists || conflicts.keyExists;

  const isDisabled =
    !values.name.trim() ||
    !values.key.trim() ||
    values.supported_formats.length === 0 ||
    loading ||
    checkingConflicts ||
    hasConflicts;

  const handleSubmit = async () => {
    try {
      setSubmitError(null);

      const latestConflicts = await checkFieldConflicts(
        values.name.trim(),
        values.key.trim(),
        mode === 'edit' && field ? field.id : undefined
      );

      setConflicts(latestConflicts);

      if (latestConflicts.nameExists || latestConflicts.keyExists) {
        setSubmitError('Please resolve duplicate values before saving.');
        return;
      }

      await onSubmit({
        name: values.name.trim(),
        key: values.key.trim(),
        field_type: values.field_type,
        is_active: values.is_active,
        notes: values.notes.trim(),
        supported_formats: values.supported_formats
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save field';
      setSubmitError(message);
    }
  };

  const handleFormatToggle = (format: '5v5' | '7v7' | '11v11') => {
    setValues((prev) => {
      const exists = prev.supported_formats.includes(format);

      return {
        ...prev,
        supported_formats: exists
          ? prev.supported_formats.filter((item) => item !== format)
          : [...prev.supported_formats, format],
      };
    });
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{mode === 'create' ? 'Create Field' : 'Edit Field'}</DialogTitle>

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
              helperText={conflicts.nameExists ? 'A field with this name already exists.' : ' '}
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
              select
              label="Field Type"
              value={values.field_type}
              onChange={(e) => handleChange('field_type', e.target.value)}
              fullWidth
            >
              <MenuItem value="inside">Inside</MenuItem>
              <MenuItem value="outside">Outside</MenuItem>
            </TextField>

            <Stack spacing={1}>
              <Box component="label" sx={{ fontSize: 14, fontWeight: 500 }}>
                Supported Formats
              </Box>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={values.supported_formats.includes('5v5')}
                    onChange={() => handleFormatToggle('5v5')}
                  />
                }
                label="5v5"
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={values.supported_formats.includes('7v7')}
                    onChange={() => handleFormatToggle('7v7')}
                  />
                }
                label="7v7"
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={values.supported_formats.includes('11v11')}
                    onChange={() => handleFormatToggle('11v11')}
                  />
                }
                label="11v11"
              />
            </Stack>

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