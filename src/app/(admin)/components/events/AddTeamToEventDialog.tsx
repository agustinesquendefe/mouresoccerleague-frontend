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

  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      try {
        setErrorMessage(null);
        setLoading(true);

        const [teamsResponse, eventTeamsResponse] = await Promise.all([
          supabase.from('teams').select('id, name').order('name'),
          supabase
            .from('event_teams')
            .select('team_id')
            .eq('event_id', eventId),
        ]);

        if (teamsResponse.error) {
          throw new Error(teamsResponse.error.message);
        }

        if (eventTeamsResponse.error) {
          throw new Error(eventTeamsResponse.error.message);
        }

        setTeams((teamsResponse.data ?? []) as TeamOption[]);
        setExistingEventTeams((eventTeamsResponse.data ?? []) as EventTeamRow[]);
        setSelectedTeam('');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to load teams';
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

        <TextField
          select
          label="Select Team"
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(Number(e.target.value))}
          fullWidth
          sx={{ mt: 2 }}
          disabled={loading || availableTeams.length === 0}
          helperText={
            availableTeams.length === 0
              ? 'All available teams are already added to this event.'
              : 'Only teams not yet added are shown.'
          }
        >
          {availableTeams.map((team) => (
            <MenuItem key={team.id} value={team.id}>
              {team.name}
            </MenuItem>
          ))}
        </TextField>
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