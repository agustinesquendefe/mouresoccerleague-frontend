'use client';

import { useEffect, useRef, useState } from 'react';
import { Avatar, Button, CircularProgress, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadIcon from '@mui/icons-material/Upload';

import { getEventTeams } from '@/services/eventTeams/getEventTeams';
import { removeTeamFromEvent } from '@/services/eventTeams/removeTeamFromEvent';
import { uploadImage } from '@/services/storage/uploadImage';
import { supabase } from '@/lib/supabaseClient';
import AddTeamToEventDialog from './AddTeamToEventDialog';

type Props = {
  eventId: number;
};

const ACCEPTED = 'image/png,image/webp,image/svg+xml';

export default function EventTeamsSection({ eventId }: Props) {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingTeamRef = useRef<{ teamId: number } | null>(null);

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

  const handleUploadClick = (teamId: number) => {
    pendingTeamRef.current = { teamId };
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingTeamRef.current) return;

    const { teamId } = pendingTeamRef.current;
    pendingTeamRef.current = null;
    e.target.value = '';

    try {
      setUploadingId(teamId);
      const ext = file.name.split('.').pop() ?? 'png';
      const { publicUrl } = await uploadImage({
        bucket: 'team-logos',
        path: `${teamId}.${ext}`,
        file,
        upsert: true,
      });

      await supabase.from('teams').update({ logo_url: publicUrl }).eq('id', teamId);
      await loadTeams();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploadingId(null);
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
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar
              src={et.teams?.logo_url ?? undefined}
              alt={et.teams?.name}
              variant="rounded"
              sx={{ width: 36, height: 36 }}
            />
            <Typography>{et.teams?.name}</Typography>
          </Stack>

          <Stack direction="row" spacing={0.5} alignItems="center">
            {uploadingId === et.teams?.id ? (
              <CircularProgress size={20} />
            ) : (
              <Tooltip title="Upload logo (PNG, WebP, SVG)">
                <IconButton size="small" onClick={() => handleUploadClick(et.teams?.id)}>
                  <UploadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <IconButton onClick={() => handleRemove(et.id)}>
              <DeleteIcon />
            </IconButton>
          </Stack>
        </Stack>
      ))}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <AddTeamToEventDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        eventId={eventId}
        onAdded={loadTeams}
      />
    </Stack>
  );
}