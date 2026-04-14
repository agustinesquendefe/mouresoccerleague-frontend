'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
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
  const [searchValue, setSearchValue] = useState('');
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

  // Filtrar duplicados por nombre completo (full_name) normalizado
  const normalizeName = (name: string) => name.trim().toLowerCase();
  const uniquePlayers = players.filter((player, index, self) =>
    index === self.findIndex((p) => normalizeName(p.full_name) === normalizeName(player.full_name))
  );

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Player to Team</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

          <Autocomplete
            options={uniquePlayers}
            getOptionLabel={(option) => `${option.full_name} (${option.document_id || 'Sin documento'})`}
            value={uniquePlayers.find((p) => p.id === selectedPlayerId) || null}
            onChange={(_event, newValue) => {
              setSelectedPlayerId(newValue ? newValue.id : '');
            }}
            inputValue={searchValue}
            onInputChange={(_event, newInputValue) => {
              setSearchValue(newInputValue);
            }}
            renderOption={(props, option) => {
              const { key, ...rest } = props;
              return (
                <li key={key} {...rest} style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span>{option.full_name}</span>
                  <span style={{ color: '#888', fontSize: 13 }}>{option.document_id || 'Sin documento'}</span>
                </li>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Player"
                fullWidth
                disabled={loading || uniquePlayers.length === 0}
                helperText={
                  uniquePlayers.length === 0
                    ? 'All players are already assigned to this team.'
                    : 'Search and select an available player'
                }
              />
            )}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            noOptionsText={searchValue ? 'No players found' : 'Type to search players'}
          />
          <Button
            variant="outlined"
            onClick={() => {
              // Aquí podrías agregar lógica para buscar jugadores por nombre si tienes una función para ello
              // Por ahora solo resetea el valor de búsqueda
              setSearchValue('');
            }}
            disabled={loading}
          >
            Buscar
          </Button>

          <TextField
            label="Jersey Number (Optional)"
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