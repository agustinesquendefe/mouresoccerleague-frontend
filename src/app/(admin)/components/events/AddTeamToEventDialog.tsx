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
import { addTeamToEvent } from '@/services/eventTeams/addTeamToEvent';

type TeamOption = {
  id: number;
  name: string;
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

  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      try {
        setErrorMessage(null);
        setLoading(true);

        // Load event details to get category_id
        const eventResponse = await supabase
          .from('events')
          .select('category_id')
          .eq('id', eventId)
          .single();

        if (eventResponse.error) throw new Error(eventResponse.error.message);

        const catId: number | null = eventResponse.data?.category_id ?? null;
        setEventCategoryId(catId);

        // Build teams query — filter by category if the event has one
        let teamsQuery = supabase.from('teams').select('id, name').order('name');
        if (catId !== null) {
          teamsQuery = teamsQuery.eq('category_id', catId);
        }

        const [teamsResponse, eventTeamsResponse] = await Promise.all([
          teamsQuery,
          supabase.from('event_teams').select('team_id').eq('event_id', eventId),
        ]);

        if (teamsResponse.error) throw new Error(teamsResponse.error.message);
        if (eventTeamsResponse.error) throw new Error(eventTeamsResponse.error.message);

        setTeams((teamsResponse.data ?? []) as TeamOption[]);
        setExistingEventTeams((eventTeamsResponse.data ?? []) as EventTeamRow[]);
        setSelectedTeam('');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load teams';
        setErrorMessage(message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [open, eventId]);

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
            Only teams matching this event&apos;s category are shown.
          </Alert>
        )}

        {eventCategoryId === null && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            This event has no category set. All teams are shown.
          </Alert>
        )}

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

        {availableTeams.length === 0 && !loading && eventCategoryId !== null && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Tip: Assign the same category to teams in the Teams section to see them here.
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
