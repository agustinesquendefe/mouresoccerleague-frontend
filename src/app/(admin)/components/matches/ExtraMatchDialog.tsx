'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from '@mui/material';
import type { Field } from '@/models/field';
import type { MatchFormData } from '@/models/match';

type Props = {
  open: boolean;
  roundNumber: number | null;
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
  penalty_score1: null,
  penalty_score2: null,
  winner_team_id: null,
  date: null,
  time: null,
  field_id: null,
  field_number: null,
  team1_id: null,
  team2_id: null,
  referee_id: null,
  referee_payments: [],
};

export default function ExtraMatchDialog({
  open,
  roundNumber,
  loading = false,
  teamMap,
  fields,
  onClose,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<MatchFormData>(initialValues);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setValues(initialValues);
    setErrorMessage('');
  }, [open]);

  const handleSubmit = async () => {
    setErrorMessage('');

    if (!values.team1_id || !values.team2_id) {
      setErrorMessage('Select both teams.');
      return;
    }

    if (values.team1_id === values.team2_id) {
      setErrorMessage('Teams must be different.');
      return;
    }

    if (values.status === 'played' && (values.score1 === null || values.score2 === null)) {
      setErrorMessage('Played matches must have both scores.');
      return;
    }

    await onSubmit(values);
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Extra Match{roundNumber ? ` - Round ${roundNumber}` : ''}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

          <TextField select label="Team 1" value={values.team1_id ?? ''} onChange={(event) => setValues((prev) => ({ ...prev, team1_id: Number(event.target.value) }))} fullWidth disabled={loading}>
            {Object.entries(teamMap).map(([id, name]) => (
              <MenuItem key={id} value={Number(id)}>
                {name} (#{id})
              </MenuItem>
            ))}
          </TextField>

          <TextField select label="Team 2" value={values.team2_id ?? ''} onChange={(event) => setValues((prev) => ({ ...prev, team2_id: Number(event.target.value) }))} fullWidth disabled={loading}>
            {Object.entries(teamMap).map(([id, name]) => (
              <MenuItem key={id} value={Number(id)}>
                {name} (#{id})
              </MenuItem>
            ))}
          </TextField>

          <TextField select label="Status" value={values.status} onChange={(event) => setValues((prev) => ({ ...prev, status: event.target.value as MatchFormData['status'] }))} fullWidth disabled={loading}>
            <MenuItem value="scheduled">Scheduled</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="played">Played</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </TextField>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Score 1" type="number" value={values.score1 ?? ''} onChange={(event) => setValues((prev) => ({ ...prev, score1: event.target.value === '' ? null : Number(event.target.value) }))} fullWidth disabled={loading} />
            <TextField label="Score 2" type="number" value={values.score2 ?? ''} onChange={(event) => setValues((prev) => ({ ...prev, score2: event.target.value === '' ? null : Number(event.target.value) }))} fullWidth disabled={loading} />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Date" type="date" value={values.date ?? ''} onChange={(event) => setValues((prev) => ({ ...prev, date: event.target.value || null }))} fullWidth disabled={loading} InputLabelProps={{ shrink: true }} />
            <TextField label="Time" type="time" value={values.time ?? ''} onChange={(event) => setValues((prev) => ({ ...prev, time: event.target.value || null }))} fullWidth disabled={loading} InputLabelProps={{ shrink: true }} />
          </Stack>

          <TextField
            select
            label="Field"
            value={values.field_id ?? ''}
            onChange={(event) => {
              const fieldId = event.target.value === '' ? null : Number(event.target.value);
              const fieldIndex = fields.findIndex((field) => field.id === fieldId);
              setValues((prev) => ({ ...prev, field_id: fieldId, field_number: fieldIndex >= 0 ? fieldIndex + 1 : null }));
            }}
            fullWidth
            disabled={loading}
          >
            <MenuItem value="">No field assigned</MenuItem>
            {fields.map((field, index) => (
              <MenuItem key={field.id} value={field.id}>
                {field.name} (#{index + 1})
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading || !roundNumber}>Add Match</Button>
      </DialogActions>
    </Dialog>
  );
}
