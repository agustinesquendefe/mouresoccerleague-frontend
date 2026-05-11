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
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState<number | ''>('');
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const loadPlayers = async () => {
      if (selectedPlayer) {
        return;
      }

      try {
        setLoadingPlayers(true);
        setErrorMessage(null);

        const data = await getAvailablePlayers(teamId, searchValue);
        setPlayers(data);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to load players'
        );
      } finally {
        setLoadingPlayers(false);
      }
    };

    const timeout = setTimeout(loadPlayers, searchValue ? 300 : 0);

    return () => clearTimeout(timeout);
  }, [open, teamId, searchValue, selectedPlayer]);

  useEffect(() => {
    if (!open) return;
    setSelectedPlayer(null);
    setSearchValue('');
    setJerseyNumber('');
  }, [open, teamId]);

  const handleAdd = async () => {
    if (!selectedPlayer) return;

    try {
      setAddingPlayer(true);
      setErrorMessage(null);

      await addPlayerToTeam({
        playerId: selectedPlayer.id,
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
      setAddingPlayer(false);
    }
  };

  const getPlayerName = (player: Player) =>
    player.full_name || `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim() || `Player #${player.id}`;

  return (
    <Dialog open={open} onClose={addingPlayer ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Player to Team</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

          <Autocomplete
            options={players}
            disabled={addingPlayer}
            getOptionLabel={(option) => `${getPlayerName(option)} (${option.document_id || 'Sin documento'})`}
            value={selectedPlayer}
            onChange={(_event, newValue) => {
              setSelectedPlayer(newValue);
              setSearchValue(newValue ? `${getPlayerName(newValue)} (${newValue.document_id || 'Sin documento'})` : '');
            }}
            inputValue={searchValue}
            onInputChange={(_event, newInputValue, reason) => {
              if (reason === 'reset') {
                return;
              }

              if (reason === 'input') {
                setSelectedPlayer(null);
              }

              setSearchValue(newInputValue);
            }}
            renderOption={(props, option) => {
              const { key, ...rest } = props;
              return (
                <li key={key} {...rest} style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span>{getPlayerName(option)}</span>
                  <span style={{ color: '#888', fontSize: 13 }}>{option.document_id || 'Sin documento'}</span>
                </li>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Player"
                fullWidth
                helperText={
                  loadingPlayers
                    ? 'Searching available players...'
                    : players.length === 0
                    ? 'Type a name, email, or document ID to search available players.'
                    : 'Search and select an available player'
                }
              />
            )}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            noOptionsText={searchValue ? 'No players found' : 'Type to search players'}
          />

          {selectedPlayer && (
            <Alert severity="info">
              Selected player: {getPlayerName(selectedPlayer)}
              {selectedPlayer.document_id ? ` (${selectedPlayer.document_id})` : ''}
            </Alert>
          )}

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
        <Button onClick={onClose} disabled={addingPlayer}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleAdd}
          disabled={addingPlayer || !selectedPlayer}
        >
          {addingPlayer ? 'Adding...' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
