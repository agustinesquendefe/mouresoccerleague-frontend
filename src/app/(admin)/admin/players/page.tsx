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
import PageContainer from '@/app/(admin)/components/container/PageContainer';
import type { Player, PlayerFormData } from '@/models/player';
import PlayerDialog from '@/app/(admin)/components/players/PlayerDialog';
import PlayersTable from '@/app/(admin)/components/players/PlayersTable';
import {
  createPlayer,
  deletePlayer,
  getPlayers,
  updatePlayer,
} from '@/services/players';
import { setPlayerCategories } from '@/services/playerCategories';
import { uploadImage } from '@/services/storage/uploadImage';
import { getPlayersPaginated } from '@/services/players/getPlayersPaginated';
import PlayersFilters from '../../components/players/PlayersFilters';

const PAGE_SIZE = 20;

export default function PlayersPage() {
  const [rows, setRows] = useState<Player[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
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
  }, [page, submittedSearch]);

  const showToast = (message: string, severity: 'success' | 'error') => {
    setToast({ open: true, message, severity });
  };

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const result = await getPlayersPaginated({
        page,
        pageSize: PAGE_SIZE,
        search: submittedSearch,
      });

      setRows(result.rows);
      setCount(result.count);
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

  const handleSubmit = async (values: PlayerFormData, categoryIds: number[], photoFile: File | null) => {
    try {
      setSaving(true);

      if (dialogMode === 'create') {
        const created = await createPlayer(values);

        if (photoFile) {
          const ext = photoFile.name.split('.').pop() ?? 'jpg';
          const { publicUrl } = await uploadImage({
            bucket: 'players',
            path: `${created.id}.${ext}`,
            file: photoFile,
          });
          await updatePlayer(created.id, { ...values, photo_url: publicUrl });
          setRows((prev) => [{ ...created, photo_url: publicUrl }, ...prev]);
        } else {
          setRows((prev) => [created, ...prev]);
        }

        await setPlayerCategories(created.id, categoryIds);
        showToast('Player created successfully', 'success');
      } else if (selectedPlayer) {
        let photoUrl = values.photo_url;

        if (photoFile) {
          const ext = photoFile.name.split('.').pop() ?? 'jpg';
          const { publicUrl } = await uploadImage({
            bucket: 'players',
            path: `${selectedPlayer.id}.${ext}`,
            file: photoFile,
          });
          photoUrl = publicUrl;
        }

        const updated = await updatePlayer(selectedPlayer.id, { ...values, photo_url: photoUrl });
        await setPlayerCategories(updated.id, categoryIds);
        setRows((prev) =>
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
      setRows((prev) => prev.filter((item) => item.id !== player.id));
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

        <Stack mb={3}>
          <PlayersFilters
            initialSearch={search}
            onSearch={(value) => {
              setSearch(value);
              setSubmittedSearch(value);
              setPage(0);
            }}
          />
        </Stack>

        {loading ? (
          <Stack alignItems="center" py={6}>
            <CircularProgress />
          </Stack>
        ) : (
          <PlayersTable
            rows={rows}
            count={count}
            page={page}
            rowsPerPage={PAGE_SIZE}
            onPageChange={setPage}
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