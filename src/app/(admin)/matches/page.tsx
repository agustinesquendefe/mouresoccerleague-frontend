'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import PageContainer from '@/app/(admin)/components/container/PageContainer';
import MatchesFilters from '../components/matches/MatchesFilters';
import MatchesPageTable from '../components/matches/MatchesPageTable';
import MatchDialog from '../components/matches/MatchDialog';
import { getAllMatches, updateMatch, type MatchListRow } from '@/services/matches';
import { getFields } from '@/services/fields';
import type { MatchFormData } from '@/models/match';
import type { Field } from '@/models/field';
import { supabase } from '@/lib/supabaseClient';

type EventOption = {
  id: number;
  name: string;
};

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchListRow[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    eventId: '',
    status: '',
    stageType: '',
  });

  const [selectedMatch, setSelectedMatch] = useState<MatchListRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadInitialData = async () => {
    try {
      setLoading(true);

      const [{ data: eventsData, error: eventsError }, allFields] = await Promise.all([
        supabase.from('events').select('id, name').order('created_at', { ascending: false }),
        getFields(),
      ]);

      if (eventsError) {
        throw new Error(eventsError.message);
      }

      setEvents((eventsData ?? []) as EventOption[]);
      setFields(allFields);
    } catch (error) {
      setToast({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to load initial data',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMatches = async () => {
    try {
      setLoading(true);

      const rows = await getAllMatches({
        eventId: filters.eventId ? Number(filters.eventId) : null,
        status: filters.status || null,
        stageType: filters.stageType || null,
      });

      setMatches(rows);
    } catch (error) {
      setToast({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to load matches',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadMatches();
  }, [filters]);

  const teamMap = useMemo(() => {
    return matches.reduce<Record<number, string>>((acc, match) => {
      acc[match.team1_id] = match.team1_name ?? `#${match.team1_id}`;
      acc[match.team2_id] = match.team2_name ?? `#${match.team2_id}`;
      return acc;
    }, {});
  }, [matches]);

  const handleEdit = (match: MatchListRow) => {
    setSelectedMatch(match);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setSelectedMatch(null);
  };

  const handleSubmit = async (values: MatchFormData) => {
    if (!selectedMatch) return;

    try {
      setSaving(true);

      const updated = await updateMatch(selectedMatch.id, values);

      setMatches((prev) =>
        prev.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                ...updated,
              }
            : item
        )
      );

      setToast({
        open: true,
        message: 'Match updated successfully',
        severity: 'success',
      });

      setDialogOpen(false);
      setSelectedMatch(null);

      await loadMatches();
    } catch (error) {
      setToast({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to update match',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer title="Matches" description="Manage all matches">
      <Box>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Matches
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View and manage all matches across events
            </Typography>
          </Box>

          <MatchesFilters
            events={events}
            filters={filters}
            onChange={setFilters}
          />

          {loading ? (
            <Stack alignItems="center" py={6}>
              <CircularProgress />
            </Stack>
          ) : matches.length === 0 ? (
            <Alert severity="info">No matches found.</Alert>
          ) : (
            <MatchesPageTable matches={matches} onEdit={handleEdit} />
          )}

          <MatchDialog
            open={dialogOpen}
            match={selectedMatch}
            loading={saving}
            teamMap={teamMap}
            fields={fields}
            onClose={handleCloseDialog}
            onSubmit={handleSubmit}
          />

          <Snackbar
            open={toast.open}
            autoHideDuration={3000}
            onClose={() => setToast((prev) => ({ ...prev, open: false }))}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert
              severity={toast.severity}
              onClose={() => setToast((prev) => ({ ...prev, open: false }))}
              variant="filled"
            >
              {toast.message}
            </Alert>
          </Snackbar>
        </Stack>
      </Box>
    </PageContainer>
  );
}