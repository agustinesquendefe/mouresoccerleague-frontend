'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import type { Referee } from '@/models/referee';

type RefereeFormValues = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
};

type RefereeFormDialogProps = {
  open: boolean;
  referee?: Referee | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: RefereeFormValues) => Promise<void> | void;
};

const defaultValues: RefereeFormValues = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  status: 'active',
};

export default function RefereeFormDialog({
  open,
  referee,
  loading = false,
  onClose,
  onSubmit,
}: RefereeFormDialogProps) {
  const [form, setForm] = useState<RefereeFormValues>(defaultValues);

  useEffect(() => {
    if (referee) {
      setForm({
        first_name: referee.first_name ?? '',
        last_name: referee.last_name ?? '',
        email: referee.email ?? '',
        phone: referee.phone ?? '',
        status: referee.status ?? 'active',
      });
      return;
    }

    setForm(defaultValues);
  }, [referee, open]);

  const handleChange =
    (field: keyof RefereeFormValues) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleSubmit = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) return;

    await onSubmit({
      ...form,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    });
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{referee ? 'Edit Referee' : 'Create Referee'}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="First Name"
            value={form.first_name}
            onChange={handleChange('first_name')}
            fullWidth
            required
          />

          <TextField
            label="Last Name"
            value={form.last_name}
            onChange={handleChange('last_name')}
            fullWidth
            required
          />

          <TextField
            label="Email"
            value={form.email}
            onChange={handleChange('email')}
            fullWidth
          />

          <TextField
            label="Phone"
            value={form.phone}
            onChange={handleChange('phone')}
            fullWidth
          />

          <TextField
            select
            label="Status"
            value={form.status}
            onChange={handleChange('status')}
            fullWidth
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {referee ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}