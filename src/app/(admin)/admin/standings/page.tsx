'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PageContainer from '@/app/(admin)/components/container/PageContainer';
import StandingsTable from '@/app/(admin)/components/standings/StandingsTable';
import { supabase } from '@/lib/supabaseClient';
import { getEventStandings } from '@/services/standings/getEventStandings';

type EventOption = {
  id: number;
  name: string;
};

export default function StandingsPage() {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('id, name')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const mapped = (data ?? []) as EventOption[];
    setEvents(mapped);

    if (!selectedEventId && mapped.length > 0) {
      setSelectedEventId(String(mapped[0].id));
    }
  };

  const loadStandings = async (eventId: number) => {
    const standings = await getEventStandings(eventId);
    setRows(standings ?? []);
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErrorMessage('');
        await loadEvents();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  useEffect(() => {
    const eventId = Number(selectedEventId);
    if (!eventId) {
      setRows([]);
      return;
    }

    const run = async () => {
      try {
        setLoading(true);
        setErrorMessage('');
        await loadStandings(eventId);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load standings');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [selectedEventId]);

  return (
    <PageContainer title="Standings" description="Manage standings">
      <Box>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Standings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              View current standings by event
            </Typography>
          </Box>

          <TextField
            select
            label="Event"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            sx={{ maxWidth: 360 }}
          >
            {events.map((event) => (
              <MenuItem key={event.id} value={event.id}>
                {event.name}
              </MenuItem>
            ))}
          </TextField>

          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

          {loading ? (
            <Stack alignItems="center" py={6}>
              <CircularProgress />
            </Stack>
          ) : (
            <StandingsTable rows={rows} />
          )}
        </Stack>
      </Box>
    </PageContainer>
  );
}