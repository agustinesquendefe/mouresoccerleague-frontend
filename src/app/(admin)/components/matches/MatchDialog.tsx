'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import type {
  Match,
  MatchFormData,
  MatchRefereePaymentFormData,
  RefereePaymentMethod,
  RefereePaymentStatus,
} from '@/models/match';
import type { Field } from '@/models/field';
import type { Referee } from '@/models/referee';
import { getRefereeFullName } from '@/models/referee';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  open: boolean;
  match: Match | null;
  loading?: boolean;
  teamMap: Record<number, string>;
  fields: Field[];
  onClose: () => void;
  onSubmit: (values: MatchFormData) => Promise<void>;
};

const initialValues: MatchFormData = {
  status: 'scheduled',
  score1: null,
  score2: null,
  penalty_score1: null,
  penalty_score2: null,
  winner_team_id: null,
  date: null,
  time: null,
  field_id: null,
  field_number: null,
  team1_id: null,
  team2_id: null,
  referee_id: null,
  referee_payments: [],
};

const refereePaymentMethods: { value: RefereePaymentMethod; label: string }[] = [
  { value: 'stripe', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'cashapp', label: 'Cash App' },
  { value: 'venmo', label: 'Venmo' },
];

const refereePaymentStatuses: { value: RefereePaymentStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'waived', label: 'Waived' },
];

const DEFAULT_SCANNER_IDLE_MS = '350';

type PlayerSearchOption = {
  id: number;
  full_name: string | null;
  document_id: string | null;
  email: string | null;
};

type CheckoutState = {
  sessionId: string;
  checkoutUrl: string;
};

function buildPaymentRow(
  teamSlot: MatchRefereePaymentFormData['team_slot'],
  teamId: number | null,
  existing?: Partial<MatchRefereePaymentFormData>
): MatchRefereePaymentFormData {
  return {
    team_slot: teamSlot,
    team_id: teamId,
    amount: existing?.amount ?? null,
    method: existing?.method ?? null,
    status: existing?.status ?? 'pending',
    payer_player_id: existing?.payer_player_id ?? null,
    payer_document_id: existing?.payer_document_id ?? null,
    payer_name: existing?.payer_name ?? null,
    paid_at: existing?.paid_at ?? null,
    stripe_fee_amount: existing?.stripe_fee_amount ?? null,
    state_fee_amount: existing?.state_fee_amount ?? null,
    total_fee_amount: existing?.total_fee_amount ?? null,
    total_paid_amount: existing?.total_paid_amount ?? null,
    reference: existing?.reference ?? null,
    note: existing?.note ?? null,
  };
}

export default function MatchDialog({
  open,
  match,
  loading = false,
  teamMap,
  fields,
  onClose,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<MatchFormData>(initialValues);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [loadingReferees, setLoadingReferees] = useState(false);
  const [loadingRefereePayments, setLoadingRefereePayments] = useState(false);
  const [startingCheckoutSlot, setStartingCheckoutSlot] = useState<MatchRefereePaymentFormData['team_slot'] | null>(null);
  const [submitScannerOnIdle, setSubmitScannerOnIdle] = useState(false);
  const [scannerIdleMs, setScannerIdleMs] = useState(DEFAULT_SCANNER_IDLE_MS);
  const [payerTeamWarnings, setPayerTeamWarnings] = useState<Record<string, string | null>>({});
  const [payerSearchOptions, setPayerSearchOptions] = useState<Record<string, PlayerSearchOption[]>>({});
  const [loadingPayerSearch, setLoadingPayerSearch] = useState<Record<string, boolean>>({});
  const [checkoutBySlot, setCheckoutBySlot] = useState<Record<string, CheckoutState | null>>({});
  const [confirmingCheckoutSlot, setConfirmingCheckoutSlot] = useState<MatchRefereePaymentFormData['team_slot'] | null>(null);
  const scannerIdleTimersRef = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const payerSearchTimersRef = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});

  useEffect(() => {
    if (!open || !match) return;

    let active = true;

    const loadReferees = async () => {
      try {
        setLoadingReferees(true);

        const [refereesRes, matchRefereeRes, refereePaymentsRes] = await Promise.all([
          supabase
            .from('referees')
            .select('*')
            .eq('status', 'active')
            .order('first_name', { ascending: true }),
          supabase
            .from('match_referees')
            .select('referee_id')
            .eq('match_id', match.id)
            .eq('role', 'main_referee')
            .order('id', { ascending: true })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('match_referee_payments')
            .select('team_id, amount, method, status, payer_player_id, payer_document_id, payer_name, paid_at, stripe_fee_amount, state_fee_amount, total_fee_amount, total_paid_amount, reference, note')
            .eq('match_id', match.id),
        ]);

        if (!active) return;

        if (refereesRes.error) throw new Error(refereesRes.error.message);
        if (matchRefereeRes.error) throw new Error(matchRefereeRes.error.message);
        if (refereePaymentsRes.error) throw new Error(refereePaymentsRes.error.message);

        const paymentMap = new Map(
          ((refereePaymentsRes.data ?? []) as any[]).map((payment) => [
            Number(payment.team_id),
            {
              amount: payment.amount === null ? null : Number(payment.amount),
              method: payment.method as RefereePaymentMethod | null,
              status: (payment.status ?? 'pending') as RefereePaymentStatus,
              payer_player_id: payment.payer_player_id === null ? null : Number(payment.payer_player_id),
              payer_document_id: payment.payer_document_id ?? null,
              payer_name: payment.payer_name ?? null,
              paid_at: payment.paid_at ?? null,
              stripe_fee_amount: payment.stripe_fee_amount === null ? null : Number(payment.stripe_fee_amount),
              state_fee_amount: payment.state_fee_amount === null ? null : Number(payment.state_fee_amount),
              total_fee_amount: payment.total_fee_amount === null ? null : Number(payment.total_fee_amount),
              total_paid_amount: payment.total_paid_amount === null ? null : Number(payment.total_paid_amount),
              reference: payment.reference ?? null,
              note: payment.note ?? null,
            },
          ])
        );

        setReferees((refereesRes.data ?? []) as Referee[]);
        setValues((prev) => ({
          ...prev,
          referee_id: matchRefereeRes.data?.referee_id ? Number(matchRefereeRes.data.referee_id) : null,
          referee_payments: [
            buildPaymentRow('team1', prev.team1_id, prev.team1_id ? paymentMap.get(prev.team1_id) : undefined),
            buildPaymentRow('team2', prev.team2_id, prev.team2_id ? paymentMap.get(prev.team2_id) : undefined),
          ],
        }));
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load referees.');
        }
      } finally {
        if (active) {
          setLoadingReferees(false);
          setLoadingRefereePayments(false);
        }
      }
    };

    setLoadingRefereePayments(true);
    setValues({
      status: (match.status as MatchFormData['status']) ?? 'scheduled',
      score1: match.score1,
      score2: match.score2,
      penalty_score1: match.penalty_score1,
      penalty_score2: match.penalty_score2,
      winner_team_id: match.winner_team_id,
      date: match.date,
      time: match.time,
      field_id: match.field_id,
      field_number: match.field_number,
      team1_id: match.team1_id,
      team2_id: match.team2_id,
      referee_id: null,
      referee_payments: [
        buildPaymentRow('team1', match.team1_id),
        buildPaymentRow('team2', match.team2_id),
      ],
    });
    setErrorMessage(null);

    loadReferees();

    return () => {
      active = false;
    };
  }, [open, match]);

  useEffect(() => {
    return () => {
      Object.values(scannerIdleTimersRef.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
      Object.values(payerSearchTimersRef.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  const selectedFieldNumber = useMemo(() => {
    if (!values.field_id) return null;
    const index = fields.findIndex((field) => field.id === values.field_id);
    return index >= 0 ? index + 1 : null;
  }, [values.field_id, fields]);

  const isKnockout = match?.stage_type === 'knockout';
  const refereePayments = values.referee_payments ?? [];
  const isTiedRegularScore =
    values.score1 !== null &&
    values.score2 !== null &&
    values.score1 === values.score2;

  const resolvedWinnerTeamId = useMemo(() => {
    if (!match) return null;

    if (
      values.score1 !== null &&
      values.score2 !== null &&
      values.score1 > values.score2
    ) {
      return values.team1_id ?? match.team1_id;
    }

    if (
      values.score1 !== null &&
      values.score2 !== null &&
      values.score2 > values.score1
    ) {
      return values.team2_id ?? match.team2_id;
    }

    if (
      isKnockout &&
      isTiedRegularScore &&
      values.penalty_score1 !== null &&
      values.penalty_score2 !== null
    ) {
      if (values.penalty_score1 > values.penalty_score2) return values.team1_id ?? match.team1_id;
      if (values.penalty_score2 > values.penalty_score1) return values.team2_id ?? match.team2_id;
    }

    return null;
  }, [match, values.team1_id, values.team2_id, values.score1, values.score2, values.penalty_score1, values.penalty_score2, isKnockout, isTiedRegularScore]);

  const handleSubmit = async () => {
    try {
      setErrorMessage(null);

      if (values.status === 'played') {
        if (values.score1 === null || values.score2 === null) {
          setErrorMessage('Played matches must have both scores.');
          return;
        }

        if (isKnockout && values.score1 === values.score2) {
          if (values.penalty_score1 === null || values.penalty_score2 === null) {
            setErrorMessage('Knockout ties must be resolved with penalty scores.');
            return;
          }

          if (values.penalty_score1 === values.penalty_score2) {
            setErrorMessage('Penalty scores cannot end in a tie.');
            return;
          }
        }
      }

      for (const payment of refereePayments) {
        if (payment.status === 'paid') {
          if (!payment.method) {
            setErrorMessage('Paid referee payments must include a payment method.');
            return;
          }

          if (payment.amount === null || payment.amount <= 0) {
            setErrorMessage('Paid referee payments must include an amount greater than zero.');
            return;
          }

          if (!payment.payer_document_id?.trim()) {
            setErrorMessage('Paid referee payments must include the payer document ID.');
            return;
          }

          if (payment.method === 'stripe' && (!payment.paid_at || !payment.reference)) {
            setErrorMessage('Card referee payments must be captured through checkout before saving as paid.');
            return;
          }
        }
      }

      await onSubmit({
        ...values,
        team1_id: values.team1_id !== undefined ? values.team1_id : match?.team1_id ?? null,
        team2_id: values.team2_id !== undefined ? values.team2_id : match?.team2_id ?? null,
        referee_id: values.referee_id ?? null,
        referee_payments: refereePayments.map((payment) => ({
          ...payment,
          team_id:
            payment.team_slot === 'team1'
              ? values.team1_id ?? match?.team1_id ?? null
              : values.team2_id ?? match?.team2_id ?? null,
        })),
        winner_team_id: values.status === 'played' ? resolvedWinnerTeamId : null,
        field_number: selectedFieldNumber,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to update match'
      );
    }
  };

  const updateRefereePayment = (
    teamSlot: MatchRefereePaymentFormData['team_slot'],
    changes: Partial<MatchRefereePaymentFormData>
  ) => {
    setValues((prev) => ({
      ...prev,
      referee_payments: (prev.referee_payments ?? []).map((payment) =>
        payment.team_slot === teamSlot ? { ...payment, ...changes } : payment
      ),
    }));
  };

  const getPaymentTeamId = (teamSlot: MatchRefereePaymentFormData['team_slot']) => {
    if (!match) return null;

    return teamSlot === 'team1'
      ? values.team1_id ?? match.team1_id
      : values.team2_id ?? match.team2_id;
  };

  const resolvePayerByDocumentId = async (
    teamSlot: MatchRefereePaymentFormData['team_slot'],
    documentIdOverride?: string
  ) => {
    const payment = refereePayments.find((item) => item.team_slot === teamSlot);
    const documentId = (documentIdOverride ?? payment?.payer_document_id ?? '').trim();
    const teamId = getPaymentTeamId(teamSlot);

    if (!documentId) {
      setErrorMessage('Enter a payer document ID before resolving the payer.');
      return;
    }

    try {
      setErrorMessage(null);

      const { data, error } = await supabase
        .from('players')
        .select('id, full_name, document_id')
        .eq('document_id', documentId)
        .maybeSingle();

      if (error) throw new Error(error.message);

      updateRefereePayment(teamSlot, {
        payer_player_id: data?.id ? Number(data.id) : null,
        payer_document_id: data?.document_id ?? documentId,
        payer_name: data?.full_name ?? null,
      });

      if (!data) {
        setPayerTeamWarnings((prev) => ({ ...prev, [teamSlot]: null }));
        setErrorMessage('No player was found for that document ID. You can still keep the document ID manually.');
        return;
      }

      if (teamId) {
        const { data: teamPlayerRows, error: teamPlayerError } = await supabase
          .from('team_players')
          .select('id, event_id')
          .eq('player_id', data.id)
          .eq('team_id', teamId);

        if (teamPlayerError) throw new Error(teamPlayerError.message);

        const belongsToTeam = (teamPlayerRows ?? []).some(
          (row) => row.event_id === null || Number(row.event_id) === Number(match?.event_id)
        );

        setPayerTeamWarnings((prev) => ({
          ...prev,
          [teamSlot]: belongsToTeam
            ? null
            : 'This payer is not registered on the team receiving this referee payment.',
        }));
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to resolve payer.');
    }
  };

  const searchPayersByName = (teamSlot: MatchRefereePaymentFormData['team_slot'], query: string) => {
    const existingTimer = payerSearchTimersRef.current[teamSlot];
    if (existingTimer) clearTimeout(existingTimer);

    if (query.trim().length < 2) {
      setPayerSearchOptions((prev) => ({ ...prev, [teamSlot]: [] }));
      setLoadingPayerSearch((prev) => ({ ...prev, [teamSlot]: false }));
      return;
    }

    setLoadingPayerSearch((prev) => ({ ...prev, [teamSlot]: true }));

    payerSearchTimersRef.current[teamSlot] = setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/players/search?q=${encodeURIComponent(query.trim())}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result?.error ?? 'Unable to search players.');
        }

        setPayerSearchOptions((prev) => ({ ...prev, [teamSlot]: result.data ?? [] }));
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to search players.');
      } finally {
        setLoadingPayerSearch((prev) => ({ ...prev, [teamSlot]: false }));
      }
    }, 250);
  };

  const selectPayer = (
    teamSlot: MatchRefereePaymentFormData['team_slot'],
    player: PlayerSearchOption | null
  ) => {
    updateRefereePayment(teamSlot, {
      payer_player_id: player?.id ?? null,
      payer_document_id: player?.document_id ?? null,
      payer_name: player?.full_name ?? null,
    });

    setPayerTeamWarnings((prev) => ({ ...prev, [teamSlot]: null }));

    if (player?.document_id) {
      resolvePayerByDocumentId(teamSlot, player.document_id);
    }
  };

  const schedulePayerScanFallback = (
    teamSlot: MatchRefereePaymentFormData['team_slot'],
    documentId: string
  ) => {
    const existingTimer = scannerIdleTimersRef.current[teamSlot];
    if (existingTimer) clearTimeout(existingTimer);

    if (!submitScannerOnIdle || !documentId.trim()) return;

    const timeout = Number(scannerIdleMs);
    const normalizedTimeout = Number.isFinite(timeout) && timeout > 0 ? timeout : Number(DEFAULT_SCANNER_IDLE_MS);

    scannerIdleTimersRef.current[teamSlot] = setTimeout(() => {
      resolvePayerByDocumentId(teamSlot, documentId);
    }, normalizedTimeout);
  };

  const isCardCheckoutReady = (payment: MatchRefereePaymentFormData) => {
    return (
      payment.method === 'stripe' &&
      payment.amount !== null &&
      payment.amount > 0 &&
      Boolean(payment.payer_document_id?.trim()) &&
      startingCheckoutSlot === null &&
      !loading
    );
  };

  const startCardCheckout = async (payment: MatchRefereePaymentFormData) => {
    if (!match) return;

    const teamId =
      payment.team_slot === 'team1'
        ? values.team1_id ?? match.team1_id
        : values.team2_id ?? match.team2_id;

    if (!teamId) {
      setErrorMessage('Select a team before starting card checkout.');
      return;
    }

    if (payment.amount === null || payment.amount <= 0) {
      setErrorMessage('Card checkout requires an amount greater than zero.');
      return;
    }

    if (!payment.payer_document_id?.trim()) {
      setErrorMessage('Card checkout requires the payer document ID.');
      return;
    }

    try {
      setStartingCheckoutSlot(payment.team_slot);
      setErrorMessage(null);

      const response = await fetch('/api/stripe/referee-payment-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId: match.id,
          teamId,
          refereeId: values.referee_id ?? null,
          amount: payment.amount,
          payerDocumentId: payment.payer_document_id,
          returnPath: window.location.pathname,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error ?? 'Unable to start card checkout.');
      }

      if (!result.checkout_url) {
        throw new Error('Stripe did not return a checkout URL.');
      }

      setCheckoutBySlot((prev) => ({
        ...prev,
        [payment.team_slot]: {
          sessionId: result.session_id,
          checkoutUrl: result.short_checkout_url ?? result.checkout_url,
        },
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start card checkout.');
    } finally {
      setStartingCheckoutSlot(null);
    }
  };

  const confirmCardCheckout = async (payment: MatchRefereePaymentFormData) => {
    const checkout = checkoutBySlot[payment.team_slot];

    if (!checkout?.sessionId) {
      setErrorMessage('Generate a card checkout before confirming payment.');
      return;
    }

    try {
      setConfirmingCheckoutSlot(payment.team_slot);
      setErrorMessage(null);

      const response = await fetch('/api/stripe/referee-payment-checkout/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: checkout.sessionId }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error ?? 'Unable to confirm card payment.');
      }

      if (!result.paid) {
        setErrorMessage('Stripe has not marked this checkout as paid yet.');
        return;
      }

      updateRefereePayment(payment.team_slot, {
        status: 'paid',
        method: 'stripe',
        amount: result.payment?.amount ?? payment.amount,
        reference: result.payment?.reference ?? checkout.sessionId,
        paid_at: result.payment?.paid_at ?? new Date().toISOString(),
        stripe_fee_amount: result.payment?.stripe_fee_amount ?? 0,
        state_fee_amount: result.payment?.state_fee_amount ?? 0,
        total_fee_amount: result.payment?.total_fee_amount ?? 0,
        total_paid_amount: result.payment?.total_paid_amount ?? payment.amount,
      });
      setCheckoutBySlot((prev) => ({ ...prev, [payment.team_slot]: null }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to confirm card payment.');
    } finally {
      setConfirmingCheckoutSlot(null);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>Edit Match</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

          <TextField
            select
            label="Team 1"
            value={values.team1_id ?? match?.team1_id ?? ''}
            onChange={e => setValues(prev => ({ ...prev, team1_id: Number(e.target.value) }))}
            fullWidth
            disabled={loading}
          >
            {Object.entries(teamMap).map(([id, name]) => (
              <MenuItem key={id} value={Number(id)}>
                {name} (#{id})
              </MenuItem>
            ))}
            {match && match.team1_id && !teamMap[match.team1_id] && (
              <MenuItem key={match.team1_id} value={match.team1_id}>
                Equipo eliminado (#{match.team1_id})
              </MenuItem>
            )}
          </TextField>

          <TextField
            select
            label="Team 2"
            value={values.team2_id ?? match?.team2_id ?? ''}
            onChange={e => setValues(prev => ({ ...prev, team2_id: Number(e.target.value) }))}
            fullWidth
            disabled={loading}
          >
            {Object.entries(teamMap).map(([id, name]) => (
              <MenuItem key={id} value={Number(id)}>
                {name} (#{id})
              </MenuItem>
            ))}
            {match && match.team2_id && !teamMap[match.team2_id] && (
              <MenuItem key={match.team2_id} value={match.team2_id}>
                Equipo eliminado (#{match.team2_id})
              </MenuItem>
            )}
          </TextField>

          <TextField
            select
            label="Status"
            value={values.status}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                status: e.target.value as MatchFormData['status'],
              }))
            }
            fullWidth
          >
            <MenuItem value="scheduled">Scheduled</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="played">Played</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </TextField>

          <TextField
            select
            label="Main Referee"
            value={values.referee_id ?? ''}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                referee_id: e.target.value === '' ? null : Number(e.target.value),
              }))
            }
            fullWidth
            disabled={loading || loadingReferees}
            helperText={loadingReferees ? 'Loading referees...' : 'Assign the main referee for this match.'}
            InputLabelProps={{ shrink: true }}
            SelectProps={{ displayEmpty: true }}
          >
            <MenuItem value="">No referee assigned</MenuItem>
            {referees.map((referee) => (
              <MenuItem key={referee.id} value={referee.id}>
                {getRefereeFullName(referee)}
              </MenuItem>
            ))}
          </TextField>

          <Box
            sx={{
              border: '1px solid',
              borderColor: 'warning.light',
              bgcolor: 'warning.50',
              borderRadius: 1,
              p: 2,
            }}
          >
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  Referee Payment Control
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Track each team's referee fee for this match.
                </Typography>
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={submitScannerOnIdle}
                      onChange={(event) => setSubmitScannerOnIdle(event.target.checked)}
                    />
                  }
                  label="Fallback if scanner does not send Enter"
                />

                <TextField
                  label="Fallback timeout (ms)"
                  value={scannerIdleMs}
                  onChange={(event) => setScannerIdleMs(event.target.value)}
                  size="small"
                  sx={{ width: { xs: '100%', sm: 180 } }}
                  disabled={!submitScannerOnIdle}
                />
              </Stack>

              {loadingRefereePayments ? (
                <Typography variant="body2" color="text.secondary">
                  Loading referee payments...
                </Typography>
              ) : (
                refereePayments.map((payment) => {
                  const teamId =
                    payment.team_slot === 'team1'
                      ? values.team1_id ?? match?.team1_id ?? null
                      : values.team2_id ?? match?.team2_id ?? null;
                  const teamName = teamId ? teamMap[teamId] ?? `Team #${teamId}` : 'Team';
                  const checkout = checkoutBySlot[payment.team_slot];

                  return (
                    <Accordion
                      key={payment.team_slot}
                      disableGutters
                      sx={{
                        border: '1px solid',
                        borderColor: 'warning.light',
                        borderRadius: 1,
                        bgcolor: '#fffdf5',
                        '&:before': { display: 'none' },
                      }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ width: '100%', pr: 1 }}>
                          <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
                            {teamName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {payment.status}
                            {payment.amount ? ` · $${payment.amount.toFixed(2)}` : ''}
                            {payment.method ? ` · ${refereePaymentMethods.find((method) => method.value === payment.method)?.label ?? payment.method}` : ''}
                          </Typography>
                        </Stack>
                      </AccordionSummary>

                      <AccordionDetails>
                        <Stack spacing={1.5}>
                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                            <TextField
                              select
                              label="Payment Status"
                              value={payment.status}
                              onChange={(e) =>
                                updateRefereePayment(payment.team_slot, {
                                  status: e.target.value as RefereePaymentStatus,
                                })
                              }
                              fullWidth
                              disabled={loading}
                            >
                              {refereePaymentStatuses.map((status) => (
                                <MenuItem key={status.value} value={status.value}>
                                  {status.label}
                                </MenuItem>
                              ))}
                            </TextField>

                            <TextField
                              select
                              label="Payment Method"
                              value={payment.method ?? ''}
                              onChange={(e) =>
                                updateRefereePayment(payment.team_slot, {
                                  method: e.target.value === '' ? null : (e.target.value as RefereePaymentMethod),
                                })
                              }
                              fullWidth
                              disabled={loading}
                              InputLabelProps={{ shrink: true }}
                              SelectProps={{ displayEmpty: true }}
                              helperText={payment.method === 'stripe' ? 'Use card checkout to capture the payment.' : ' '}
                            >
                              <MenuItem value="">Select method</MenuItem>
                              {refereePaymentMethods.map((method) => (
                                <MenuItem key={method.value} value={method.value}>
                                  {method.label}
                                </MenuItem>
                              ))}
                            </TextField>

                            <TextField
                              label="Amount"
                              type="number"
                              value={payment.amount ?? ''}
                              onChange={(e) =>
                                updateRefereePayment(payment.team_slot, {
                                  amount: e.target.value === '' ? null : Number(e.target.value),
                                })
                              }
                              fullWidth
                              disabled={loading}
                              inputProps={{ min: 0, step: '0.01' }}
                            />
                          </Stack>

                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                            <TextField
                              label="Payer Document ID"
                              value={payment.payer_document_id ?? ''}
                              onChange={(e) => {
                                const nextDocumentId = e.target.value;
                                updateRefereePayment(payment.team_slot, {
                                  payer_document_id: nextDocumentId || null,
                                  payer_player_id: null,
                                  payer_name: null,
                                });
                                setPayerTeamWarnings((prev) => ({ ...prev, [payment.team_slot]: null }));
                                schedulePayerScanFallback(payment.team_slot, nextDocumentId);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  resolvePayerByDocumentId(payment.team_slot, payment.payer_document_id ?? '');
                                }
                              }}
                              fullWidth
                              disabled={loading}
                              helperText="Scan or type the payer document ID."
                              InputProps={{
                                startAdornment: <QrCodeScannerIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
                              }}
                            />

                            <Autocomplete
                              freeSolo
                              options={payerSearchOptions[payment.team_slot] ?? []}
                              loading={Boolean(loadingPayerSearch[payment.team_slot])}
                              value={null}
                              inputValue={payment.payer_name ?? ''}
                              getOptionLabel={(option) =>
                                typeof option === 'string'
                                  ? option
                                  : `${option.full_name ?? 'Unnamed player'}${option.document_id ? ` - ${option.document_id}` : ''}`
                              }
                              isOptionEqualToValue={(option, value) =>
                                typeof value !== 'string' && option.id === value.id
                              }
                              onInputChange={(_, nextValue, reason) => {
                                updateRefereePayment(payment.team_slot, {
                                  payer_name: nextValue || null,
                                  payer_player_id: null,
                                });

                                if (reason === 'input') {
                                  searchPayersByName(payment.team_slot, nextValue);
                                }
                              }}
                              onChange={(_, option) => {
                                if (typeof option === 'string') {
                                  updateRefereePayment(payment.team_slot, {
                                    payer_name: option || null,
                                    payer_player_id: null,
                                  });
                                  return;
                                }

                                selectPayer(payment.team_slot, option);
                              }}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Payer Name"
                                  fullWidth
                                  disabled={loading}
                                  helperText="Search by name to fill the payer document ID."
                                />
                              )}
                              sx={{ width: '100%' }}
                            />
                          </Stack>

                          {payerTeamWarnings[payment.team_slot] && (
                            <Alert severity="warning">{payerTeamWarnings[payment.team_slot]}</Alert>
                          )}

                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                            <TextField
                              label="Reference"
                              value={payment.reference ?? ''}
                              onChange={(e) =>
                                updateRefereePayment(payment.team_slot, {
                                  reference: e.target.value || null,
                                })
                              }
                              fullWidth
                              disabled={loading}
                              placeholder="Receipt, note, or transaction ID"
                            />

                            <Stack direction="row" spacing={1} sx={{ minWidth: { sm: 210 } }}>
                              <Button
                                variant="outlined"
                                onClick={() => resolvePayerByDocumentId(payment.team_slot)}
                                disabled={loading || !payment.payer_document_id?.trim()}
                                fullWidth
                              >
                                Resolve
                              </Button>

                              {payment.method === 'stripe' && (
                                <Button
                                  variant="contained"
                                  onClick={() => startCardCheckout(payment)}
                                  disabled={!isCardCheckoutReady(payment)}
                                  fullWidth
                                >
                                  {startingCheckoutSlot === payment.team_slot ? 'Generating...' : 'Generate QR'}
                                </Button>
                              )}
                            </Stack>
                          </Stack>

                          {payment.method === 'stripe' && checkout?.checkoutUrl && (
                            <Box
                              sx={{
                                border: '1px solid',
                                borderColor: 'warning.light',
                                borderRadius: 1,
                                bgcolor: 'common.white',
                                p: 2,
                              }}
                            >
                              <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={2}
                                alignItems={{ xs: 'stretch', sm: 'center' }}
                              >
                                <Box
                                  component="img"
                                  alt="Stripe checkout QR"
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(checkout.checkoutUrl)}`}
                                  sx={{
                                    width: 180,
                                    height: 180,
                                    alignSelf: { xs: 'center', sm: 'auto' },
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                  }}
                                />

                                <Stack spacing={1} sx={{ flex: 1 }}>
                                  <Typography variant="subtitle2" fontWeight={700}>
                                    Scan to pay with card
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    The payer can scan this QR and complete Stripe Checkout on their phone. After payment, confirm it here.
                                  </Typography>
                                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                    <Button
                                      variant="outlined"
                                      href={checkout.checkoutUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Open Link
                                    </Button>
                                    <Button
                                      variant="contained"
                                      color="success"
                                      onClick={() => confirmCardCheckout(payment)}
                                      disabled={confirmingCheckoutSlot === payment.team_slot}
                                    >
                                      {confirmingCheckoutSlot === payment.team_slot ? 'Checking...' : 'Confirm Payment'}
                                    </Button>
                                  </Stack>
                                </Stack>
                              </Stack>
                            </Box>
                          )}

                          <TextField
                            label="Note"
                            value={payment.note ?? ''}
                            onChange={(e) =>
                              updateRefereePayment(payment.team_slot, {
                                note: e.target.value || null,
                              })
                            }
                            fullWidth
                            disabled={loading}
                            multiline
                            minRows={2}
                          />
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  );
                })
              )}
            </Stack>
          </Box>

          <Stack direction="row" spacing={2}>
            <TextField
              label="Score Team 1"
              type="number"
              value={values.score1 ?? ''}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  score1: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
              fullWidth
            />

            <TextField
              label="Score Team 2"
              type="number"
              value={values.score2 ?? ''}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  score2: e.target.value === '' ? null : Number(e.target.value),
                }))
              }
              fullWidth
            />
          </Stack>

          {isKnockout && values.status === 'played' && isTiedRegularScore && (
            <>
              <Typography variant="subtitle2">
                Penalty Shootout
              </Typography>

              <Stack direction="row" spacing={2}>
                <TextField
                  label="Penalty Score Team 1"
                  type="number"
                  value={values.penalty_score1 ?? ''}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      penalty_score1:
                        e.target.value === '' ? null : Number(e.target.value),
                    }))
                  }
                  fullWidth
                />

                <TextField
                  label="Penalty Score Team 2"
                  type="number"
                  value={values.penalty_score2 ?? ''}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      penalty_score2:
                        e.target.value === '' ? null : Number(e.target.value),
                    }))
                  }
                  fullWidth
                />
              </Stack>
            </>
          )}

          <TextField
            label="Date"
            type="date"
            value={values.date ?? ''}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                date: e.target.value || null,
              }))
            }
            fullWidth
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="Time"
            type="time"
            value={values.time ?? ''}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                time: e.target.value || null,
              }))
            }
            fullWidth
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            select
            label="Field"
            value={values.field_id ?? ''}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                field_id: e.target.value === '' ? null : Number(e.target.value),
              }))
            }
            fullWidth
          >
            {fields.map((field, index) => (
              <MenuItem key={field.id} value={field.id}>
                {field.name} — #{index + 1}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
