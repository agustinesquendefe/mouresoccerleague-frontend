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
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import type { Player, PlayerFormData } from '@/models/player';
import PlayerDialog from '../components/players/PlayerDialog';
import PlayersTable from '../components/players/PlayersTable';
import {
  createPlayer,
  deletePlayer,
  getPlayers,
  updatePlayer,
} from '@/services/players';

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

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
    loadPlayers();
  }, []);

  const showToast = (message: string, severity: 'success' | 'error') => {
    setToast({ open: true, message, severity });
  };

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const data = await getPlayers();
      setPlayers(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load players';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setDialogMode('create');
    setSelectedPlayer(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (player: Player) => {
    setDialogMode('edit');
    setSelectedPlayer(player);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setSelectedPlayer(null);
  };

  const handleSubmit = async (values: PlayerFormData) => {
    try {
      setSaving(true);

      if (dialogMode === 'create') {
        const created = await createPlayer(values);
        setPlayers((prev) => [created, ...prev]);
        showToast('Player created successfully', 'success');
      } else if (selectedPlayer) {
        const updated = await updatePlayer(selectedPlayer.id, values);
        setPlayers((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
        showToast('Player updated successfully', 'success');
      }

      setDialogOpen(false);
      setSelectedPlayer(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save player';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (player: Player) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${player.full_name}"?`
    );

    if (!confirmed) return;

    try {
      await deletePlayer(player.id);
      setPlayers((prev) => prev.filter((item) => item.id !== player.id));
      showToast('Player deleted successfully', 'success');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete player';
      showToast(message, 'error');
    }
  };

  return (
    <PageContainer title="Players" description="Manage all players">
      <Box p={0}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Players
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage all registered players
            </Typography>
          </Box>

          <Button variant="contained" onClick={handleOpenCreate}>
            Create Player
          </Button>
        </Stack>

        {loading ? (
          <Stack alignItems="center" py={6}>
            <CircularProgress />
          </Stack>
        ) : players.length === 0 ? (
          <Alert severity="info">No players found.</Alert>
        ) : (
          <PlayersTable
            players={players}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
          />
        )}

        <PlayerDialog
          open={dialogOpen}
          mode={dialogMode}
          player={selectedPlayer}
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
    </PageContainer>
  );
}