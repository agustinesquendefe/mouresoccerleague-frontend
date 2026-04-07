'use client';

import { useEffect, useState } from 'react';
import { Alert, Stack, Tab, Tabs, Typography } from '@mui/material';
import EventStandingsTable from './EventStandingsTable';
import {
  getEventStandings,
  type StandingMode,
  type StandingRow,
} from '@/services/standings/getEventStandings';

type Props = {
  eventId: number;
  refreshKey?: number;
};

export default function EventStandingsSection({ eventId, refreshKey = 0 }: Props) {
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<StandingMode>('general');

  const loadStandings = async (mode: StandingMode) => {
    try {
      setLoading(true);
      const data = await getEventStandings(eventId, mode);
      setStandings(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStandings(selectedTab);
  }, [eventId, refreshKey, selectedTab]);

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Standings</Typography>

      <Tabs
        value={selectedTab}
        onChange={(_, value) => setSelectedTab(value)}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="General" value="general" />
        <Tab label="Home" value="home" />
        <Tab label="Away" value="away" />
      </Tabs>

      {loading && <Typography>Loading standings...</Typography>}

      {!loading && standings.length === 0 && (
        <Alert severity="info">
          No standings available yet. Play matches to generate the table.
        </Alert>
      )}

      {!loading && standings.length > 0 && (
        <EventStandingsTable standings={standings} />
      )}
    </Stack>
  );
}