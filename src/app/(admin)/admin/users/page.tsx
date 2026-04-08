'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PageContainer from '@/app/(admin)/components/container/PageContainer';
import UsersTable from '@/app/(admin)/components/users/UsersTable';
import UserDialog from '@/app/(admin)/components/users/UserDialog';
import { getProfiles, updateProfile, deleteProfile } from '@/services/profiles';
import { supabase } from '@/lib/supabaseClient';
import type { Profile, ProfileFormData } from '@/models/profile';

export default function UsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  const [editOpen, setEditOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (message: string, severity: 'success' | 'error') => {
    setToast({ open: true, message, severity });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [data, { data: userData }] = await Promise.all([
        getProfiles(),
        supabase.auth.getUser(),
      ]);
      setProfiles(data);
      setCurrentUserId(userData.user?.id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Edit
  const handleEdit = (profile: Profile) => {
    setSelectedProfile(profile);
    setEditOpen(true);
  };

  const handleEditSubmit = async (values: ProfileFormData) => {
    if (!selectedProfile) return;
    try {
      setSaving(true);
      await updateProfile(selectedProfile.id, values);
      showToast('User updated successfully', 'success');
      setEditOpen(false);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update user', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDeleteClick = (profile: Profile) => {
    setProfileToDelete(profile);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!profileToDelete) return;
    try {
      setSaving(true);
      await deleteProfile(profileToDelete.id);
      showToast('User deleted successfully', 'success');
      setDeleteOpen(false);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete user', 'error');
    } finally {
      setSaving(false);
      setProfileToDelete(null);
    }
  };

  // Invite
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setInviting(true);
      const { error } = await supabase.auth.signInWithOtp({
        email: inviteEmail,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      showToast(`Invitation sent to ${inviteEmail}`, 'success');
      setInviteOpen(false);
      setInviteEmail('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send invitation', 'error');
    } finally {
      setInviting(false);
    }
  };

  return (
    <PageContainer title="Users" description="Manage admin users">
      <Box>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Box>
            <Typography variant="h5" fontWeight={700}>Users</Typography>
            <Typography variant="body2" color="text.secondary">
              Manage who can access the admin panel.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setInviteOpen(true)}
          >
            Invite User
          </Button>
        </Stack>

        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : profiles.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={6}>
            No users found.
          </Typography>
        ) : (
          <UsersTable
            profiles={profiles}
            currentUserId={currentUserId}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
          />
        )}
      </Box>

      {/* Edit dialog */}
      <UserDialog
        open={editOpen}
        profile={selectedProfile}
        loading={saving}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEditSubmit}
      />

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove{' '}
            <strong>{profileToDelete?.full_name ?? profileToDelete?.email}</strong>? This will
            delete their profile but not their authentication account.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={saving}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            loading={saving}
            onClick={handleDeleteConfirm}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="xs" fullWidth>
        <form onSubmit={handleInviteSubmit}>
          <DialogTitle>Invite User</DialogTitle>
          <DialogContent>
            <DialogContentText mb={2}>
              Enter the email address of the person you want to invite. They will receive a magic
              link to access the admin panel.
            </DialogContentText>
            <TextField
              label="Email address"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              size="small"
              fullWidth
              required
              autoFocus
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInviteOpen(false)} disabled={inviting}>Cancel</Button>
            <Button type="submit" variant="contained" loading={inviting}>
              Send Invite
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))}>
          {toast.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
}
