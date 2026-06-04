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
import TeamsFilters from '@/app/(admin)/components/teams/TeamsFilters';
import TeamsTable from '@/app/(admin)/components/teams/TeamsTable';
import type { Category } from '@/models/category';
import type { Team, TeamFormData } from '@/models/team';
import { getCategories } from '@/services/categories';
import { createTeam, updateTeam, deleteTeam, getTeamsPaginated } from '@/services/teams';

const PAGE_SIZE = 25;

function getCurrentLeagueWeekday(): number {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 7 : jsDay;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(() => getCurrentLeagueWeekday());
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
  }, [page, submittedSearch, categoryId, dayOfWeek]);

  useEffect(() => {
    getCategories().then(setCategories).catch((error) => {
      const message = error instanceof Error ? error.message : 'Failed to load categories';
      showToast(message, 'error');
    });
  }, []);

  const showToast = (message: string, severity: 'success' | 'error') => {
    setToast({ open: true, message, severity });
  };

  const loadTeams = async () => {
    try {
      setLoading(true);
      const result = await getTeamsPaginated({
        page,
        pageSize: PAGE_SIZE,
        search: submittedSearch,
        categoryId,
        dayOfWeek,
      });
      setTeams(result.rows);
      setCount(result.count);
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
    const playing_days = Array.isArray(team.playing_days) ? team.playing_days : [];
    setDialogMode('edit');
    setSelectedTeam({ ...team, category_ids, playing_days });
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
      if (teams.length === 1 && page > 0) {
        setPage((currentPage) => Math.max(currentPage - 1, 0));
      } else {
        await loadTeams();
      }
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

      <Stack mb={3}>
        <TeamsFilters
          initialSearch={search}
          initialCategoryId={categoryId}
          initialDayOfWeek={dayOfWeek}
          categories={categories}
          onFilter={(filters) => {
            setSearch(filters.search);
            setSubmittedSearch(filters.search);
            setCategoryId(filters.categoryId);
            setDayOfWeek(filters.dayOfWeek);
            setPage(0);
          }}
        />
      </Stack>

      {loading ? (
        <Stack alignItems="center" py={6}>
          <CircularProgress />
        </Stack>
      ) : (
        <TeamsTable
          teams={teams}
          count={count}
          page={page}
          rowsPerPage={PAGE_SIZE}
          onPageChange={setPage}
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
