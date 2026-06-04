'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';

import { supabase } from '@/lib/supabaseClient';
import type { Category } from '@/models/category';
import { getCategories } from '@/services/categories';
import { addTeamToEvent } from '@/services/eventTeams/addTeamToEvent';
import { WEEKDAY_OPTIONS, getWeekdayLabel } from '@/utils/weekdays';

type TeamOption = {
  id: number;
  name: string;
  team_categories?: { category_id: number }[];
  team_playing_days?: { day_of_week: number }[];
};

type EventTeamRow = {
  team_id: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  eventId: number;
  onAdded: () => void;
};

export default function AddTeamToEventDialog({
  open,
  onClose,
  eventId,
  onAdded,
}: Props) {
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [existingEventTeams, setExistingEventTeams] = useState<EventTeamRow[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | ''>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [eventCategoryId, setEventCategoryId] = useState<number | null>(null);
  const [eventMatchDay, setEventMatchDay] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('');
  const [dayFilter, setDayFilter] = useState<number | ''>('');
  const [filtersReady, setFiltersReady] = useState(false);

  useEffect(() => {
    if (!open) return;

    const loadEventFilters = async () => {
      try {
        setErrorMessage(null);
        setLoading(true);
        setFiltersReady(false);
        setSearch('');

        const [eventResponse, categoriesResponse] = await Promise.all([
          supabase
            .from('events')
            .select('category_id, match_day_of_week')
            .eq('id', eventId)
            .single(),
          getCategories(),
        ]);

        if (eventResponse.error) throw new Error(eventResponse.error.message);

        const catId: number | null = eventResponse.data?.category_id ?? null;
        const matchDay: number | null = eventResponse.data?.match_day_of_week ?? null;
        setEventCategoryId(catId);
        setEventMatchDay(matchDay);
        setCategoryFilter(catId ?? '');
        setDayFilter(matchDay ?? '');
        setCategories(categoriesResponse);
        setSelectedTeam('');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load teams';
        setErrorMessage(message);
      } finally {
        setLoading(false);
        setFiltersReady(true);
      }
    };

    loadEventFilters();
  }, [open, eventId]);

  useEffect(() => {
    if (!open || !filtersReady) return;

    const loadTeams = async () => {
      try {
        setErrorMessage(null);
        setLoading(true);

        const categoryId = categoryFilter === '' ? null : Number(categoryFilter);
        const matchDay = dayFilter === '' ? null : Number(dayFilter);
        const term = search.trim();
        const baseSelect = [
          'id',
          'name',
          categoryId !== null ? 'team_categories!inner(category_id)' : 'team_categories(category_id)',
          matchDay !== null ? 'team_playing_days!inner(day_of_week)' : 'team_playing_days(day_of_week)',
        ].join(', ');

        let teamsQuery = supabase
          .from('teams')
          .select(baseSelect)
          .order('name');

        if (categoryId !== null) {
          teamsQuery = teamsQuery.eq('team_categories.category_id', categoryId);
        }

        if (matchDay !== null) {
          teamsQuery = teamsQuery.eq('team_playing_days.day_of_week', matchDay);
        }

        if (term) {
          teamsQuery = teamsQuery.or(`name.ilike.%${term}%,code.ilike.%${term}%`);
        }

        const [teamsResponse, eventTeamsResponse] = await Promise.all([
          teamsQuery,
          supabase.from('event_teams').select('team_id').eq('event_id', eventId),
        ]);

        if (teamsResponse.error) throw new Error(teamsResponse.error.message);
        if (eventTeamsResponse.error) throw new Error(eventTeamsResponse.error.message);

        setTeams(
          ((teamsResponse.data ?? []) as unknown as TeamOption[]).map(({ id, name }) => ({ id, name }))
        );
        setExistingEventTeams((eventTeamsResponse.data ?? []) as EventTeamRow[]);
        setSelectedTeam('');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load teams';
        setErrorMessage(message);
      } finally {
        setLoading(false);
      }
    };

    loadTeams();
  }, [open, filtersReady, eventId, categoryFilter, dayFilter, search]);

  const availableTeams = useMemo(() => {
    const existingTeamIds = new Set(existingEventTeams.map((item) => item.team_id));
    return teams.filter((team) => !existingTeamIds.has(team.id));
  }, [teams, existingEventTeams]);

  const handleAdd = async () => {
    if (!selectedTeam) return;

    try {
      setErrorMessage(null);
      setLoading(true);

      await addTeamToEvent(eventId, Number(selectedTeam));
      await onAdded();
      onClose();
      setSelectedTeam('');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to add team to event';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth>
      <DialogTitle>Add Team</DialogTitle>

      <DialogContent>
        {errorMessage && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errorMessage}
          </Alert>
        )}

        {eventCategoryId !== null && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Category starts with this event&apos;s category.
          </Alert>
        )}

        {eventMatchDay !== null && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Playing day starts with this event&apos;s match day: {getWeekdayLabel(eventMatchDay)}.
          </Alert>
        )}

        {eventCategoryId === null && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            This event has no category set. All teams are shown.
          </Alert>
        )}

        {eventMatchDay === null && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            This event has no match day set. Teams are not filtered by playing day.
          </Alert>
        )}

        <TextField
          label="Search team"
          placeholder="Name or code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          sx={{ mt: 2 }}
          disabled={loading}
        />

        <TextField
          select
          label="Category"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value === '' ? '' : Number(e.target.value))}
          fullWidth
          sx={{ mt: 2 }}
          disabled={loading}
        >
          <MenuItem value="">All categories</MenuItem>
          {categories.map((category) => (
            <MenuItem key={category.id} value={category.id}>
              {category.name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Playing day"
          value={dayFilter}
          onChange={(e) => setDayFilter(e.target.value === '' ? '' : Number(e.target.value))}
          fullWidth
          sx={{ mt: 2 }}
          disabled={loading}
        >
          <MenuItem value="">All days</MenuItem>
          {WEEKDAY_OPTIONS.map((day) => (
            <MenuItem key={day.value} value={day.value}>
              {day.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Select Team"
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(Number(e.target.value))}
          fullWidth
          sx={{ mt: 2 }}
          disabled={loading || availableTeams.length === 0}
          helperText={
            availableTeams.length === 0 && !loading
              ? 'No available teams to add.'
              : 'Only teams not yet added are shown.'
          }
        >
          {availableTeams.map((team) => (
            <MenuItem key={team.id} value={team.id}>
              {team.name}
            </MenuItem>
          ))}
        </TextField>

        {availableTeams.length === 0 && !loading && (eventCategoryId !== null || eventMatchDay !== null) && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Tip: Assign the matching category and playing day to teams in the Teams section to see them here.
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleAdd}
          disabled={loading || !selectedTeam || availableTeams.length === 0}
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}
