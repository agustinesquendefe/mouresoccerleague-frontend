'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import TeamDialog from '@/app/(admin)/components/teams/TeamDialog';
import TeamsTable from '@/app/(admin)/components/teams/TeamsTable';
import type { Team, TeamFormData } from '@/models/team';
import { getTeamsWithCategories, createTeam, updateTeam, deleteTeam } from '@/services/teams';

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    loadTeams();
  }, []);

  const showToast = (message: string, severity: 'success' | 'error') => {
    setToast({ open: true, message, severity });
  };

  const loadTeams = async () => {
    try {
      setLoading(true);
      const data = await getTeamsWithCategories();
      setTeams(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load teams';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setDialogMode('create');
    setSelectedTeam(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (team: any) => {
    // Si el equipo tiene 'categories', mapear a category_ids para el diálogo
    const category_ids = Array.isArray(team.categories)
      ? team.categories.map((cat: any) => cat.id)
      : team.category_ids || [];
    setDialogMode('edit');
    setSelectedTeam({ ...team, category_ids });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setSelectedTeam(null);
  };

  const handleSubmit = async (values: TeamFormData) => {
    try {
      setSaving(true);
      if (dialogMode === 'create') {
        await createTeam(values);
        showToast('Team created successfully', 'success');
      } else if (selectedTeam) {
        await updateTeam(selectedTeam.id, values);
        showToast('Team updated successfully', 'success');
      }

      // Esperar 500ms para asegurar que la relación en la base de datos esté actualizada
      await new Promise((resolve) => setTimeout(resolve, 500));
      await loadTeams();
      setDialogOpen(false);
      setSelectedTeam(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save team';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (team: Team) => {
    if (!confirm(`Are you sure you want to delete team "${team.name}"?`)) {
      return;
    }

    try {
      setSaving(true);
      await deleteTeam(team.id);
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
      showToast('Team deleted successfully', 'success');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete team';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box p={3}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Teams
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage all teams in the league
          </Typography>
        </Box>

        <Button variant="contained" onClick={handleOpenCreate}>
          Create Team
        </Button>
      </Stack>

      {loading ? (
        <Stack alignItems="center" py={6}>
          <CircularProgress />
        </Stack>
      ) : (
        <TeamsTable
          teams={teams}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
        />
      )}

      <TeamDialog
        open={dialogOpen}
        mode={dialogMode}
        team={selectedTeam}
        loading={saving}
        onClose={handleCloseDialog}
        onSubmit={handleSubmit}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          variant="filled"
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );

}