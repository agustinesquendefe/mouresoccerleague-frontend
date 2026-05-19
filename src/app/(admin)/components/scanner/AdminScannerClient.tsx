'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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

type Props = {
  initialContext: ScannerContextData;
  restrictToInitialContext?: boolean;
  storageKey?: string;
};

type PersistedScannerContext = {
  eventId: string;
  matchId: string;
  teamId: string;
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
      matchId: parsed.matchId ? String(parsed.matchId) : '',
      teamId: parsed.teamId ? String(parsed.teamId) : '',
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
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [persistedContext, setPersistedContext] = useState<PersistedScannerContext | null>(null);
  const [eventMatches, setEventMatches] = useState<ScannerMatchOption[]>(initialContext.matches ?? []);
  const [submitOnIdle, setSubmitOnIdle] = useState(false);
  const [idleMs, setIdleMs] = useState('180');
  const [result, setResult] = useState<ScannerValidationResponse | null>(null);
  const [checkedInPlayers, setCheckedInPlayers] = useState<ScannerCheckedInPlayer[]>([]);
  const [deniedPlayers, setDeniedPlayers] = useState<ScannerDeniedPlayer[]>([]);
  const [selectedPlayerPreview, setSelectedPlayerPreview] = useState<PlayerPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingCheckIns, setLoadingCheckIns] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedEvent = useMemo<ScannerEventOption | null>(() => {
    return initialContext.events.find((event) => String(event.id) === selectedEventId) ?? null;
  }, [initialContext.events, selectedEventId]);

  const selectedMatch = useMemo<ScannerMatchOption | null>(() => {
    return eventMatches.find((match) => String(match.id) === selectedMatchId) ?? null;
  }, [eventMatches, selectedMatchId]);

  const teamOptions = useMemo(() => {
    if (!selectedMatch) return [];

    return [selectedMatch.team1, selectedMatch.team2];
  }, [selectedMatch]);

  useEffect(() => {
    const storedContext = readPersistedScannerContext(storageKey);
    if (!storedContext) return;

    const eventStillExists = initialContext.events.some((event) => String(event.id) === storedContext.eventId);
    if (!eventStillExists) return;

    setPersistedContext(storedContext);
    setSelectedEventId(storedContext.eventId);
  }, [initialContext.events, storageKey]);

  useEffect(() => {
    if (!selectedEventId) return;

    persistScannerContext(storageKey, {
      eventId: selectedEventId,
      matchId: selectedMatchId,
      teamId: selectedTeamId,
    });
  }, [selectedEventId, selectedMatchId, selectedTeamId, storageKey]);

  useEffect(() => {
    if (!selectedEvent) {
      setSelectedMatchId('');
      setSelectedTeamId('');
      return;
    }

    setSelectedMatchId((current) => {
      if (eventMatches.some((match) => String(match.id) === current)) {
        return current;
      }

      if (
        persistedContext?.eventId === selectedEventId &&
        eventMatches.some((match) => String(match.id) === persistedContext.matchId)
      ) {
        return persistedContext.matchId;
      }

      return '';
    });
  }, [eventMatches, persistedContext, selectedEvent, selectedEventId]);

  useEffect(() => {
    if (!selectedMatch) {
      setSelectedTeamId('');
      return;
    }

    setSelectedTeamId((current) => {
      if (teamOptions.some((team) => String(team.id) === current)) {
        return current;
      }

      if (
        persistedContext?.matchId === selectedMatchId &&
        teamOptions.some((team) => String(team.id) === persistedContext.teamId)
      ) {
        return persistedContext.teamId;
      }

      return '';
    });
  }, [persistedContext, selectedMatch, selectedMatchId, teamOptions]);

  useEffect(() => {
    if (!selectedEvent) {
      setEventMatches([]);
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

  const loadCheckedInPlayers = async (matchId: number, teamId: number) => {
    try {
      setLoadingCheckIns(true);
      const response = await fetch(`/api/scanner/match-check-ins?matchId=${matchId}&teamId=${teamId}`);
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

  const loadDeniedPlayers = async (matchId: number, teamId: number) => {
    try {
      setLoadingCheckIns(true);
      const response = await fetch(`/api/scanner/denied-scans?matchId=${matchId}&teamId=${teamId}`);
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
    const teamId = Number(selectedTeamId);

    if (!matchId || !teamId) {
      setCheckedInPlayers([]);
      return;
    }

    loadCheckedInPlayers(matchId, teamId);
    loadDeniedPlayers(matchId, teamId);
  }, [selectedMatchId, selectedTeamId]);

  const handleScan = async (barcode: string) => {
    if (!selectedEvent?.id || !selectedMatch || !selectedTeamId) {
      setErrorMessage('Select an active match and team before scanning.');
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
          teamId: Number(selectedTeamId),
        }),
      });

      const payload = await response.json();

      if (!payload?.data) {
        throw new Error(payload?.error ?? 'Validation did not return a result.');
      }

      setResult(payload.data as ScannerValidationResponse);

      if (payload.data?.approved) {
        await loadCheckedInPlayers(selectedMatch.id, Number(selectedTeamId));
        await loadDeniedPlayers(selectedMatch.id, Number(selectedTeamId));
      } else {
        const deniedResult = payload.data as ScannerValidationResponse;
        await loadDeniedPlayers(
          deniedResult.context.matchId ?? selectedMatch.id,
          deniedResult.context.teamId ?? Number(selectedTeamId)
        );
      }

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
    enabled: Boolean(selectedEvent?.id && selectedMatch && selectedTeamId) && !loading,
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
            <Alert severity="info">Choose an event first. Match, team, and scanner validation will unlock after that selection.</Alert>
          ) : null}

          {selectedEvent && eventMatches.length === 0 ? (
            <Alert severity="info">The selected validation event has no matches yet. Create a match first so you can choose a team context for the scan.</Alert>
          ) : null}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                id="scanner-validation-event"
                select
                label="Validation event"
                value={selectedEventId}
                onChange={(event) => {
                  setPersistedContext(null);
                  setSelectedEventId(event.target.value);
                  setSelectedMatchId('');
                  setSelectedTeamId('');
                  setEventMatches([]);
                  setResult(null);
                  setErrorMessage(null);
                }}
                fullWidth
                disabled={initialContext.events.length === 0 || loading || loadingMatches}
                helperText="Choose the event that should be used for payment and eligibility validation."
                InputLabelProps={{ shrink: true }}
                SelectProps={{ displayEmpty: true }}
              >
                <MenuItem value="">
                  Select an event
                </MenuItem>
                {initialContext.events.map((event) => (
                  <MenuItem key={event.id} value={String(event.id)}>
                    {event.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                id="scanner-event-status"
                label="Event status"
                value={selectedEvent ? formatStatusLabel(selectedEvent.status ?? null) : ''}
                fullWidth
                placeholder="Select an event first"
                slotProps={{
                  input: {
                    readOnly: true,
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                id="scanner-match"
                select
                label="Match"
                value={selectedMatchId}
                onChange={(event) => {
                  setPersistedContext(null);
                  setSelectedMatchId(event.target.value);
                  setSelectedTeamId('');
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
                    : eventMatches.length === 0
                      ? 'No matches available for the selected event.'
                      : 'Validation uses the selected match to define the allowed teams.'
                }
                InputLabelProps={{ shrink: true }}
                SelectProps={{ displayEmpty: true }}
              >
                <MenuItem value="">
                  Select a match
                </MenuItem>
                {eventMatches.map((match) => (
                  <MenuItem key={match.id} value={String(match.id)}>
                    {match.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                id="scanner-team"
                select
                label="Team"
                value={selectedTeamId}
                onChange={(event) => {
                  setPersistedContext(null);
                  setSelectedTeamId(event.target.value);
                  setResult(null);
                  setErrorMessage(null);
                }}
                fullWidth
                disabled={!selectedEvent || !selectedMatch || loading || loadingMatches}
                helperText={
                  !selectedEvent
                    ? 'Choose an event first.'
                    : loadingMatches
                      ? 'Loading teams for the selected match...'
                    : !selectedMatch
                      ? 'Choose a match first.'
                      : 'The scanned player must belong to this team for the selected event.'
                }
                InputLabelProps={{ shrink: true }}
                SelectProps={{ displayEmpty: true }}
              >
                <MenuItem value="">
                  Select a team
                </MenuItem>
                {teamOptions.map((team) => (
                  <MenuItem key={team.id} value={String(team.id)}>
                    {team.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                id="scanner-document-input"
                inputRef={scanner.inputRef}
                label="Scanner input"
                placeholder="Example: 000005700"
                value={scanner.value}
                onChange={(event) => scanner.handleChange(event.target.value)}
                onKeyDown={scanner.handleKeyDown}
                onBlur={scanner.handleBlur}
                autoFocus
                fullWidth
                disabled={!selectedEvent || !selectedMatch || !selectedTeamId || loading || loadingMatches}
                helperText="Leading zeros are preserved. You can test manually by typing into this field and pressing Enter."
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
                  disabled={loading || loadingMatches || !scanner.value.trim()}
                >
                  Validate Manually
                </Button>
                <Button
                  variant="text"
                  onClick={scanner.focusInput}
                  disabled={loading || loadingMatches || !selectedEvent || !selectedMatch || !selectedTeamId}
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

          <Alert severity="info">
            Current assumptions: Eyoyo EY-039 behaves like a USB keyboard, writes the raw `document_id`, preserves leading zeros, and optionally sends Enter when the scan ends.
          </Alert>
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
              Players scanned and approved for the selected match and team.
            </Typography>
          </Box>

          {!selectedMatch || !selectedTeamId ? (
            <Typography color="text.secondary">
              Select a match and team to see approved check-ins.
            </Typography>
          ) : checkedInPlayers.length === 0 ? (
            <Typography color="text.secondary">
              No approved players have been scanned for this team yet.
            </Typography>
          ) : (
            <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <Table size="small" sx={{ minWidth: 640 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Player</TableCell>
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
            <Typography variant="h6" fontWeight={700}>Denied Players</Typography>
            <Typography variant="body2" color="text.secondary">
              Players scanned for the selected match and team who were not cleared to play.
            </Typography>
          </Box>

          {!selectedMatch || !selectedTeamId ? (
            <Typography color="text.secondary">
              Select a match and team to see denied scans.
            </Typography>
          ) : deniedPlayers.length === 0 ? (
            <Typography color="text.secondary">
              No denied players have been scanned for this team yet.
            </Typography>
          ) : (
            <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <Table size="small" sx={{ minWidth: 720 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Player</TableCell>
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
