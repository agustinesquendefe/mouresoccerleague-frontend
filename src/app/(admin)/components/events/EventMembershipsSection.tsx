'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import type { Player } from '@/models/player';
import type { EventMembershipSummary } from '@/models/eventMembership';
import { getPlayers } from '@/services/players';
import {
  addEventMembershipPayment,
  getEventMemberships,
  incrementEventMembershipAppearance,
  upsertEventMembership,
} from '@/services/eventMemberships';

type Props = {
  eventId: number;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function getStatusColor(status: EventMembershipSummary['status']) {
  if (status === 'paid') return 'success';
  if (status === 'blocked') return 'error';
  if (status === 'warning') return 'warning';
  return 'primary';
}

export default function EventMembershipsSection({ eventId }: Props) {
  const [memberships, setMemberships] = useState<EventMembershipSummary[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [paymentByMembership, setPaymentByMembership] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const assignedPlayerIds = useMemo(
    () => new Set(memberships.map((membership) => membership.player_id)),
    [memberships]
  );

  const availablePlayers = useMemo(
    () => players.filter((player) => !assignedPlayerIds.has(player.id)),
    [players, assignedPlayerIds]
  );

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const [membershipRows, playerRows] = await Promise.all([
        getEventMemberships(eventId),
        getPlayers(),
      ]);
      setMemberships(membershipRows);
      setPlayers(playerRows);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load memberships');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId]);

  const handleAddPlayer = async () => {
    if (!selectedPlayer) return;

    try {
      setSaving(true);
      setErrorMessage(null);
      await upsertEventMembership({
        eventId,
        playerId: selectedPlayer.id,
      });
      setSelectedPlayer(null);
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to add player');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPayment = async (membership: EventMembershipSummary) => {
    const amount = Number(paymentByMembership[membership.id] ?? 0);

    try {
      setSaving(true);
      setErrorMessage(null);
      await addEventMembershipPayment(membership.id, membership.amount_paid, amount);
      setPaymentByMembership((prev) => ({ ...prev, [membership.id]: '' }));
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to register payment');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAppearance = async (membership: EventMembershipSummary) => {
    try {
      setSaving(true);
      setErrorMessage(null);
      await incrementEventMembershipAppearance(membership.id, membership.appearances_count);
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update appearances');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack spacing={1}>
        <Typography variant="h6">Memberships</Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems="flex-start">
          <Autocomplete
            options={availablePlayers}
            getOptionLabel={(option) =>
              `${option.full_name} (${option.document_id || 'No document'})`
            }
            value={selectedPlayer}
            onChange={(_event, value) => setSelectedPlayer(value)}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Player"
                helperText="Add a player to track this event's membership."
              />
            )}
            sx={{ minWidth: { xs: '100%', md: 420 } }}
            disabled={loading || saving}
          />
          <Button
            variant="contained"
            onClick={handleAddPlayer}
            disabled={!selectedPlayer || loading || saving}
            sx={{ minHeight: 56 }}
          >
            Add
          </Button>
        </Stack>
      </Stack>

      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
      {loading && <Typography>Loading memberships...</Typography>}

      {!loading && memberships.length === 0 && (
        <Alert severity="info">No players are being tracked for this event yet.</Alert>
      )}

      {!loading && memberships.length > 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Player</TableCell>
                <TableCell>Document</TableCell>
                <TableCell>Ticket</TableCell>
                <TableCell>Paid</TableCell>
                <TableCell>Balance</TableCell>
                <TableCell>Appearances</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Payment</TableCell>
                <TableCell align="right">Play</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {memberships.map((membership) => {
                const paymentValue = paymentByMembership[membership.id] ?? '';

                return (
                  <TableRow key={membership.id} hover>
                    <TableCell>{membership.player_name ?? `#${membership.player_id}`}</TableCell>
                    <TableCell>{membership.player_document_id ?? '-'}</TableCell>
                    <TableCell>{formatMoney(membership.membership_price)}</TableCell>
                    <TableCell>{formatMoney(membership.amount_paid)}</TableCell>
                    <TableCell>{formatMoney(membership.balance_due)}</TableCell>
                    <TableCell>
                      {membership.appearances_count} / 4 free
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={membership.can_play ? membership.status : 'blocked'}
                        color={getStatusColor(membership.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <TextField
                          size="small"
                          type="number"
                          value={paymentValue}
                          onChange={(event) =>
                            setPaymentByMembership((prev) => ({
                              ...prev,
                              [membership.id]: event.target.value,
                            }))
                          }
                          inputProps={{ min: 0, step: '0.01' }}
                          sx={{ width: 110 }}
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleAddPayment(membership)}
                          disabled={saving || Number(paymentValue) <= 0}
                        >
                          Add
                        </Button>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="outlined"
                        size="small"
                        color={membership.can_play ? 'primary' : 'error'}
                        onClick={() => handleAddAppearance(membership)}
                        disabled={saving || !membership.can_play}
                      >
                        Count
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
