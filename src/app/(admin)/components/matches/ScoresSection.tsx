'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Link,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import type { Field } from '@/models/field';
import {
  getAllMatches,
  updateMatchScore,
  type MatchListRow,
  type MatchScoreUpdate,
} from '@/services/matches';
import { getFields } from '@/services/fields';
import { supabase } from '@/lib/supabaseClient';
import { formatTime12Hour } from '@/utils/formatTime';
import InlineMatchCalendar from './InlineMatchCalendar';
import ScoreDialog from './ScoreDialog';
import GameCardDialog from './GameCardDialog';

type EventOption = {
  id: number;
  name: string | null;
};

function dateFromKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function todayKey(): string {
  return dateKey(new Date());
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function statusColor(status: string | null): 'default' | 'success' | 'warning' | 'info' | 'error' {
  if (status === 'played') return 'success';
  if (status === 'in_progress') return 'warning';
  if (status === 'cancelled') return 'error';
  if (status === 'scheduled') return 'info';
  return 'default';
}

export default function ScoresSection() {
  const leaguePageSize = 8;
  const initialDate = useMemo(() => todayKey(), []);
  const [matches, setMatches] = useState<MatchListRow[]>([]);
  const [matchCountByDate, setMatchCountByDate] = useState<Record<string, number>>({});
  const [fields, setFields] = useState<Field[]>([]);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventOption | null>(null);
  const [leagueSearch, setLeagueSearch] = useState('');
  const [debouncedLeagueSearch, setDebouncedLeagueSearch] = useState('');
  const [leaguePage, setLeaguePage] = useState(0);
  const [leagueLoading, setLeagueLoading] = useState(false);
  const [hasMoreLeagues, setHasMoreLeagues] = useState(false);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = dateFromKey(initialDate);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoreMatch, setScoreMatch] = useState<MatchListRow | null>(null);
  const [gameCardMatch, setGameCardMatch] = useState<MatchListRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        setError(null);
        const fieldRows = await getFields();
        if (!active) return;
        setFields(fieldRows);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load scores.');
        }
      }
    };

    void loadData();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;

    const loadMatchesForSelection = async () => {
      try {
        setLoading(true);
        setError(null);
        const rows = await getAllMatches({
          date: selectedDate,
          eventId: selectedEvent?.id ?? null,
          status: statusFilter === 'all' ? null : statusFilter,
        });
        if (active) setMatches(rows);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load matches.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadMatchesForSelection();
    return () => { active = false; };
  }, [selectedDate, selectedEvent, statusFilter]);

  useEffect(() => {
    let active = true;

    const loadCalendarCounts = async () => {
      const firstOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
      const gridStart = new Date(firstOfMonth);
      gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());
      const gridEnd = new Date(gridStart);
      gridEnd.setDate(gridStart.getDate() + 41);

      let query = supabase
        .from('matches')
        .select('date')
        .gte('date', dateKey(gridStart))
        .lte('date', dateKey(gridEnd));

      if (selectedEvent) query = query.eq('event_id', selectedEvent.id);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);

      const { data, error: countError } = await query;
      if (!active) return;
      if (countError) {
        setError(countError.message);
        return;
      }

      const counts = (data ?? []).reduce<Record<string, number>>((result, row) => {
        if (row.date) result[row.date] = (result[row.date] ?? 0) + 1;
        return result;
      }, {});
      setMatchCountByDate(counts);
    };

    void loadCalendarCounts();
    return () => { active = false; };
  }, [visibleMonth, selectedEvent, statusFilter]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setEvents([]);
      setLeaguePage(0);
      setDebouncedLeagueSearch(leagueSearch.trim());
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [leagueSearch]);

  useEffect(() => {
    let active = true;

    const loadLeagues = async () => {
      try {
        setLeagueLoading(true);
        const from = leaguePage * leaguePageSize;
        const to = from + leaguePageSize - 1;
        let query = supabase
          .from('events')
          .select('id, name', { count: 'exact' })
          .order('name', { ascending: true })
          .range(from, to);

        if (debouncedLeagueSearch) {
          query = query.ilike('name', `%${debouncedLeagueSearch}%`);
        }

        const { data, error: leagueError, count } = await query;
        if (!active) return;
        if (leagueError) throw new Error(leagueError.message);

        const rows = (data ?? []) as EventOption[];
        setEvents((current) => {
          const next = leaguePage === 0 ? rows : [...current, ...rows];
          return Array.from(new Map(next.map((event) => [event.id, event])).values());
        });
        setHasMoreLeagues(count != null ? to + 1 < count : rows.length === leaguePageSize);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load leagues.');
        }
      } finally {
        if (active) setLeagueLoading(false);
      }
    };

    void loadLeagues();
    return () => { active = false; };
  }, [debouncedLeagueSearch, leaguePage]);

  const teamMap = useMemo(() => matches.reduce<Record<number, string>>((result, match) => {
    result[match.team1_id] = match.team1_name ?? `Team #${match.team1_id}`;
    result[match.team2_id] = match.team2_name ?? `Team #${match.team2_id}`;
    return result;
  }, {}), [matches]);

  const visibleMatches = useMemo(() => [...matches]
    .sort((left, right) =>
      String(left.time ?? '').localeCompare(String(right.time ?? '')) ||
      (left.field_number ?? 999) - (right.field_number ?? 999) ||
      left.id - right.id),
  [matches]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    const parsed = dateFromKey(date);
    setVisibleMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  };

  const handleSaveScore = async (update: MatchScoreUpdate) => {
    if (!scoreMatch) return;
    try {
      setSaving(true);
      const updated = await updateMatchScore(scoreMatch, update);
      setMatches((current) => current.map((match) =>
        match.id === updated.id ? { ...match, ...updated } : match));
      setScoreMatch(null);
      setToast('Score updated successfully.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update the score.');
    } finally {
      setSaving(false);
    }
  };

  const formattedSelectedDate = dateFromKey(selectedDate).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={700}>Scores</Typography>
        <Typography variant="body2" color="text.secondary">
          View today&apos;s games, enter results, and review game cards across competitions.
        </Typography>
      </Box>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Autocomplete
              options={events}
              value={selectedEvent}
              inputValue={leagueSearch}
              onChange={(_, value) => setSelectedEvent(value)}
              onInputChange={(_, value) => setLeagueSearch(value)}
              getOptionLabel={(event) => event.name ?? `Event #${event.id}`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              filterOptions={(options) => options}
              loading={leagueLoading && events.length === 0}
              noOptionsText={leagueLoading ? 'Loading leagues…' : 'No leagues found'}
              fullWidth
              PaperComponent={(paperProps) => (
                <Paper {...paperProps}>
                  {paperProps.children}
                  {hasMoreLeagues && (
                    <Box sx={{ borderTop: 1, borderColor: 'divider', p: 1 }}>
                      <Button
                        fullWidth
                        size="small"
                        disabled={leagueLoading}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setLeaguePage((page) => page + 1)}
                      >
                        {leagueLoading ? 'Loading…' : 'Load more leagues'}
                      </Button>
                    </Box>
                  )}
                </Paper>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="League"
                  placeholder="All leagues"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {leagueLoading && events.length === 0 ? <CircularProgress size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <TextField
              select
              label="Game status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              fullWidth
            >
              <MenuItem value="all">All statuses</MenuItem>
              <MenuItem value="scheduled">Scheduled</MenuItem>
              <MenuItem value="in_progress">In progress</MenuItem>
              <MenuItem value="played">Played</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </TextField>
          </Stack>

          <Stack direction={{ xs: 'column', xl: 'row' }} spacing={3} alignItems={{ xs: 'stretch', xl: 'flex-start' }}>
            <Box sx={{ flexShrink: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <CalendarMonthIcon color="primary" />
                <Typography fontWeight={700}>Game date</Typography>
              </Stack>
              <InlineMatchCalendar
                month={visibleMonth}
                selectedDate={selectedDate}
                matchCountByDate={matchCountByDate}
                onMonthChange={setVisibleMonth}
                onDateChange={handleDateChange}
              />
            </Box>

            <Box sx={{ minWidth: 0, flex: 1, width: '100%' }}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 1.5 }}>
                {formattedSelectedDate}
              </Typography>
              {loading ? (
                <Stack alignItems="center" sx={{ py: 8 }}><CircularProgress /></Stack>
              ) : visibleMatches.length === 0 ? (
                <Alert severity="info">No matches match the selected date and filters.</Alert>
              ) : (
                <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
                  <Table size="small" sx={{ minWidth: 860 }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell>League</TableCell>
                        <TableCell>Venue</TableCell>
                        <TableCell>Time</TableCell>
                        <TableCell>Game</TableCell>
                        <TableCell align="center">Result</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Game Card</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {visibleMatches.map((match) => {
                        const fieldName = match.field_name ??
                          fields.find((field) => field.id === match.field_id)?.name ??
                          (match.field_number ? `Field ${match.field_number}` : '—');
                        const hasScore = match.score1 != null && match.score2 != null;
                        return (
                          <TableRow key={match.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight={700}>
                                {match.event_name ?? `Event #${match.event_id}`}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Round {match.round_number ?? '—'}
                              </Typography>
                            </TableCell>
                            <TableCell>{fieldName}</TableCell>
                            <TableCell>{match.time ? formatTime12Hour(match.time) : '—'}</TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={700}>
                                {teamMap[match.team1_id]}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                vs {teamMap[match.team2_id]}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Link
                                component="button"
                                type="button"
                                underline="always"
                                fontWeight={800}
                                onClick={() => setScoreMatch(match)}
                              >
                                {hasScore ? `${match.score1} : ${match.score2}` : 'Enter score'}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                color={statusColor(match.status)}
                                variant={match.status === 'played' ? 'filled' : 'outlined'}
                                label={String(match.status ?? 'scheduled').replaceAll('_', ' ')}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Button size="small" onClick={() => setGameCardMatch(match)}>View</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Stack>
        </Stack>
      </Paper>

      <ScoreDialog
        open={Boolean(scoreMatch)}
        match={scoreMatch}
        teamMap={teamMap}
        loading={saving}
        onClose={() => setScoreMatch(null)}
        onSave={handleSaveScore}
      />
      <GameCardDialog
        open={Boolean(gameCardMatch)}
        match={gameCardMatch}
        teamMap={teamMap}
        fields={fields}
        onClose={() => setGameCardMatch(null)}
      />

      <Snackbar open={Boolean(toast)} autoHideDuration={3500} onClose={() => setToast(null)}>
        <Alert severity="success" variant="filled" onClose={() => setToast(null)}>{toast}</Alert>
      </Snackbar>
    </Stack>
  );
}
