'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Snackbar, Stack, Tab, Tabs, Typography } from '@mui/material';
import { getMatchesByEvent, updateMatch } from '@/services/matches';
import { getEventTeams } from '@/services/eventTeams/getEventTeams';
import { getFieldsByEvent } from '@/services/eventFields/getFieldsByEvent';
import type { Match, MatchFormData } from '@/models/match';
import type { Field } from '@/models/field';
import GenerateFixtureButton from './GenerateFixtureButton';
import GeneratePlayoffsButton from './GeneratePlayoffsButton';
import GroupedMatchesTable from './GroupedMatchesTable';
import MatchDialog from './MatchDialog';
import { Team } from '@/models/team';
import AdvanceKnockoutRoundButton from './AdvanceKnockoutRoundButton';

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

  const [selectedLeagueTab, setSelectedLeagueTab] = useState('all');

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

  const leagueMatches = useMemo(() => {
    return matches.filter((match) => match.stage_type === 'league' || !match.stage_type);
  }, [matches]);

  const knockoutMatches = useMemo(() => {
    return matches.filter((match) => match.stage_type === 'knockout');
  }, [matches]);

  const uniqueLeagueRounds = useMemo(() => {
    return Array.from(
      new Set(
        leagueMatches
          .map((match) => match.round_number)
          .filter((value): value is number => value !== null && value !== undefined)
      )
    ).sort((a, b) => a - b);
  }, [leagueMatches]);

  const visibleLeagueMatches = useMemo(() => {
    if (selectedLeagueTab === 'all') return leagueMatches;

    return leagueMatches.filter(
      (match) => String(match.round_number) === String(selectedLeagueTab)
    );
  }, [leagueMatches, selectedLeagueTab]);

  const knockoutGroups = useMemo(() => {
    return knockoutMatches.reduce<Record<string, Match[]>>((acc, match) => {
      const key = match.bracket_round ?? 'knockout';

      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push(match);
      return acc;
    }, {});
  }, [knockoutMatches]);

  const sortedKnockoutRounds = useMemo(() => {
    const order = ['round_of_16', 'quarterfinal', 'semifinal', 'final', 'third_place'];

    return Object.keys(knockoutGroups).sort(
      (a, b) => order.indexOf(a) - order.indexOf(b)
    );
  }, [knockoutGroups]);

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

  const formatBracketTitle = (value: string) => {
    switch (value) {
      case 'round_of_16':
        return 'Round of 16';
      case 'quarterfinal':
        return 'Quarterfinal';
      case 'semifinal':
        return 'Semifinal';
      case 'final':
        return 'Final';
      case 'third_place':
        return 'Third Place';
      default:
        return value;
    }
  };

  return (
    <Stack spacing={4}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">League Matches</Typography>
          <GenerateFixtureButton eventId={eventId} onGenerated={loadData} />
        </Stack>

        {!loading && leagueMatches.length > 0 && (
          <Tabs
            value={selectedLeagueTab}
            onChange={(_, value) => setSelectedLeagueTab(value)}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="All" value="all" />
            {uniqueLeagueRounds.map((round) => (
              <Tab key={round} label={`Round ${round}`} value={String(round)} />
            ))}
          </Tabs>
        )}

        {loading && <Typography>Loading matches...</Typography>}

        {!loading && leagueMatches.length === 0 && (
          <Alert severity="info">No league matches generated yet.</Alert>
        )}

        {!loading && leagueMatches.length > 0 && (
          <GroupedMatchesTable
            matches={visibleLeagueMatches}
            teamMap={teamMap}
            fields={fields}
            onEdit={handleEdit}
            groupByDate={selectedLeagueTab === 'all'}
          />
        )}
      </Stack>

      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Playoffs</Typography>

          <Stack direction="row" spacing={1}>
            <GeneratePlayoffsButton eventId={eventId} onGenerated={loadData} />
            <AdvanceKnockoutRoundButton eventId={eventId} onGenerated={loadData} />
          </Stack>
        </Stack>

        {!loading && knockoutMatches.length === 0 && (
          <Alert severity="info">No playoff matches generated yet.</Alert>
        )}

        {!loading &&
          sortedKnockoutRounds.map((roundKey) => (
            <Box key={roundKey}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                {formatBracketTitle(roundKey)}
              </Typography>

              <GroupedMatchesTable
                matches={knockoutGroups[roundKey]}
                teamMap={teamMap}
                fields={fields}
                onEdit={handleEdit}
                groupByDate={false}
              />
            </Box>
          ))}
      </Stack>

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