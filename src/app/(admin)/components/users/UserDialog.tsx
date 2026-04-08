'use client';

import { useEffect, useState } from 'react';
import {
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
  TextField,
} from '@mui/material';
import type { Profile, ProfileFormData } from '@/models/profile';

type UserDialogProps = {
  open: boolean;
  profile: Profile | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (values: ProfileFormData) => Promise<void>;
};

const initialValues: ProfileFormData = {
  full_name: '',
  role: 'viewer',
};

export default function UserDialog({ open, profile, loading, onClose, onSubmit }: UserDialogProps) {
  const [form, setForm] = useState<ProfileFormData>(initialValues);

  useEffect(() => {
    if (open && profile) {
      setForm({
        full_name: profile.full_name ?? '',
        role: profile.role ?? 'viewer',
      });
    }
  }, [open, profile]);

  const handleChange = (field: keyof ProfileFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Email"
              value={profile?.email ?? ''}
              disabled
              size="small"
              fullWidth
            />
            <TextField
              label="Full Name"
              value={form.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              size="small"
              fullWidth
              required
            />
            <FormControl size="small" fullWidth required>
              <InputLabel>Role</InputLabel>
              <Select
                value={form.role}
                label="Role"
                onChange={(e) => handleChange('role', e.target.value as ProfileFormData['role'])}
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="editor">Editor</MenuItem>
                <MenuItem value="viewer">Viewer</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="contained" loading={loading}>Save</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
