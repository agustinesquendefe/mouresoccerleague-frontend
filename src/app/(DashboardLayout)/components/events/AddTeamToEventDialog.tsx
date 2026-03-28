'use client';

import { useEffect, useState } from 'react';
import {
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
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | ''>('');

  useEffect(() => {
    if (!open) return;

    const loadTeams = async () => {
      const { data } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');

      setTeams(data || []);
    };

    loadTeams();
  }, [open]);

  const handleAdd = async () => {
    if (!selectedTeam) return;

    try {
      await addTeamToEvent(eventId, Number(selectedTeam));
      onAdded();
      onClose();
      setSelectedTeam('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>Add Team</DialogTitle>

      <DialogContent>
        <TextField
          select
          label="Select Team"
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(Number(e.target.value))}
          fullWidth
          sx={{ mt: 2 }}
        >
          {teams.map((team) => (
            <MenuItem key={team.id} value={team.id}>
              {team.name}
            </MenuItem>
          ))}
        </TextField>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleAdd}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}