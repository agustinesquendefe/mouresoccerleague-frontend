'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import AddPlayerToTeamDialog from './AddPlayerToTeamDialog';
import TeamPlayersTable from './TeamPlayersTable';
import {
  getTeamPlayers,
  removePlayerFromTeam,
  type TeamPlayerRow,
} from '@/services/teamPlayers';

type Props = {
  teamId: number;
};

export default function TeamPlayersSection({ teamId }: Props) {
  const [rows, setRows] = useState<TeamPlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadRows = async () => {
    try {
      setLoading(true);
      const data = await getTeamPlayers(teamId);
      setRows(data);
    } catch (error) {
      setToast({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to load team players',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, [teamId]);

  const handleRemove = async (row: TeamPlayerRow) => {
    const confirmed = window.confirm(
      `Remove "${row.player_name ?? 'this player'}" from the team?`
    );

    if (!confirmed) return;

    try {
      await removePlayerFromTeam(row.id);
      await loadRows();

      setToast({
        open: true,
        message: 'Player removed from team successfully',
        severity: 'success',
      });
    } catch (error) {
      setToast({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to remove player',
        severity: 'error',
      });
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Players</Typography>
        <Button variant="contained" onClick={() => setDialogOpen(true)}>
          Add Player
        </Button>
      </Stack>

      {loading && <Typography>Loading players...</Typography>}

      {!loading && rows.length === 0 && (
        <Alert severity="info">No players assigned to this team yet.</Alert>
      )}

      {!loading && rows.length > 0 && (
        <TeamPlayersTable rows={rows} onRemove={handleRemove} />
      )}

      <AddPlayerToTeamDialog
        open={dialogOpen}
        teamId={teamId}
        onClose={() => setDialogOpen(false)}
        onAdded={loadRows}
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
    </Stack>
  );
}