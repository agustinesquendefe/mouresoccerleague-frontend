"use client";

import { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { supabase } from '@/lib/supabaseClient';
import type { CoachPortalData, CoachPortalTeam } from '@/services/coachPortal';
import { formatStoredDate } from '@/utils/dateOnly';
import { formatTime12Hour } from '@/utils/formatTime';

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

function formatMatchSchedule(date?: string | null, time?: string | null) {
  const dateLabel = date ? formatStoredDate(date) : 'Date TBD';
  return time ? `${dateLabel} · ${formatTime12Hour(time)}` : dateLabel;
}

function roleLabel(role?: string | null) {
  return role ? role.replace(/_/g, ' ') : 'Coach';
}

function TeamPanel({ team, defaultExpanded }: { team: CoachPortalTeam; defaultExpanded: boolean }) {
  const uniquePlayerCount = new Set(team.players.map((player) => player.playerId)).size;
  const approvedCount = team.validations.filter((validation) => validation.decision === 'approved').length;
  const deniedCount = team.validations.filter((validation) => validation.decision === 'denied').length;

  return (
    <Accordion defaultExpanded={defaultExpanded} disableGutters sx={{ borderRadius: 3, overflow: 'hidden', '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: { xs: 2, md: 3 }, py: 1 }}>
        <Stack direction="row" spacing={2} alignItems="center" width="100%" pr={1}>
          <Avatar src={team.logoUrl ?? undefined} alt={team.name} sx={{ width: 48, height: 48 }}>
            {team.name.slice(0, 2).toUpperCase()}
          </Avatar>
          <Box flex={1}>
            <Typography variant="h6" fontWeight={900}>{team.name}</Typography>
            <Typography variant="body2" color="text.secondary" textTransform="capitalize">
              {roleLabel(team.role)}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="flex-end">
            <Chip label={`${uniquePlayerCount} players`} size="small" />
            <Chip label={`${approvedCount} approved`} color="success" size="small" variant="outlined" />
            <Chip label={`${deniedCount} denied`} color="error" size="small" variant="outlined" />
          </Stack>
        </Stack>
      </AccordionSummary>

      <AccordionDetails sx={{ px: { xs: 2, md: 3 }, pb: 3 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" fontWeight={800} mb={0.5}>Team Players</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Current roster assignments by event.
            </Typography>

            {team.players.length === 0 ? (
              <Alert severity="info">This team has no active players assigned to an event.</Alert>
            ) : (
              <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <Table size="small" sx={{ minWidth: 720 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Player</TableCell>
                      <TableCell>Event</TableCell>
                      <TableCell>Jersey</TableCell>
                      <TableCell align="center">Played (accepted)</TableCell>
                      <TableCell align="center">Denied</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {team.players.map((player) => {
                      const playerValidations = team.validations.filter((validation) => (
                        validation.playerId === player.playerId
                        && (player.eventId === null || validation.eventId === player.eventId)
                      ));
                      const playedApproved = playerValidations.filter((validation) => (
                        validation.decision === 'approved' && String(validation.matchStatus).toLowerCase() === 'played'
                      )).length;
                      const denied = playerValidations.filter((validation) => validation.decision === 'denied').length;

                      return (
                        <TableRow key={player.rosterId} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={800}>{player.playerName}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {player.email ?? player.documentId ?? 'No email or document ID'}
                            </Typography>
                          </TableCell>
                          <TableCell>{player.eventName}</TableCell>
                          <TableCell>{player.jerseyNumber ?? '-'}</TableCell>
                          <TableCell align="center">{playedApproved}</TableCell>
                          <TableCell align="center">{denied}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>

          <Divider />

          <Box>
            <Typography variant="h6" fontWeight={800} mb={0.5}>Match Validation History</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Credential scans and check-ins recorded for this team.
            </Typography>

            {team.validations.length === 0 ? (
              <Alert severity="info">No approved or denied player validations have been recorded yet.</Alert>
            ) : (
              <Box sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <Table size="small" sx={{ minWidth: 980 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Player</TableCell>
                      <TableCell>Event</TableCell>
                      <TableCell>Match</TableCell>
                      <TableCell>Scheduled</TableCell>
                      <TableCell>Decision</TableCell>
                      <TableCell>Recorded</TableCell>
                      <TableCell>Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {team.validations.map((validation) => (
                      <TableRow key={validation.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={800}>{validation.playerName}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {validation.documentId ?? 'No document ID'}
                          </Typography>
                        </TableCell>
                        <TableCell>{validation.eventName}</TableCell>
                        <TableCell>{validation.matchLabel}</TableCell>
                        <TableCell>{formatMatchSchedule(validation.matchDate, validation.matchTime)}</TableCell>
                        <TableCell>
                          <Chip
                            label={validation.decision === 'approved' ? 'Accepted' : 'Denied'}
                            color={validation.decision === 'approved' ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{formatDateTime(validation.recordedAt)}</TableCell>
                        <TableCell>{validation.reason ?? 'Player checked in successfully.'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

export default function CoachPortalPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [portalData, setPortalData] = useState<CoachPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadPortal = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        if (!active) return;

        setEmail(session?.user.email ?? null);
        if (!session?.access_token) {
          setPortalData(null);
          return;
        }

        const response = await fetch('/api/coach-portal', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error ?? 'Unable to load coach portal.');
        if (active) setPortalData(payload.data as CoachPortalData);
      } catch (error) {
        if (active) {
          setPortalData(null);
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load coach portal.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPortal();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => loadPortal());

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setEmail(null);
    setPortalData(null);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16">
        <Stack alignItems="center"><CircularProgress /></Stack>
      </main>
    );
  }

  const coachName = portalData
    ? `${portalData.coach.firstName} ${portalData.coach.lastName}`.trim()
    : 'Coach';

  return (
    <main className="min-h-screen bg-slate-50 text-brand-black">
      <section className="container mx-auto px-4 py-10 md:py-16">
        <Stack spacing={3}>
          <Card elevation={0} sx={{ borderRadius: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.75 }}>Coach Portal</Typography>
                  <Typography variant="h3" fontWeight={900}>{coachName}</Typography>
                  <Typography sx={{ opacity: 0.8, mt: 0.5 }}>
                    Review your teams, active rosters, and player match validations.
                  </Typography>
                </Box>
                {email ? (
                  <Stack alignItems={{ xs: 'flex-start', md: 'flex-end' }} spacing={1}>
                    <Typography variant="body2" sx={{ opacity: 0.75 }}>{email}</Typography>
                    <Button variant="outlined" color="inherit" onClick={handleSignOut}>Sign out</Button>
                  </Stack>
                ) : null}
              </Stack>
            </CardContent>
          </Card>

          {!email ? (
            <Alert severity="warning">Please access this portal through My Portal using your registered email.</Alert>
          ) : null}
          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
          {portalData && portalData.teams.length === 0 ? (
            <Alert severity="info">No teams are currently assigned to this coach.</Alert>
          ) : null}

          {portalData?.teams.map((team, index) => (
            <TeamPanel key={team.id} team={team} defaultExpanded={index === 0} />
          ))}
        </Stack>
      </section>
    </main>
  );
}
