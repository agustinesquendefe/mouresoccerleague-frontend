'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PageContainer from '@/app/(admin)/components/container/PageContainer';
import StandingsTable from '@/app/(admin)/components/standings/StandingsTable';
import PlayoffBracket from '@/app/(admin)/components/standings/PlayoffBracket';
import { supabase } from '@/lib/supabaseClient';
import { getEventStandings } from '@/services/standings/getEventStandings';
import { getPlayoffMatches, type PlayoffRoundGroup } from '@/services/standings/getPlayoffMatches';
import { getEventGroups } from '@/services/eventGroups';
import type { EventGroupWithTeams } from '@/models/eventGroup';

type EventOption = {
  id: number;
  name: string;
  format_type: string;
};

type GroupStanding = {
  group: EventGroupWithTeams;
  rows: any[];
};

export default function StandingsPage() {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<EventOption | null>(null);

  // regular standings (non-groups format)
  const [rows, setRows] = useState<any[]>([]);
  // group format standings
  const [groupStandings, setGroupStandings] = useState<GroupStanding[]>([]);

  const [playoffRounds, setPlayoffRounds] = useState<PlayoffRoundGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('id, name, format_type')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    const mapped = (data ?? []) as EventOption[];
    setEvents(mapped);

    if (!selectedEventId && mapped.length > 0) {
      setSelectedEventId(String(mapped[0].id));
    }
  };

  const loadData = async (eventId: number) => {
    const event = events.find((e) => e.id === eventId) ?? null;
    setSelectedEvent(event);

    const [playoff] = await Promise.all([getPlayoffMatches(eventId)]);
    setPlayoffRounds(playoff);

    if (event?.format_type === 'groups') {
      // Per-group standings
      const groups = await getEventGroups(eventId);
      const standing = await Promise.all(
        groups.map(async (group) => ({
          group,
          rows: await getEventStandings(eventId, 'general', group.id),
        }))
      );
      setGroupStandings(standing);
      setRows([]);
    } else {
      // Single standings table
      const standings = await getEventStandings(eventId);
      setRows(standings ?? []);
      setGroupStandings([]);
    }
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
      setGroupStandings([]);
      setPlayoffRounds([]);
      return;
    }

    const run = async () => {
      try {
        setLoading(true);
        setErrorMessage('');
        await loadData(eventId);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load standings');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [selectedEventId]);

  const isGroupFormat = selectedEvent?.format_type === 'groups';

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
            <>
              {isGroupFormat ? (
                /* Per-group standings */
                <Stack spacing={4}>
                  {groupStandings.length === 0 && (
                    <Alert severity="info">
                      No groups found for this event. Set up groups in the event detail page.
                    </Alert>
                  )}

                  {groupStandings.map(({ group, rows: groupRows }) => (
                    <Box key={group.id}>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        {group.name}
                      </Typography>
                      <StandingsTable rows={groupRows} />
                    </Box>
                  ))}
                </Stack>
              ) : (
                /* Single standings table */
                <StandingsTable rows={rows} />
              )}

              {playoffRounds.length > 0 && (
                <>
                  <Divider />
                  <PlayoffBracket rounds={playoffRounds} />
                </>
              )}
            </>
          )}
        </Stack>
      </Box>
    </PageContainer>
  );
}