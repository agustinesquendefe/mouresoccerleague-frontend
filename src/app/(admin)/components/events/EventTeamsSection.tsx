'use client';

import { useEffect, useRef, useState } from 'react';
import { Alert, Avatar, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, Stack, TextField, Tooltip, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import UploadIcon from '@mui/icons-material/Upload';
import GroupsIcon from '@mui/icons-material/Groups';

import { getEventTeams } from '@/services/eventTeams/getEventTeams';
import { removeTeamFromEvent } from '@/services/eventTeams/removeTeamFromEvent';
import {
  hasStartedLeagueMatches,
  updateEventTeamsOrder,
} from '@/services/eventTeams/updateEventTeamsOrder';
import { updateEventTeamDisplayName } from '@/services/eventTeams/updateEventTeamDisplayName';
import { uploadImage } from '@/services/storage/uploadImage';
import { supabase } from '@/lib/supabaseClient';
import AddTeamToEventDialog from './AddTeamToEventDialog';
import TeamPlayersSection from '@/app/(admin)/components/teams/TeamPlayersSection';

type EventTeamRow = {
  id: number;
  team_id: number;
  display_name: string | null;
  order_index: number;
  player_count?: number;
  teams?: {
    id: number;
    name: string;
    logo_url?: string | null;
  } | null;
};

type Props = {
  eventId: number;
  onPlayerRecordsChanged?: () => Promise<void> | void;
};

const ACCEPTED = 'image/png,image/webp,image/svg+xml';

export default function EventTeamsSection({ eventId, onPlayerRecordsChanged }: Props) {
  const [teams, setTeams] = useState<EventTeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [draggingTeamId, setDraggingTeamId] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const [reorderLocked, setReorderLocked] = useState(false);
  const [editingEventTeamId, setEditingEventTeamId] = useState<number | null>(null);
  const [draftDisplayName, setDraftDisplayName] = useState('');
  const [savingDisplayNameId, setSavingDisplayNameId] = useState<number | null>(null);
  const [rosterTeam, setRosterTeam] = useState<EventTeamRow | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingTeamRef = useRef<{ teamId: number } | null>(null);

  const loadTeams = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const [data, locked, rosterResponse] = await Promise.all([
        getEventTeams(eventId),
        hasStartedLeagueMatches(eventId),
        supabase
          .from('team_players')
          .select('team_id')
          .eq('event_id', eventId),
      ]);

      if (rosterResponse.error) {
        throw new Error(rosterResponse.error.message);
      }

      const playerCounts = new Map<number, number>();
      (rosterResponse.data ?? []).forEach((row) => {
        playerCounts.set(row.team_id, (playerCounts.get(row.team_id) ?? 0) + 1);
      });

      setReorderLocked(locked);
      setTeams(
        ((data ?? []) as any[]).map((eventTeam) => ({
          ...eventTeam,
          player_count: playerCounts.get(eventTeam.team_id) ?? 0,
          teams: Array.isArray(eventTeam.teams)
            ? (eventTeam.teams[0] ?? null)
            : (eventTeam.teams ?? null),
        })) as EventTeamRow[]
      );
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load teams');
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
      await onPlayerRecordsChanged?.();
      setSuccessMessage('Team removed from event.');
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to remove team');
    }
  };

  const handleUploadClick = (teamId: number) => {
    pendingTeamRef.current = { teamId };
    fileInputRef.current?.click();
  };

  const startEditingDisplayName = (eventTeam: EventTeamRow) => {
    setEditingEventTeamId(eventTeam.id);
    setDraftDisplayName(eventTeam.display_name ?? eventTeam.teams?.name ?? '');
  };

  const cancelEditingDisplayName = () => {
    setEditingEventTeamId(null);
    setDraftDisplayName('');
  };

  const saveDisplayName = async (eventTeam: EventTeamRow) => {
    try {
      setSavingDisplayNameId(eventTeam.id);
      await updateEventTeamDisplayName(eventTeam.id, draftDisplayName);
      await loadTeams();
      await onPlayerRecordsChanged?.();
      cancelEditingDisplayName();
      setSuccessMessage('Team name updated.');
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update team name');
    } finally {
      setSavingDisplayNameId(null);
    }
  };

  const moveTeam = async (draggedTeamId: number, targetTeamId: number) => {
    if (reorderLocked) {
      return;
    }

    if (draggedTeamId === targetTeamId) {
      return;
    }

    const currentTeams = [...teams];
    const fromIndex = currentTeams.findIndex((team) => team.team_id === draggedTeamId);
    const toIndex = currentTeams.findIndex((team) => team.team_id === targetTeamId);

    if (fromIndex === -1 || toIndex === -1) {
      return;
    }

    const nextTeams = [...currentTeams];
    const [movedTeam] = nextTeams.splice(fromIndex, 1);
    nextTeams.splice(toIndex, 0, movedTeam);

    const reorderedTeams = nextTeams.map((team, index) => ({
      ...team,
      order_index: index,
    }));

    setTeams(reorderedTeams);

    try {
      setReordering(true);
      await updateEventTeamsOrder(
        eventId,
        reorderedTeams.map((team) => ({
          id: team.id,
          order_index: team.order_index,
        }))
      );
      setReorderLocked(await hasStartedLeagueMatches(eventId));
      setSuccessMessage('Team order saved.');
    } catch (error) {
      setTeams(currentTeams);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save team order');
    } finally {
      setReordering(false);
    }
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
      await onPlayerRecordsChanged?.();
      setSuccessMessage('Team logo updated.');
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to upload image');
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

      <Alert severity="info">
        Drag teams from the handle to define fixture order. The first team faces the last, the second faces the second-to-last, and so on.
      </Alert>

      {errorMessage && (
        <Alert severity="error" onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {reorderLocked && (
        <Alert severity="warning">
          Team order is locked because this event already has a league match in progress or played.
        </Alert>
      )}

      {loading && <Typography>Loading...</Typography>}

      {!loading && teams.length === 0 && (
        <Typography>No teams added yet.</Typography>
      )}

      {teams.map((et) => (
        <Paper
          key={et.id}
          variant="outlined"
          draggable={!reorderLocked && !reordering}
          onDragStart={(event) => {
            if (reorderLocked || reordering) {
              event.preventDefault();
              return;
            }
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', String(et.team_id));
            setDraggingTeamId(et.team_id);
          }}
          onDragOver={(event) => {
            if (reorderLocked || reordering) {
              return;
            }
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(event) => {
            if (reorderLocked || reordering) {
              return;
            }
            event.preventDefault();
            const draggedId = Number(event.dataTransfer.getData('text/plain'));
            void moveTeam(draggedId, et.team_id);
            setDraggingTeamId(null);
          }}
          onDragEnd={() => setDraggingTeamId(null)}
          sx={{
            borderColor: draggingTeamId === et.team_id ? 'primary.main' : undefined,
            bgcolor: draggingTeamId === et.team_id ? 'action.hover' : undefined,
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ px: 1.5, py: 1 }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Tooltip
                title={
                  reorderLocked
                    ? 'Team order is locked after the first league match starts.'
                    : 'Drag to reorder teams'
                }
              >
                <span>
                  <IconButton
                    size="small"
                    sx={{ cursor: reordering ? 'progress' : reorderLocked ? 'not-allowed' : 'grab' }}
                    disabled={reordering || reorderLocked}
                  >
                    <DragIndicatorIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

              <Avatar
                src={et.teams?.logo_url ?? undefined}
                alt={et.display_name ?? et.teams?.name}
                variant="rounded"
                sx={{ width: 36, height: 36 }}
              />
              {editingEventTeamId === et.id ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    size="small"
                    label="Event team name"
                    value={draftDisplayName}
                    onChange={(event) => setDraftDisplayName(event.target.value)}
                    placeholder={et.teams?.name ?? 'Team name'}
                    disabled={savingDisplayNameId === et.id}
                  />
                  <Tooltip title="Save name for this event">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => saveDisplayName(et)}
                        disabled={savingDisplayNameId === et.id}
                      >
                        {savingDisplayNameId === et.id ? <CircularProgress size={18} /> : <SaveIcon fontSize="small" />}
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Cancel">
                    <IconButton size="small" onClick={cancelEditingDisplayName}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ) : (
                <Stack spacing={0.25}>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography>{et.display_name ?? et.teams?.name}</Typography>
                    <Tooltip title="Rename only in this event">
                      <IconButton size="small" onClick={() => startEditingDisplayName(et)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Position {et.order_index + 1}
                    {` | Players: ${et.player_count ?? 0}`}
                    {et.display_name ? ` | Base team: ${et.teams?.name ?? `#${et.team_id}`}` : ''}
                  </Typography>
                </Stack>
              )}
            </Stack>

            <Stack direction="row" spacing={0.5} alignItems="center">
              <Tooltip title="Manage roster for this event">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<GroupsIcon />}
                  onClick={() => setRosterTeam(et)}
                >
                  Roster
                </Button>
              </Tooltip>
              {uploadingId === et.teams?.id ? (
                <CircularProgress size={20} />
              ) : (
                <Tooltip title="Upload logo (PNG, WebP, SVG)">
                  <IconButton size="small" onClick={() => handleUploadClick(et.team_id)}>
                    <UploadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <IconButton onClick={() => handleRemove(et.id)}>
                <DeleteIcon />
              </IconButton>
            </Stack>
          </Stack>
        </Paper>
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
        onAdded={async () => {
          await loadTeams();
          await onPlayerRecordsChanged?.();
        }}
      />

      <Dialog
        open={Boolean(rosterTeam)}
        onClose={() => setRosterTeam(null)}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>
          Event Roster · {rosterTeam?.display_name ?? rosterTeam?.teams?.name ?? 'Team'}
        </DialogTitle>
        <DialogContent dividers>
          {rosterTeam && (
            <TeamPlayersSection
              teamId={rosterTeam.team_id}
              eventId={eventId}
              teamName={rosterTeam.display_name ?? rosterTeam.teams?.name ?? `Team #${rosterTeam.team_id}`}
              teamLogoUrl={rosterTeam.teams?.logo_url ?? null}
              onRosterChanged={async () => {
                await loadTeams();
                await onPlayerRecordsChanged?.();
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRosterTeam(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
