'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Snackbar, Stack, Tab, Tabs, Typography } from '@mui/material';
import { getMatchesByEvent, updateMatch } from '@/services/matches';
import { getEventTeams } from '@/services/eventTeams/getEventTeams';
import { getFieldsByEvent } from '@/services/eventFields/getFieldsByEvent';
import type { Match, MatchFormData } from '@/models/match';
import type { Field } from '@/models/field';
import GenerateFixtureButton from './GenerateFixtureButton';
import GroupedMatchesTable from './GroupedMatchesTable';
import MatchDialog from './MatchDialog';
import { Team } from '@/models/team';

type EventTeamRow = {
  id: number;
  team_id: number;
  teams?: Team[];
};

type Props = {
  eventId: number;
  onMatchUpdated?: () => void;
};

export default function EventMatchesSection({ eventId, onMatchUpdated }: Props) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [eventTeams, setEventTeams] = useState<EventTeamRow[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedTab, setSelectedTab] = useState('all');

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadData = async () => {
    try {
      setLoading(true);

      const [matchesData, eventTeamsData, eventFieldsData] = await Promise.all([
        getMatchesByEvent(eventId),
        getEventTeams(eventId),
        getFieldsByEvent(eventId),
      ]);

      setMatches(matchesData);
      setEventTeams((eventTeamsData ?? []) as EventTeamRow[]);
      setFields(eventFieldsData ?? []);
    } catch (error) {
      console.error(error);
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
    loadData();
  }, [eventId]);

  const teamMap = useMemo(() => {
    return eventTeams.reduce<Record<number, string>>((acc, row: any) => {
      const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;

      if (team?.name) {
        acc[row.team_id] = team.name;
      }

      return acc;
    }, {});
  }, [eventTeams]);

  const uniqueRounds = useMemo(() => {
    return Array.from(
      new Set(matches.map((match) => match.round_number).filter(Boolean))
    ).sort((a, b) => Number(a) - Number(b));
  }, [matches]);

  const visibleMatches = useMemo(() => {
    if (selectedTab === 'all') return matches;
    return matches.filter(
      (match) => String(match.round_number) === String(selectedTab)
    );
  }, [matches, selectedTab]);

  const handleEdit = (match: Match) => {
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
        prev.map((item) => (item.id === updated.id ? updated : item))
      );

      onMatchUpdated?.();

      setToast({
        open: true,
        message: 'Match updated successfully',
        severity: 'success',
      });

      setDialogOpen(false);
      setSelectedMatch(null);
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
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Matches</Typography>
        <GenerateFixtureButton eventId={eventId} onGenerated={loadData} />
      </Stack>

      {!loading && matches.length > 0 && (
        <Tabs
          value={selectedTab}
          onChange={(_, value) => setSelectedTab(value)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="All" value="all" />
          {uniqueRounds.map((round) => (
            <Tab key={round} label={`Round ${round}`} value={round} />
          ))}
        </Tabs>
      )}

      {loading && <Typography>Loading matches...</Typography>}

      {!loading && matches.length === 0 && (
        <Alert severity="info">No matches generated yet.</Alert>
      )}

      {!loading && matches.length > 0 && (
        <GroupedMatchesTable
          matches={visibleMatches}
          teamMap={teamMap}
          fields={fields}
          onEdit={handleEdit}
          groupByDate={selectedTab === 'all'}
        />
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
  );
}