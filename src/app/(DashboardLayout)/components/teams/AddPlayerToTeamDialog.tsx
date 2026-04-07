'use client';

import { useEffect, useState } from 'react';
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
import type { Player } from '@/models/player';
import { addPlayerToTeam, getAvailablePlayers } from '@/services/teamPlayers';

type Props = {
  open: boolean;
  teamId: number;
  onClose: () => void;
  onAdded: () => Promise<void> | void;
};

export default function AddPlayerToTeamDialog({
  open,
  teamId,
  onClose,
  onAdded,
}: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | ''>('');
  const [jerseyNumber, setJerseyNumber] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const loadPlayers = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);

        const data = await getAvailablePlayers(teamId);
        setPlayers(data);
        setSelectedPlayerId('');
        setJerseyNumber('');
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to load players'
        );
      } finally {
        setLoading(false);
      }
    };

    loadPlayers();
  }, [open, teamId]);

  const handleAdd = async () => {
    if (!selectedPlayerId) return;

    try {
      setLoading(true);
      setErrorMessage(null);

      await addPlayerToTeam({
        playerId: Number(selectedPlayerId),
        teamId,
        jerseyNumber: jerseyNumber === '' ? null : Number(jerseyNumber),
      });

      await onAdded();
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to add player'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Player to Team</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

          <TextField
            select
            label="Player"
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(Number(e.target.value))}
            fullWidth
            disabled={loading || players.length === 0}
            helperText={
              players.length === 0
                ? 'All players are already assigned to this team.'
                : 'Select an available player'
            }
          >
            {players.map((player) => (
              <MenuItem key={player.id} value={player.id}>
                {player.full_name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Jersey Number"
            type="number"
            value={jerseyNumber}
            onChange={(e) =>
              setJerseyNumber(e.target.value === '' ? '' : Number(e.target.value))
            }
            fullWidth
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleAdd}
          disabled={loading || !selectedPlayerId || players.length === 0}
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}