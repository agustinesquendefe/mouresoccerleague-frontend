'use client';

import { useEffect, useState } from 'react';
import { Button, Stack, Typography, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

import { getEventTeams } from '@/services/eventTeams/getEventTeams';
import { removeTeamFromEvent } from '@/services/eventTeams/removeTeamFromEvent';
import AddTeamToEventDialog from './AddTeamToEventDialog';

type Props = {
  eventId: number;
};

export default function EventTeamsSection({ eventId }: Props) {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const data = await getEventTeams(eventId);
      setTeams(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, [eventId]);

  const handleRemove = async (id: number) => {
    try {
      await removeTeamFromEvent(id);
      await loadTeams();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="h6">Teams</Typography>
        <Button variant="contained" onClick={() => setOpenDialog(true)}>
          Add Team
        </Button>
      </Stack>

      {loading && <Typography>Loading...</Typography>}

      {!loading && teams.length === 0 && (
        <Typography>No teams added yet.</Typography>
      )}

      {teams.map((et) => (
        <Stack
          key={et.id}
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography>{et.teams?.name}</Typography>

          <IconButton onClick={() => handleRemove(et.id)}>
            <DeleteIcon />
          </IconButton>
        </Stack>
      ))}

      <AddTeamToEventDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        eventId={eventId}
        onAdded={loadTeams}
      />
    </Stack>
  );
}