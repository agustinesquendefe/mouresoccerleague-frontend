'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import type { Player } from '@/models/player';
import { addPlayersToTeam, getAvailablePlayers } from '@/services/teamPlayers';

type Props = {
  open: boolean;
  teamId: number;
  eventId?: number | null;
  onClose: () => void;
  onAdded: () => Promise<void> | void;
};

export default function AddPlayerToTeamDialog({
  open,
  teamId,
  eventId = null,
  onClose,
  onAdded,
}: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [jerseyNumbers, setJerseyNumbers] = useState<Record<number, number | ''>>({});
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;

    const loadPlayers = async () => {
      try {
        setLoadingPlayers(true);
        setErrorMessage(null);

        const data = await getAvailablePlayers(teamId, searchValue, eventId);
        if (active) {
          setPlayers(data);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Failed to load players'
          );
        }
      } finally {
        if (active) {
          setLoadingPlayers(false);
        }
      }
    };

    const timeout = setTimeout(loadPlayers, searchValue ? 300 : 0);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [open, teamId, eventId, searchValue]);

  useEffect(() => {
    if (!open) return;
    setSelectedPlayers([]);
    setSearchValue('');
    setJerseyNumbers({});
    setErrorMessage(null);
  }, [open, teamId, eventId]);

  const handleAdd = async () => {
    if (selectedPlayers.length === 0) return;

    try {
      setAddingPlayer(true);
      setErrorMessage(null);

      await addPlayersToTeam({
        teamId,
        eventId,
        players: selectedPlayers.map((player) => ({
          playerId: player.id,
          jerseyNumber:
            jerseyNumbers[player.id] === '' || jerseyNumbers[player.id] == null
              ? null
              : Number(jerseyNumbers[player.id]),
        })),
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

  const availableOptions = [
    ...selectedPlayers,
    ...players.filter(
      (player) => !selectedPlayers.some((selected) => selected.id === player.id)
    ),
  ];

  return (
    <Dialog open={open} onClose={addingPlayer ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Players to Team</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

          <Autocomplete
            multiple
            filterSelectedOptions
            options={availableOptions}
            loading={loadingPlayers}
            disabled={addingPlayer}
            getOptionLabel={(option) => `${getPlayerName(option)} (${option.document_id || 'Sin documento'})`}
            value={selectedPlayers}
            onChange={(_event, newValue) => {
              setSelectedPlayers(newValue);
              setSearchValue('');
              setJerseyNumbers((current) =>
                Object.fromEntries(
                  newValue.map((player) => [player.id, current[player.id] ?? ''])
                )
              );
            }}
            inputValue={searchValue}
            onInputChange={(_event, newInputValue, reason) => {
              if (reason === 'input' || reason === 'clear') {
                setSearchValue(newInputValue);
              }
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
                    : 'Search and select one or more available players'
                }
              />
            )}
            renderTags={() => null}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            noOptionsText={searchValue ? 'No players found' : 'Type to search players'}
          />

          {selectedPlayers.length > 0 && (
            <Stack spacing={1.5}>
              <Typography variant="subtitle2">
                Selected players ({selectedPlayers.length})
              </Typography>
              <Box
                sx={{
                  maxHeight: 280,
                  overflowY: 'auto',
                  pr: 0.5,
                }}
              >
                <Stack spacing={1}>
                  {selectedPlayers.map((player) => (
                    <Stack
                      key={player.id}
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      alignItems={{ xs: 'stretch', sm: 'center' }}
                      sx={{
                        p: 1,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                      }}
                    >
                      <Chip
                        label={getPlayerName(player)}
                        onDelete={() => {
                          setSelectedPlayers((current) =>
                            current.filter((selected) => selected.id !== player.id)
                          );
                          setJerseyNumbers((current) => {
                            const next = { ...current };
                            delete next[player.id];
                            return next;
                          });
                        }}
                        disabled={addingPlayer}
                        sx={{
                          flex: 1,
                          justifyContent: 'space-between',
                          minWidth: 0,
                        }}
                      />
                      <TextField
                        label="Jersey number"
                        type="number"
                        size="small"
                        value={jerseyNumbers[player.id] ?? ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          setJerseyNumbers((current) => ({
                            ...current,
                            [player.id]: value === '' ? '' : Number(value),
                          }));
                        }}
                        disabled={addingPlayer}
                        slotProps={{ htmlInput: { min: 0 } }}
                        sx={{ width: { xs: '100%', sm: 150 }, flexShrink: 0 }}
                      />
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </Stack>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={addingPlayer}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleAdd}
          disabled={addingPlayer || selectedPlayers.length === 0}
        >
          {addingPlayer
            ? 'Adding...'
            : selectedPlayers.length > 0
              ? `Add ${selectedPlayers.length} Player${selectedPlayers.length === 1 ? '' : 's'}`
              : 'Add Players'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
