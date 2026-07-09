'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Snackbar, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { createExtraMatch, deleteMatch, getMatchesByEvent, updateMatch, updateMatchesSchedule, type MatchScheduleUpdate } from '@/services/matches';
import { getEventTeams } from '@/services/eventTeams/getEventTeams';
import { getFieldsByEvent } from '@/services/eventFields/getFieldsByEvent';
import type { Match, MatchFormData } from '@/models/match';
import type { Field } from '@/models/field';
import GenerateFixtureButton from './GenerateFixtureButton';
import GeneratePlayoffsButton from './GeneratePlayoffsButton';
import GroupedMatchesTable from './GroupedMatchesTable';
import MatchDialog from './MatchDialog';
import ExtraMatchDialog from './ExtraMatchDialog';
import AdvanceKnockoutRoundButton from './AdvanceKnockoutRoundButton';
import RoundSchedulePlanner from './RoundSchedulePlanner';
import { escapeHtml, printHtml } from '@/utils/printHtml';
import { formatTime12Hour } from '@/utils/formatTime';
import type { AppSettings } from '@/models/appSettings';

type MatchQuickFilter = 'all' | 'played' | 'pending' | 'rescheduled';

type EventTeamRow = {
  id: number;
  team_id: number;
  display_name?: string | null;
  teams?: Array<{
    id: number;
    name: string;
    logo_url?: string | null;
  }>;
};

type Props = {
  eventId: number;
  eventName?: string;
  eventFormat?: string | null;
  printCompany?: Partial<AppSettings> | null;
  onMatchUpdated?: () => void;
};

export default function EventMatchesSection({ eventId, eventName, eventFormat, printCompany, onMatchUpdated }: Props) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [eventTeams, setEventTeams] = useState<EventTeamRow[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [extraMatchRound, setExtraMatchRound] = useState<number | null>(null);
  const [extraMatchDialogOpen, setExtraMatchDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extraMatchSaving, setExtraMatchSaving] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const [selectedLeagueTab, setSelectedLeagueTab] = useState('all');
  const [teamSearch, setTeamSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState<MatchQuickFilter>('all');

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const showToast = (message: string, severity: 'success' | 'error' = 'success') => {
    setToast({
      open: true,
      message,
      severity,
    });
  };

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
      const displayName = row.display_name?.trim() || team?.name;

      if (displayName) {
        acc[row.team_id] = displayName;
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
    const tabMatches = selectedLeagueTab === 'all'
      ? leagueMatches
      : leagueMatches.filter(
        (match) => String(match.round_number) === String(selectedLeagueTab)
      );

    const quickFilteredMatches = tabMatches.filter((match) => {
      const status = String(match.status ?? '').toLowerCase();

      if (quickFilter === 'played') return status === 'played';
      if (quickFilter === 'pending') return status !== 'played' && status !== 'cancelled';
      if (quickFilter === 'rescheduled') return Boolean(match.rescheduled_from_date);

      return true;
    });

    const term = teamSearch.trim().toLowerCase();
    if (!term) return quickFilteredMatches;

    return quickFilteredMatches.filter((match) => {
      const team1Name = teamMap[match.team1_id]?.toLowerCase() ?? '';
      const team2Name = teamMap[match.team2_id]?.toLowerCase() ?? '';
      return team1Name.includes(term) || team2Name.includes(term);
    });
  }, [leagueMatches, selectedLeagueTab, quickFilter, teamSearch, teamMap]);

  const quickFilterCounts = useMemo(() => {
    const sourceMatches = selectedLeagueTab === 'all'
      ? leagueMatches
      : leagueMatches.filter((match) => String(match.round_number) === String(selectedLeagueTab));

    return sourceMatches.reduce(
      (acc, match) => {
        const status = String(match.status ?? '').toLowerCase();
        acc.all += 1;
        if (status === 'played') acc.played += 1;
        if (status !== 'played' && status !== 'cancelled') acc.pending += 1;
        if (match.rescheduled_from_date) acc.rescheduled += 1;
        return acc;
      },
      { all: 0, played: 0, pending: 0, rescheduled: 0 }
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

  const handleAddExtraMatch = (roundNumber: number) => {
    setExtraMatchRound(roundNumber);
    setExtraMatchDialogOpen(true);
  };

  const handleCloseExtraMatchDialog = () => {
    if (extraMatchSaving) return;
    setExtraMatchDialogOpen(false);
    setExtraMatchRound(null);
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

  const handleSubmitExtraMatch = async (values: MatchFormData) => {
    if (!extraMatchRound) return;

    try {
      setExtraMatchSaving(true);
      const created = await createExtraMatch(eventId, extraMatchRound, values);

      setMatches((prev) => [...prev, created].sort((left, right) => {
        const leftRound = left.round_number ?? Number.MAX_SAFE_INTEGER;
        const rightRound = right.round_number ?? Number.MAX_SAFE_INTEGER;
        if (leftRound !== rightRound) return leftRound - rightRound;
        return left.id - right.id;
      }));

      onMatchUpdated?.();
      setToast({
        open: true,
        message: 'Extra match added successfully',
        severity: 'success',
      });
      setExtraMatchDialogOpen(false);
      setExtraMatchRound(null);
    } catch (error) {
      setToast({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to add extra match',
        severity: 'error',
      });
    } finally {
      setExtraMatchSaving(false);
    }
  };

  const handleDeleteExtraMatch = async (match: Match) => {
    if (!match.is_extra) return;
    const confirmed = window.confirm('Delete this extra match? If it has a result, the standings will update automatically.');
    if (!confirmed) return;

    try {
      await deleteMatch(match.id);
      setMatches((prev) => prev.filter((item) => item.id !== match.id));
      onMatchUpdated?.();
      setToast({
        open: true,
        message: 'Extra match deleted successfully',
        severity: 'success',
      });
    } catch (error) {
      setToast({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to delete extra match',
        severity: 'error',
      });
    }
  };

  const handleSaveRoundSchedule = async (updates: MatchScheduleUpdate[]) => {
    try {
      setScheduleSaving(true);
      const updatedMatches = await updateMatchesSchedule(updates);

      setMatches((prev) => {
        const updatedById = new Map(updatedMatches.map((match) => [match.id, match]));
        return prev.map((match) => updatedById.get(match.id) ?? match);
      });

      onMatchUpdated?.();
      setToast({
        open: true,
        message: 'Round schedule updated successfully',
        severity: 'success',
      });
    } catch (error) {
      setToast({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to update round schedule',
        severity: 'error',
      });
    } finally {
      setScheduleSaving(false);
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

  const buildMatchesTable = (rows: Match[]) => {
    return `
      <table>
        <thead>
          <tr>
            <th>Round</th>
            <th>Match</th>
            <th>Date</th>
            <th>Original Date</th>
            <th>Time</th>
            <th>Field</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((match) => {
            const team1 = teamMap[match.team1_id] ?? `#${match.team1_id}`;
            const team2 = teamMap[match.team2_id] ?? `#${match.team2_id}`;
            const fieldName = match.field_id
              ? fields.find((field) => field.id === match.field_id)?.name ?? `#${match.field_id}`
              : '-';

            return `
              <tr>
                <td>${escapeHtml(match.round_number ? `Round ${match.round_number}` : '-')}</td>
                <td>${escapeHtml(`${team1} vs ${team2}`)}</td>
                <td>${escapeHtml(match.date ?? '-')}</td>
                <td>${escapeHtml(match.rescheduled_from_date ?? '-')}</td>
                <td>${escapeHtml(match.time ? formatTime12Hour(match.time) : '-')}</td>
                <td>${escapeHtml(fieldName)}</td>
                <td>${escapeHtml(match.rescheduled_from_date ? `${match.status ?? 'scheduled'} / rescheduled` : match.status ?? 'scheduled')}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  };

  const handlePrintLeagueMatches = () => {
    if (visibleLeagueMatches.length === 0) {
      window.alert(
        leagueMatches.length === 0
          ? 'No league matches generated yet. Generate matches before printing.'
          : 'No matches available to print for the selected filters.'
      );
      return;
    }

    if (selectedLeagueTab === 'all') {
      const term = teamSearch.trim();
      if (!term) {
        window.alert('Search and select a team context before printing team rounds.');
        return;
      }

      const groupedByRound = visibleLeagueMatches.reduce<Record<string, Match[]>>((acc, match) => {
        const key = String(match.round_number ?? 'No Round');
        acc[key] = acc[key] ?? [];
        acc[key].push(match);
        return acc;
      }, {});

      const sortedRounds = Object.keys(groupedByRound).sort((left, right) => {
        if (left === 'No Round') return 1;
        if (right === 'No Round') return -1;
        return Number(left) - Number(right);
      });

      printHtml({
        title: term ? `${eventName ?? `Event #${eventId}`} - ${term}` : `${eventName ?? `Event #${eventId}`} - League Schedule`,
        company: printCompany,
        subtitle: term
          ? 'All rounds where this team appears.'
          : 'All league rounds.',
        body: `
          <div class="round-grid">
            ${sortedRounds.map((round) => `
              <section class="round-card">
                <h2>${escapeHtml(round === 'No Round' ? 'No Round' : `Round ${round}`)}</h2>
                ${buildMatchesTable(groupedByRound[round])}
              </section>
            `).join('')}
          </div>
        `,
      });
      return;
    }

    printHtml({
      title: `${eventName ?? `Event #${eventId}`} - Round ${selectedLeagueTab}`,
      company: printCompany,
      subtitle: 'League matchups for this round.',
      body: buildMatchesTable(visibleLeagueMatches),
    });
  };

  return (
    <Stack spacing={4} sx={{ width: '100%', minWidth: 0 }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Typography variant="h6">League Matches</Typography>
          <GenerateFixtureButton
            eventId={eventId}
            eventFormat={eventFormat}
            onGenerated={loadData}
            onSuccess={(message) => showToast(message, 'success')}
            onError={(message) => showToast(message, 'error')}
          />
        </Stack>

        {!loading && leagueMatches.length > 0 && (
          <Tabs
            value={selectedLeagueTab}
            onChange={(_, value) => {
              setSelectedLeagueTab(value);
              setTeamSearch('');
            }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="All" value="all" />
            {uniqueLeagueRounds.map((round) => (
              <Tab key={round} label={`Round ${round}`} value={String(round)} />
            ))}
          </Tabs>
        )}

        {!loading && leagueMatches.length > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {([
              ['all', 'All', quickFilterCounts.all],
              ['played', 'Played', quickFilterCounts.played],
              ['pending', 'Pending', quickFilterCounts.pending],
              ['rescheduled', 'Rescheduled', quickFilterCounts.rescheduled],
            ] as const).map(([value, label, count]) => (
              <Button
                key={value}
                variant={quickFilter === value ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setQuickFilter(value)}
              >
                {label} ({count})
              </Button>
            ))}
          </Stack>
        )}

        {!loading && selectedLeagueTab === 'all' && leagueMatches.length > 0 && (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'flex-start' }}>
            <TextField
              label="Search by team"
              value={teamSearch}
              onChange={(event) => setTeamSearch(event.target.value)}
              placeholder="Type a team name"
              size="small"
              fullWidth
              helperText={
                teamSearch.trim()
                  ? `Showing ${visibleLeagueMatches.length} match${visibleLeagueMatches.length === 1 ? '' : 'es'} across all rounds.`
                  : 'All rounds are grouped by round in columns.'
              }
            />
            <Button
              variant="outlined"
              onClick={handlePrintLeagueMatches}
              disabled={visibleLeagueMatches.length === 0 || !teamSearch.trim()}
              sx={{ minWidth: 180 }}
            >
              Print Team Rounds
            </Button>
          </Stack>
        )}

        {loading && <Typography>Loading matches...</Typography>}

        {!loading && leagueMatches.length === 0 && (
          <Alert severity="info">No league matches generated yet.</Alert>
        )}

        {!loading && selectedLeagueTab !== 'all' && visibleLeagueMatches.length > 0 && (
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="flex-end">
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button variant="contained" color="success" onClick={() => handleAddExtraMatch(Number(selectedLeagueTab))}>
                  Add Extra Match
                </Button>
                <Button variant="outlined" onClick={handlePrintLeagueMatches}>
                  Print Round
                </Button>
              </Stack>
            </Stack>
            <RoundSchedulePlanner
              roundLabel={`Round ${selectedLeagueTab}`}
              matches={visibleLeagueMatches}
              teamMap={teamMap}
              fields={fields}
              loading={scheduleSaving}
              onSave={handleSaveRoundSchedule}
            />
          </Stack>
        )}

        {!loading && leagueMatches.length > 0 && (
          visibleLeagueMatches.length > 0 ? (
            <GroupedMatchesTable
              matches={visibleLeagueMatches}
              teamMap={teamMap}
              fields={fields}
              onEdit={handleEdit}
              onAddExtraMatch={selectedLeagueTab === 'all' ? handleAddExtraMatch : undefined}
              onDeleteExtraMatch={handleDeleteExtraMatch}
              groupByDate={selectedLeagueTab !== 'all'}
              groupByRound={selectedLeagueTab === 'all'}
              compact={selectedLeagueTab === 'all'}
            />
          ) : (
            <Alert severity="info">No matches found for the selected filters.</Alert>
          )
        )}
      </Stack>

      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Typography variant="h6">Playoffs</Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <GeneratePlayoffsButton
              eventId={eventId}
              onGenerated={loadData}
              onSuccess={(message) => showToast(message, 'success')}
              onError={(message) => showToast(message, 'error')}
            />
            <AdvanceKnockoutRoundButton
              eventId={eventId}
              onGenerated={loadData}
              onSuccess={(message) => showToast(message, 'success')}
              onError={(message) => showToast(message, 'error')}
            />
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

      <ExtraMatchDialog
        open={extraMatchDialogOpen}
        roundNumber={extraMatchRound}
        loading={extraMatchSaving}
        teamMap={teamMap}
        fields={fields}
        onClose={handleCloseExtraMatchDialog}
        onSubmit={handleSubmitExtraMatch}
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
