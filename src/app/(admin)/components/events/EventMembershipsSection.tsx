'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import type { EventMembershipSummary } from '@/models/eventMembership';

type Props = {
  eventId: number;
};

const PAGE_SIZE = 25;

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function getControlStatus(membership: EventMembershipSummary) {
  if (!membership.can_play) return { label: 'blocked', color: 'error' as const };
  if (membership.balance_due <= 0) return { label: 'paid', color: 'success' as const };
  if (membership.appearances_count > 0) return { label: 'played unpaid', color: 'warning' as const };
  return { label: 'pending', color: 'primary' as const };
}

export default function EventMembershipsSection({ eventId }: Props) {
  const [memberships, setMemberships] = useState<EventMembershipSummary[]>([]);
  const [paymentByMembership, setPaymentByMembership] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [pageByTeam, setPageByTeam] = useState<Record<string, number>>({});

  const summary = useMemo(() => {
    return memberships.reduce(
      (acc, membership) => {
        acc.total += 1;
        if (membership.status === 'paid') acc.paid += 1;
        if (membership.balance_due > 0) acc.pending += 1;
        if (membership.appearances_count > 0 && membership.balance_due > 0) acc.playedUnpaid += 1;
        if (!membership.can_play) acc.blocked += 1;
        return acc;
      },
      { total: 0, paid: 0, pending: 0, playedUnpaid: 0, blocked: 0 }
    );
  }, [memberships]);

  const teamGroups = useMemo(() => {
    const groups = new Map<string, EventMembershipSummary[]>();

    memberships.forEach((membership) => {
      const key = membership.team_name ?? 'Unassigned';
      const current = groups.get(key) ?? [];
      current.push(membership);
      groups.set(key, current);
    });

    return Array.from(groups.entries()).map(([teamName, rows]) => ({
      teamName,
      rows,
    }));
  }, [memberships]);

  const activeTeam = teamGroups.some((group) => group.teamName === selectedTeam)
    ? selectedTeam
    : teamGroups[0]?.teamName ?? '';

  useEffect(() => {
    if (teamGroups.length === 0) {
      setSelectedTeam('');
      return;
    }

    if (!selectedTeam || !teamGroups.some((group) => group.teamName === selectedTeam)) {
      setSelectedTeam(teamGroups[0].teamName);
    }
  }, [selectedTeam, teamGroups]);

  useEffect(() => {
    setPageByTeam((currentPages) => {
      let changed = false;
      const nextPages = { ...currentPages };

      teamGroups.forEach((group) => {
        const maxPage = Math.max(Math.ceil(group.rows.length / PAGE_SIZE) - 1, 0);
        const currentPage = nextPages[group.teamName] ?? 0;

        if (currentPage > maxPage) {
          nextPages[group.teamName] = maxPage;
          changed = true;
        }
      });

      return changed ? nextPages : currentPages;
    });
  }, [teamGroups]);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const response = await fetch(`/api/admin/event-memberships?eventId=${eventId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error ?? 'Failed to load memberships');
      }

      setMemberships(result.data ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load memberships');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('admin_checkout_session_id');

    if (!sessionId) return;

    const confirmCheckout = async () => {
      try {
        setSaving(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        const response = await fetch('/api/stripe/admin-event-membership-checkout/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error ?? 'Failed to confirm payment');
        }

        if (result.paid) {
          setSuccessMessage('Payment confirmed and membership balance updated.');
          await loadData();
        }

        window.history.replaceState({}, '', window.location.pathname);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to confirm payment');
      } finally {
        setSaving(false);
      }
    };

    confirmCheckout();
  }, []);

  const handleAddPayment = async (membership: EventMembershipSummary) => {
    const amount = Number(paymentByMembership[membership.id] ?? 0);

    if (!Number.isFinite(amount) || amount <= 0 || amount > membership.balance_due) {
      setErrorMessage(`Payment must be greater than 0 and no more than ${formatMoney(membership.balance_due)}.`);
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const response = await fetch('/api/stripe/admin-event-membership-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          membershipId: membership.id,
          amount,
          returnPath: window.location.pathname,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error ?? 'Failed to start checkout');
      }

      if (!result.checkout_url) {
        throw new Error('Stripe did not return a checkout URL.');
      }

      window.location.href = result.checkout_url;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to start checkout');
      setSaving(false);
    }
  };

  const handleAddAppearance = async (membership: EventMembershipSummary) => {
    try {
      setSaving(true);
      setErrorMessage(null);
      const response = await fetch(`/api/admin/event-memberships/${membership.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'count_game' }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error ?? 'Failed to update appearances');
      }

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
        <Typography variant="h6">Player Payment Control</Typography>
        <Typography variant="body2" color="text.secondary">
          Players are pulled from the teams assigned to this event. Payment and game eligibility are tracked per player.
        </Typography>
      </Stack>

      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
      {successMessage && <Alert severity="success">{successMessage}</Alert>}
      {loading && <Typography>Loading memberships...</Typography>}

      {!loading && memberships.length === 0 && (
        <Alert severity="info">No active players were found on the teams assigned to this event.</Alert>
      )}

      {!loading && memberships.length > 0 && (
        <Stack spacing={2}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(5, minmax(120px, 1fr))' },
            gap: 1,
          }}
        >
          {[
            ['Players', summary.total],
            ['Paid', summary.paid],
            ['Pending', summary.pending],
            ['Played unpaid', summary.playedUnpaid],
            ['Blocked', summary.blocked],
          ].map(([label, value]) => (
            <Paper key={label} variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="h6" fontWeight={800}>
                {value}
              </Typography>
            </Paper>
          ))}
        </Box>

        <Paper variant="outlined">
          <Tabs
            value={activeTeam}
            onChange={(_event, value) => setSelectedTeam(value)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {teamGroups.map((group) => (
              <Tab
                key={group.teamName}
                value={group.teamName}
                label={`${group.teamName} (${group.rows.length})`}
              />
            ))}
          </Tabs>
        </Paper>

        {teamGroups
          .filter((group) => group.teamName === activeTeam)
          .map((group) => {
            const page = pageByTeam[group.teamName] ?? 0;
            const rows = group.rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

            return (
              <TableContainer key={group.teamName} component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Player</TableCell>
                      <TableCell>Document</TableCell>
                      <TableCell>Paid</TableCell>
                      <TableCell>Balance</TableCell>
                      <TableCell>Games</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Payment</TableCell>
                      <TableCell align="right">Game Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((membership) => {
                      const paymentValue = paymentByMembership[membership.id] ?? '';
                      const paymentAmount = Number(paymentValue);
                      const invalidPayment =
                        paymentValue !== '' &&
                        (!Number.isFinite(paymentAmount) ||
                          paymentAmount <= 0 ||
                          paymentAmount > membership.balance_due);
                      const controlStatus = getControlStatus(membership);

                      return (
                        <TableRow key={membership.id} hover>
                          <TableCell>{membership.player_name ?? `#${membership.player_id}`}</TableCell>
                          <TableCell>{membership.player_document_id ?? '-'}</TableCell>
                          <TableCell>{formatMoney(membership.amount_paid)}</TableCell>
                          <TableCell>{formatMoney(membership.balance_due)}</TableCell>
                          <TableCell>{membership.appearances_count} / 4 free</TableCell>
                          <TableCell>
                            <Chip
                              label={controlStatus.label}
                              color={controlStatus.color}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" alignItems={"center"} spacing={1} justifyContent="flex-end">
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
                                error={invalidPayment}
                                helperText={
                                  paymentAmount > membership.balance_due
                                    ? `Max ${formatMoney(membership.balance_due)}`
                                    : ' '
                                }
                                sx={{ width: 110 }}
                              />
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleAddPayment(membership)}
                                disabled={
                                  saving ||
                                  membership.balance_due <= 0 ||
                                  !Number.isFinite(paymentAmount) ||
                                  paymentAmount <= 0 ||
                                  paymentAmount > membership.balance_due
                                }
                              >
                                Checkout
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
                <TablePagination
                  component="div"
                  count={group.rows.length}
                  page={page}
                  onPageChange={(_event, nextPage) =>
                    setPageByTeam((prev) => ({
                      ...prev,
                      [group.teamName]: nextPage,
                    }))
                  }
                  rowsPerPage={PAGE_SIZE}
                  rowsPerPageOptions={[PAGE_SIZE]}
                />
              </TableContainer>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
