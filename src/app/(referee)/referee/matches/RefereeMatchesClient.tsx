'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { supabase } from '@/lib/supabaseClient';
import type { RefereeAssignedMatch } from '@/services/refereePortal/getRefereeAssignedMatches';

type RefereeMatchesPayload = {
  user: {
    refereeName: string | null;
  };
  matches: RefereeAssignedMatch[];
};

function formatStatus(value: string | null) {
  if (!value) return 'unknown';
  return value.replace(/_/g, ' ');
}

export default function RefereeMatchesClient() {
  const [payload, setPayload] = useState<RefereeMatchesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadMatches = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (!token) {
          throw new Error('Please log in before opening the referee portal.');
        }

        const response = await fetch('/api/referee/matches', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const responsePayload = await response.json();

        if (!response.ok) {
          throw new Error(responsePayload?.error ?? 'Unable to load your assigned matches.');
        }

        if (active) {
          setPayload(responsePayload.data as RefereeMatchesPayload);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load your assigned matches.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadMatches();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <Stack alignItems="center" py={8}>
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={800}>
          My Matches
        </Typography>
        <Typography color="text.secondary">
          {payload?.user.refereeName ? `Assigned to ${payload.user.refereeName}` : 'Assigned match operations'}
        </Typography>
      </Box>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {!errorMessage && payload?.matches.length === 0 ? (
        <Alert severity="info">No matches are assigned to this referee yet.</Alert>
      ) : null}

      {payload?.matches.length ? (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Match</TableCell>
                <TableCell>Event</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Role</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payload.matches.map((match) => (
                <TableRow key={match.id} hover>
                  <TableCell>
                    <Typography fontWeight={700}>{match.team1.name} vs {match.team2.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {match.fieldName ?? 'No field assigned'}
                    </Typography>
                  </TableCell>
                  <TableCell>{match.eventName}</TableCell>
                  <TableCell>{match.date ?? '-'} {match.time ?? ''}</TableCell>
                  <TableCell>
                    <Chip label={formatStatus(match.status)} size="small" />
                  </TableCell>
                  <TableCell>{formatStatus(match.role)}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        component={Link}
                        href="/referee/scanner"
                        size="small"
                        variant="outlined"
                        startIcon={<QrCodeScannerIcon fontSize="small" />}
                      >
                        Scanner
                      </Button>
                      <Button
                        component={Link}
                        href={`/referee/matches/${match.id}/check-in`}
                        size="small"
                        variant="contained"
                        startIcon={<AssignmentTurnedInIcon fontSize="small" />}
                      >
                        Check-In
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : null}
    </Stack>
  );
}
