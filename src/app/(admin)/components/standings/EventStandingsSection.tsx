'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Stack, Tab, Tabs, Typography } from '@mui/material';
import EventStandingsTable from './EventStandingsTable';
import {
  getEventStandings,
  type StandingMode,
  type StandingRow,
} from '@/services/standings/getEventStandings';
import { escapeHtml, printHtml } from '@/utils/printHtml';
import type { AppSettings } from '@/models/appSettings';

type Props = {
  eventId: number;
  eventName?: string;
  printCompany?: Partial<AppSettings> | null;
  refreshKey?: number;
};

export default function EventStandingsSection({ eventId, eventName, printCompany, refreshKey = 0 }: Props) {
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

  const handlePrintStandings = () => {
    if (standings.length === 0) {
      window.alert('No standings available to print yet. Play matches to generate the table.');
      return;
    }

    printHtml({
      title: `${eventName ?? `Event #${eventId}`} - Standings`,
      company: printCompany,
      subtitle: `${selectedTab.charAt(0).toUpperCase()}${selectedTab.slice(1)} table`,
      body: `
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>PJ</th>
              <th>PG</th>
              <th>PE</th>
              <th>PP</th>
              <th>GF</th>
              <th>GC</th>
              <th>DG</th>
              <th>PTS</th>
            </tr>
          </thead>
          <tbody>
            ${standings.map((row, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(row.team_name)}</td>
                <td>${row.played}</td>
                <td>${row.won}</td>
                <td>${row.drawn}</td>
                <td>${row.lost}</td>
                <td>${row.goals_for}</td>
                <td>${row.goals_against}</td>
                <td>${row.goal_difference}</td>
                <td>${row.points}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `,
    });
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography variant="h6">Standings</Typography>
        <Button
          variant="outlined"
          onClick={handlePrintStandings}
          disabled={loading || standings.length === 0}
        >
          Print Standings
        </Button>
      </Stack>

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
