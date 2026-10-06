'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import type {
  ScannerCheckedInPlayer,
  ScannerContextData,
  ScannerDeniedPlayer,
  ScannerEventOption,
  ScannerMatchOption,
  ScannerValidationResponse,
} from '@/models/scanner';
import { useBarcodeScannerInput } from '@/hooks/useBarcodeScannerInput';
import ScannerResultPanel from '@/app/(admin)/components/scanner/ScannerResultPanel';
import { formatStoredDate } from '@/utils/dateOnly';

type Props = {
  initialContext: ScannerContextData;
  restrictToInitialContext?: boolean;
  storageKey?: string;
};

type PersistedScannerContext = {
  eventId: string;
  matchDate: string;
  matchId: string;
};

type PlayerPreview = {
  name: string;
  documentId: string | null;
  photoUrl: string | null;
  status: 'approved' | 'denied';
  detail: string;
  scannedAt: string | null;
};

const SCANNER_CONTEXT_STORAGE_KEY = 'moure-scanner-context';

function formatStatusLabel(value: string | null) {
  if (!value) return 'unknown';
  return value.replace(/_/g, ' ');
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

function getLocalDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatMatchDate(value: string) {
  return formatStoredDate(value, 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function getPlayerInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const second = words.length > 1 ? words[words.length - 1]?.[0] ?? '' : '';
  return `${first}${second}`.toUpperCase() || '?';
}

function PlayerIdentity({
  name,
  documentId,
  photoUrl,
}: {
  name: string;
  documentId?: string | null;
  photoUrl?: string | null;
}) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center">
      <Avatar
        src={photoUrl ?? undefined}
        alt={name}
        sx={{ width: 40, height: 40, fontSize: 14, fontWeight: 700 }}
      >
        {getPlayerInitials(name)}
      </Avatar>
      <Box>
        <Typography variant="body2" fontWeight={700}>{name}</Typography>
        <Typography variant="caption" color="text.secondary">
          {documentId ?? 'No document ID'}
        </Typography>
      </Box>
    </Stack>
  );
}

function PlayerPhotoFallback({ name }: { name: string }) {
  return (
    <Avatar
      sx={{
        width: '100%',
        height: '100%',
        fontSize: 72,
        fontWeight: 800,
        bgcolor: 'grey.200',
        color: 'text.primary',
      }}
    >
      {getPlayerInitials(name)}
    </Avatar>
  );
}

function readPersistedScannerContext(storageKey: string): PersistedScannerContext | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue) as Partial<PersistedScannerContext>;
    if (!parsed.eventId) return null;

    return {
      eventId: String(parsed.eventId),
      matchDate: parsed.matchDate ? String(parsed.matchDate) : '',
      matchId: parsed.matchId ? String(parsed.matchId) : '',
    };
  } catch {
    return null;
  }
}

function persistScannerContext(storageKey: string, context: PersistedScannerContext) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(storageKey, JSON.stringify(context));
}

export default function AdminScannerClient({
  initialContext,
  restrictToInitialContext = false,
  storageKey = SCANNER_CONTEXT_STORAGE_KEY,
}: Props) {
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [todayKey, setTodayKey] = useState<string | null>(null);
  const [persistedContext, setPersistedContext] = useState<PersistedScannerContext | null>(null);
  const [eventMatches, setEventMatches] = useState<ScannerMatchOption[]>(initialContext.matches ?? []);
  const [eventOptions, setEventOptions] = useState<ScannerEventOption[]>(initialContext.events);
  const [eventSearch, setEventSearch] = useState('');
  const [submitOnIdle, setSubmitOnIdle] = useState(false);
  const [idleMs, setIdleMs] = useState('180');
  const [result, setResult] = useState<ScannerValidationResponse | null>(null);
  const [checkedInPlayers, setCheckedInPlayers] = useState<ScannerCheckedInPlayer[]>([]);
  const [deniedPlayers, setDeniedPlayers] = useState<ScannerDeniedPlayer[]>([]);
  const [selectedPlayerPreview, setSelectedPlayerPreview] = useState<PlayerPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingCheckIns, setLoadingCheckIns] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedEvent = useMemo<ScannerEventOption | null>(() => {
    return eventOptions.find((event) => String(event.id) === selectedEventId) ?? null;
  }, [eventOptions, selectedEventId]);

  const selectedMatch = useMemo<ScannerMatchOption | null>(() => {
    return eventMatches.find((match) => String(match.id) === selectedMatchId) ?? null;
  }, [eventMatches, selectedMatchId]);

  const availableDates = useMemo(() => {
    return Array.from(
      new Set(
        eventMatches
          .filter((match) => {
            const status = String(match.status ?? '').toLowerCase();
            return Boolean(
              match.date &&
              (!todayKey || match.date >= todayKey) &&
              status !== 'cancelled' &&
              status !== 'played'
            );
          })
          .map((match) => match.date as string)
      )
    ).sort();
  }, [eventMatches, todayKey]);

  const matchesForSelectedDate = useMemo(
    () => eventMatches.filter((match) => {
      const status = String(match.status ?? '').toLowerCase();
      return match.date === selectedDate && status !== 'cancelled' && status !== 'played';
    }),
    [eventMatches, selectedDate]
  );

  const teamOptions = useMemo(() => {
    if (!selectedMatch) return [];

    return [selectedMatch.team1, selectedMatch.team2];
  }, [selectedMatch]);

  useEffect(() => {
    setTodayKey(getLocalDateKey());
  }, []);

  useEffect(() => {
    if (restrictToInitialContext) {
      setEventOptions(initialContext.events);
      return;
    }

    const term = eventSearch.trim();
    if (!term) {
      setEventOptions((current) => {
        const selected = current.find((event) => String(event.id) === selectedEventId);
        return selected ? [selected] : initialContext.events;
      });
      return;
    }

    let active = true;
    const timeout = window.setTimeout(async () => {
      try {
        setLoadingEvents(true);
        const response = await fetch(`/api/scanner/events?search=${encodeURIComponent(term)}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error ?? 'Failed to search events.');
        }

        if (!active) return;
        const rows = (payload?.data ?? []) as ScannerEventOption[];
        setEventOptions((current) => {
          const selected = current.find((event) => String(event.id) === selectedEventId);
          return selected && !rows.some((event) => event.id === selected.id)
            ? [selected, ...rows]
            : rows;
        });
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to search events.');
        }
      } finally {
        if (active) setLoadingEvents(false);
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [eventSearch, initialContext.events, restrictToInitialContext, selectedEventId]);

  useEffect(() => {
    const storedContext = readPersistedScannerContext(storageKey);
    if (initialContext.activeEvent) {
      const activeEventId = String(initialContext.activeEvent.id);
      setSelectedEventId(activeEventId);
      setPersistedContext(storedContext?.eventId === activeEventId ? storedContext : null);
      return;
    }

    if (!storedContext) return;

    const eventStillExists = initialContext.events.some((event) => String(event.id) === storedContext.eventId);
    if (!eventStillExists) {
      setPersistedContext(null);
      return;
    }

    setPersistedContext(storedContext);
    setSelectedEventId(storedContext.eventId);
  }, [initialContext.activeEvent, initialContext.events, storageKey]);

  useEffect(() => {
    if (!selectedEventId) return;

    persistScannerContext(storageKey, {
      eventId: selectedEventId,
      matchDate: selectedDate,
      matchId: selectedMatchId,
    });
  }, [selectedDate, selectedEventId, selectedMatchId, storageKey]);

  useEffect(() => {
    if (!selectedEvent) {
      setSelectedDate('');
      setSelectedMatchId('');
      setSelectedTeamId('');
      return;
    }

    if (!todayKey) return;

    setSelectedDate((current) => {
      if (availableDates.includes(current)) {
        return current;
      }

      if (
        persistedContext?.eventId === selectedEventId &&
        availableDates.includes(persistedContext.matchDate)
      ) {
        return persistedContext.matchDate;
      }

      if (availableDates.includes(todayKey)) return todayKey;

      return availableDates[0] ?? '';
    });
  }, [availableDates, persistedContext, selectedEvent, selectedEventId, todayKey]);

  useEffect(() => {
    setSelectedMatchId((current) => {
      if (matchesForSelectedDate.some((match) => String(match.id) === current)) {
        return current;
      }

      if (
        persistedContext?.eventId === selectedEventId &&
        persistedContext.matchDate === selectedDate &&
        matchesForSelectedDate.some((match) => String(match.id) === persistedContext.matchId)
      ) {
        return persistedContext.matchId;
      }

      return '';
    });
  }, [matchesForSelectedDate, persistedContext, selectedDate, selectedEventId]);

  useEffect(() => {
    if (!selectedEvent) {
      setEventMatches([]);
      setSelectedDate('');
      setSelectedMatchId('');
      setSelectedTeamId('');
      return;
    }

    if (restrictToInitialContext) {
      setEventMatches(initialContext.matches.filter((match) => Number(match.eventId) === Number(selectedEvent.id)));
      return;
    }

    let active = true;

    const loadMatches = async () => {
      try {
        setLoadingMatches(true);
        setErrorMessage(null);

        const response = await fetch(`/api/scanner/event-matches?eventId=${selectedEvent.id}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error ?? 'Failed to load matches for the selected event.');
        }

        if (!active) return;

        setEventMatches((payload?.data ?? []) as ScannerMatchOption[]);
      } catch (error) {
        if (!active) return;

        setEventMatches([]);
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load matches for the selected event.');
      } finally {
        if (active) {
          setLoadingMatches(false);
        }
      }
    };

    loadMatches();

    return () => {
      active = false;
    };
  }, [initialContext.matches, restrictToInitialContext, selectedEvent]);

  const loadCheckedInPlayers = async (matchId: number) => {
    try {
      setLoadingCheckIns(true);
      const response = await fetch(`/api/scanner/match-check-ins?matchId=${matchId}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to load checked-in players.');
      }

      setCheckedInPlayers((payload?.data ?? []) as ScannerCheckedInPlayer[]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load checked-in players.');
      setCheckedInPlayers([]);
    } finally {
      setLoadingCheckIns(false);
    }
  };

  const loadDeniedPlayers = async (matchId: number) => {
    try {
      setLoadingCheckIns(true);
      const response = await fetch(`/api/scanner/denied-scans?matchId=${matchId}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? 'Failed to load denied players.');
      }

      setDeniedPlayers((payload?.data ?? []) as ScannerDeniedPlayer[]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load denied players.');
      setDeniedPlayers([]);
    } finally {
      setLoadingCheckIns(false);
    }
  };

  useEffect(() => {
    const matchId = Number(selectedMatchId);

    if (!matchId) {
      setCheckedInPlayers([]);
      setDeniedPlayers([]);
      return;
    }

    loadCheckedInPlayers(matchId);
    loadDeniedPlayers(matchId);
  }, [selectedMatchId]);

  const handleScan = async (barcode: string) => {
    if (!selectedEvent?.id || !selectedDate || !selectedMatch) {
      setErrorMessage('Select a date and a pending match before scanning.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      const response = await fetch('/api/scanner/validate-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barcode,
          eventId: selectedEvent.id,
          matchId: selectedMatch.id,
          matchDate: selectedDate,
        }),
      });

      const payload = await response.json();

      if (!payload?.data) {
        throw new Error(payload?.error ?? 'Validation did not return a result.');
      }

      const validationResult = payload.data as ScannerValidationResponse;
      const resolvedTeamId = validationResult.context.teamId;
      setResult(validationResult);
      setSelectedTeamId(resolvedTeamId ? String(resolvedTeamId) : '');
      await loadCheckedInPlayers(selectedMatch.id);
      await loadDeniedPlayers(selectedMatch.id);

      if (!response.ok && !payload.data) {
        throw new Error(payload?.error ?? 'Player validation failed.');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Player validation failed.');
    } finally {
      setLoading(false);
    }
  };

  const scanner = useBarcodeScannerInput({
    enabled: Boolean(selectedEvent?.id && selectedDate && selectedMatch) && !loading,
    submitOnIdle,
    idleMs: Math.max(Number(idleMs) || 180, 50),
    onScan: handleScan,
  });

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h5" fontWeight={700}>Barcode Scanner</Typography>
            <Typography variant="body2" color="text.secondary">
              Designed for Eyoyo EY-039 in keyboard-wedge mode. The scanner writes the barcode into the active input and should send Enter after each scan.
            </Typography>
          </Box>

          {!initialContext.activeEvent ? (
            <Alert severity="warning">No events are available yet. Create or activate an event before using barcode validation.</Alert>
          ) : null}

          {initialContext.events.length > 0 && !selectedEvent ? (
            <Alert severity="info">Choose an event first. Date selection and scanner validation will unlock after that selection.</Alert>
          ) : null}

          {selectedEvent && eventMatches.length === 0 ? (
            <Alert severity="info">The selected validation event has no matches yet. Create a match before using the scanner.</Alert>
          ) : selectedEvent && !loadingMatches && availableDates.length === 0 ? (
            <Alert severity="info">This event has no pending matches scheduled for today or a future date.</Alert>
          ) : null}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Autocomplete
                id="scanner-validation-event"
                options={eventOptions}
                value={selectedEvent}
                loading={loadingEvents}
                filterOptions={(options, state) => restrictToInitialContext
                  ? options.filter((option) =>
                      option.name.toLowerCase().includes(state.inputValue.trim().toLowerCase())
                    )
                  : options
                }
                getOptionLabel={(option) => option.name}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onInputChange={(_, value, reason) => {
                  if (reason === 'input' || reason === 'clear') setEventSearch(value);
                }}
                onChange={(_, event) => {
                  setPersistedContext(null);
                  setEventSearch('');
                  setSelectedEventId(event ? String(event.id) : '');
                  setSelectedDate('');
                  setSelectedMatchId('');
                  setSelectedTeamId('');
                  setEventMatches([]);
                  setCheckedInPlayers([]);
                  setDeniedPlayers([]);
                  setResult(null);
                  setErrorMessage(null);
                }}
                disabled={loading || loadingMatches}
                noOptionsText={eventSearch.trim() ? 'No matching events' : 'Type to search events'}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Validation event"
                    placeholder="Type an event name"
                    helperText={
                      restrictToInitialContext
                        ? 'Search within your assigned events.'
                        : 'Type to load matching events without loading the full list.'
                    }
                    slotProps={{
                      input: {
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingEvents ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      },
                    }}
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                id="scanner-match-date"
                select
                label="Match date"
                value={selectedDate}
                onChange={(event) => {
                  setPersistedContext(null);
                  setSelectedDate(event.target.value);
                  setSelectedMatchId('');
                  setSelectedTeamId('');
                  setCheckedInPlayers([]);
                  setDeniedPlayers([]);
                  setResult(null);
                  setErrorMessage(null);
                }}
                fullWidth
                disabled={!selectedEvent || loading || loadingMatches}
                helperText={
                  !selectedEvent
                    ? 'Choose an event first.'
                    : loadingMatches
                      ? 'Loading matches for the selected event...'
                    : availableDates.length === 0
                      ? 'No pending matches are scheduled from today onward.'
                      : 'Only dates with pending matches from today onward are available.'
                }
                InputLabelProps={{ shrink: true }}
                SelectProps={{ displayEmpty: true }}
              >
                <MenuItem value="">
                  Select a date
                </MenuItem>
                {availableDates.map((date) => (
                  <MenuItem key={date} value={date}>
                    {formatMatchDate(date)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                id="scanner-match"
                select
                label="Pending match"
                value={selectedMatchId}
                onChange={(event) => {
                  setPersistedContext(null);
                  setSelectedMatchId(event.target.value);
                  setSelectedTeamId('');
                  setCheckedInPlayers([]);
                  setDeniedPlayers([]);
                  setResult(null);
                  setErrorMessage(null);
                }}
                fullWidth
                disabled={!selectedDate || loading || loadingMatches}
                helperText={
                  !selectedDate
                    ? 'Choose a date first.'
                    : matchesForSelectedDate.length === 0
                      ? 'No pending matches are available for this date.'
                      : 'The history below is loaded automatically for this match.'
                }
                InputLabelProps={{ shrink: true }}
                SelectProps={{ displayEmpty: true }}
              >
                <MenuItem value="">
                  Select a match
                </MenuItem>
                {matchesForSelectedDate.map((match) => (
                  <MenuItem key={match.id} value={String(match.id)}>
                    {match.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                id="scanner-team"
                label="Detected team"
                value={selectedMatch && selectedTeamId
                  ? teamOptions.find((team) => String(team.id) === selectedTeamId)?.name ?? `Team #${selectedTeamId}`
                  : ''}
                fullWidth
                placeholder={selectedMatch ? 'Detected after scanning' : 'Select a match first'}
                helperText="The player's roster team is detected automatically for the selected match."
                slotProps={{ input: { readOnly: true } }}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                id="scanner-document-input"
                inputRef={scanner.inputRef}
                label="Scanner input"
                placeholder="Example: 00005700"
                value={scanner.value}
                onChange={(event) => scanner.handleChange(event.target.value)}
                onKeyDown={scanner.handleKeyDown}
                onBlur={scanner.handleBlur}
                autoFocus
                fullWidth
                disabled={!selectedEvent || !selectedDate || !selectedMatch || loading || loadingMatches}
                helperText="Leading zeros are preserved. The team is detected automatically for the selected match."
                slotProps={{
                  input: {
                    startAdornment: <QrCodeScannerIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack direction={{ xs: 'column', sm: 'row', md: 'column' }} spacing={1.5}>
                <Button
                  variant="contained"
                  onClick={scanner.submit}
                  disabled={loading || loadingMatches || !selectedMatch || !scanner.value.trim()}
                >
                  Validate Manually
                </Button>
                <Button
                  variant="text"
                  onClick={scanner.focusInput}
                  disabled={loading || loadingMatches || !selectedEvent || !selectedMatch}
                >
                  Refocus Scanner
                </Button>
                {loading || loadingMatches || loadingCheckIns ? <CircularProgress size={24} /> : null}
              </Stack>
            </Grid>
          </Grid>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={submitOnIdle}
                  onChange={(event) => setSubmitOnIdle(event.target.checked)}
                />
              }
              label="Fallback if scanner does not send Enter"
            />

            <TextField
              id="scanner-idle-timeout"
              label="Fallback timeout (ms)"
              value={idleMs}
              onChange={(event) => setIdleMs(event.target.value)}
              size="small"
              sx={{ width: 180 }}
              disabled={!submitOnIdle}
              helperText="Enable this only if the scanner does not append Enter automatically."
            />
          </Stack>

          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        </Stack>
      </Paper>

      <ScannerResultPanel result={result} />

      <Dialog
        open={Boolean(selectedPlayerPreview)}
        onClose={() => setSelectedPlayerPreview(null)}
        fullWidth
        maxWidth="sm"
      >
        {selectedPlayerPreview ? (
          <>
            <DialogTitle sx={{ pr: 7 }}>
              <Stack spacing={0.5}>
                <Typography variant="h6" fontWeight={800}>{selectedPlayerPreview.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Document ID: {selectedPlayerPreview.documentId ?? '-'}
                </Typography>
              </Stack>
              <IconButton
                aria-label="Close player preview"
                onClick={() => setSelectedPlayerPreview(null)}
                sx={{ position: 'absolute', right: 12, top: 12 }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2.5}>
                <Box
                  sx={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    maxHeight: { xs: 420, sm: 520 },
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: 'grey.100',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {selectedPlayerPreview.photoUrl ? (
                    <Box
                      component="img"
                      src={selectedPlayerPreview.photoUrl}
                      alt={selectedPlayerPreview.name}
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  ) : (
                    <PlayerPhotoFallback name={selectedPlayerPreview.name} />
                  )}
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Alert
                    severity={selectedPlayerPreview.status === 'approved' ? 'success' : 'error'}
                    sx={{ flex: 1 }}
                  >
                    {selectedPlayerPreview.status === 'approved' ? 'Approved to play' : 'Denied to play'}
                  </Alert>
                  <Alert severity="info" sx={{ flex: 1 }}>
                    {selectedPlayerPreview.scannedAt ? formatDateTime(selectedPlayerPreview.scannedAt) : '-'}
                  </Alert>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {selectedPlayerPreview.detail}
                </Typography>
              </Stack>
            </DialogContent>
          </>
        ) : null}
      </Dialog>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Approved Players</Typography>
            <Typography variant="body2" color="text.secondary">
              Complete approved scan history for the selected match.
            </Typography>
          </Box>

          {!selectedMatch ? (
            <Typography color="text.secondary">
              Select a date and match to load its approved scan history.
            </Typography>
          ) : checkedInPlayers.length === 0 ? (
            <Typography color="text.secondary">
              No approved players have been scanned for this match yet.
            </Typography>
          ) : (
            <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <Table size="small" sx={{ minWidth: 740 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Player</TableCell>
                    <TableCell>Team</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Checked In At</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {checkedInPlayers.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      tabIndex={0}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setSelectedPlayerPreview({
                        name: row.playerName,
                        documentId: row.documentId,
                        photoUrl: row.photoUrl,
                        status: 'approved',
                        detail: `Status: ${formatStatusLabel(row.status)} · Method: ${formatStatusLabel(row.method)}`,
                        scannedAt: row.checkedInAt,
                      })}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedPlayerPreview({
                            name: row.playerName,
                            documentId: row.documentId,
                            photoUrl: row.photoUrl,
                            status: 'approved',
                            detail: `Status: ${formatStatusLabel(row.status)} · Method: ${formatStatusLabel(row.method)}`,
                            scannedAt: row.checkedInAt,
                          });
                        }
                      }}
                    >
                      <TableCell>
                        <PlayerIdentity
                          name={row.playerName}
                          documentId={row.documentId}
                          photoUrl={row.photoUrl}
                        />
                      </TableCell>
                      <TableCell>{row.teamName ?? `Team #${row.teamId}`}</TableCell>
                      <TableCell>{formatStatusLabel(row.status)}</TableCell>
                      <TableCell>{formatStatusLabel(row.method)}</TableCell>
                      <TableCell>{formatDateTime(row.checkedInAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Denied Scans</Typography>
            <Typography variant="body2" color="text.secondary">
              Complete denied scan history for the selected match, including players later approved.
            </Typography>
          </Box>

          {!selectedMatch ? (
            <Typography color="text.secondary">
              Select a date and match to load its denied scan history.
            </Typography>
          ) : deniedPlayers.length === 0 ? (
            <Typography color="text.secondary">
              No denied players have been scanned for this match yet.
            </Typography>
          ) : (
            <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <Table size="small" sx={{ minWidth: 820 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Player</TableCell>
                    <TableCell>Team</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Method</TableCell>
                    <TableCell>Scanned At</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deniedPlayers.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      tabIndex={0}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setSelectedPlayerPreview({
                        name: row.playerName,
                        documentId: row.documentId,
                        photoUrl: row.photoUrl,
                        status: 'denied',
                        detail: row.reason,
                        scannedAt: row.scannedAt,
                      })}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedPlayerPreview({
                            name: row.playerName,
                            documentId: row.documentId,
                            photoUrl: row.photoUrl,
                            status: 'denied',
                            detail: row.reason,
                            scannedAt: row.scannedAt,
                          });
                        }
                      }}
                    >
                      <TableCell>
                        <PlayerIdentity
                          name={row.playerName}
                          documentId={row.documentId}
                          photoUrl={row.photoUrl}
                        />
                      </TableCell>
                      <TableCell>{row.teamName ?? 'Not detected'}</TableCell>
                      <TableCell>{row.reason}</TableCell>
                      <TableCell>{formatStatusLabel(row.method)}</TableCell>
                      <TableCell>{formatDateTime(row.scannedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
