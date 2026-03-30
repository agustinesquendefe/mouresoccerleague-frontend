'use client';

import { useEffect, useMemo, useState } from 'react';
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
} from '@mui/material';
import type { Match, MatchFormData } from '@/models/match';
import type { Field } from '@/models/field';

type Props = {
  open: boolean;
  match: Match | null;
  loading?: boolean;
  teamMap: Record<number, string>;
  fields: Field[];
  onClose: () => void;
  onSubmit: (values: MatchFormData) => Promise<void>;
};

const initialValues: MatchFormData = {
  status: 'scheduled',
  score1: null,
  score2: null,
  date: null,
  field_id: null,
  field_number: null,
};

export default function MatchDialog({
  open,
  match,
  loading = false,
  teamMap,
  fields,
  onClose,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<MatchFormData>(initialValues);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !match) return;

    setValues({
      status: (match.status as MatchFormData['status']) ?? 'scheduled',
      score1: match.score1,
      score2: match.score2,
      date: match.date,
      field_id: match.field_id,
      field_number: match.field_number,
    });
    setErrorMessage(null);
  }, [open, match]);

  const selectedFieldNumber = useMemo(() => {
    if (!values.field_id) return null;
    const index = fields.findIndex((field) => field.id === values.field_id);
    return index >= 0 ? index + 1 : null;
  }, [values.field_id, fields]);

  const handleSubmit = async () => {
    try {
      setErrorMessage(null);

      if (values.status === 'played') {
        if (values.score1 === null || values.score2 === null) {
          setErrorMessage('Played matches must have both scores.');
          return;
        }
      }

      await onSubmit({
        ...values,
        field_number: selectedFieldNumber,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to update match'
      );
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Match</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

          <TextField
            label="Team 1"
            value={match ? teamMap[match.team1_id] ?? `#${match.team1_id}` : ''}
            fullWidth
            InputProps={{ readOnly: true }}
          />

          <TextField
            label="Team 2"
            value={match ? teamMap[match.team2_id] ?? `#${match.team2_id}` : ''}
            fullWidth
            InputProps={{ readOnly: true }}
          />

          <TextField
            select
            label="Status"
            value={values.status}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                status: e.target.value as MatchFormData['status'],
              }))
            }
            fullWidth
          >
            <MenuItem value="scheduled">Scheduled</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="played">Played</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </TextField>

          <Stack direction="row" spacing={2}>
            <TextField
              label="Score Team 1"
              type="number"
              value={values.score1 ?? ''}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  score1: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
              fullWidth
            />

            <TextField
              label="Score Team 2"
              type="number"
              value={values.score2 ?? ''}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  score2: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
              fullWidth
            />
          </Stack>

          <TextField
            label="Date"
            type="date"
            value={values.date ?? ''}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                date: e.target.value || null,
              }))
            }
            fullWidth
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            select
            label="Field"
            value={values.field_id ?? ''}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                field_id: e.target.value === '' ? null : Number(e.target.value),
              }))
            }
            fullWidth
          >
            {fields.map((field, index) => (
              <MenuItem key={field.id} value={field.id}>
                {field.name} — #{index + 1}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}