'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { supabase } from '@/lib/supabaseClient';
import {
  getEventGroups,
  createEventGroups,
  autoAssignGroups,
  assignTeamToGroup,
} from '@/services/eventGroups';
import { generateGroupStageMatches } from '@/services/matches/generateGroupStageMatches';
import type { EventGroupWithTeams } from '@/models/eventGroup';

type Props = {
  eventId: number;
};

export default function EventGroupsSection({ eventId }: Props) {
  const [groups, setGroups] = useState<EventGroupWithTeams[]>([]);
  const [groupCount, setGroupCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: event } = await supabase
        .from('events')
        .select('group_count')
        .eq('id', eventId)
        .single();

      setGroupCount(event?.group_count ?? null);

      const data = await getEventGroups(eventId);
      setGroups(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId]);

  const handleCreateGroups = async () => {
    if (!groupCount) return;
    try {
      setBusy(true);
      setError(null);
      await createEventGroups(eventId, groupCount);
      setSuccess(`${groupCount} groups created.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create groups');
    } finally {
      setBusy(false);
    }
  };

  const handleAutoAssign = async () => {
    try {
      setBusy(true);
      setError(null);
      await autoAssignGroups(eventId);
      setSuccess('Teams auto-assigned to groups.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to auto-assign teams');
    } finally {
      setBusy(false);
    }
  };

  const handleReassign = async (eventTeamId: number, newGroupId: number) => {
    try {
      setError(null);
      await assignTeamToGroup(eventTeamId, newGroupId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reassign team');
    }
  };

  const handleGenerateMatches = async () => {
    try {
      setBusy(true);
      setError(null);
      await generateGroupStageMatches(eventId);
      setSuccess('Group stage matches generated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate matches');
    } finally {
      setBusy(false);
    }
  };

  const totalAssigned = groups.reduce((sum, g) => sum + g.teams.length, 0);
  const allGroupsHaveTeams = groups.length > 0 && groups.every((g) => g.teams.length >= 2);

  if (loading) {
    return (
      <Stack alignItems="center" py={4}>
        <CircularProgress size={24} />
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Typography variant="h6">Groups</Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          {groups.length === 0 && groupCount && (
            <Button
              variant="outlined"
              size="small"
              onClick={handleCreateGroups}
              disabled={busy}
            >
              Create {groupCount} Groups
            </Button>
          )}

          {groups.length > 0 && (
            <>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ShuffleIcon />}
                onClick={handleAutoAssign}
                disabled={busy}
              >
                Auto-assign Teams
              </Button>

              <Button
                variant="contained"
                size="small"
                startIcon={<AutoFixHighIcon />}
                onClick={handleGenerateMatches}
                disabled={busy || !allGroupsHaveTeams}
              >
                Generate Matches
              </Button>
            </>
          )}
        </Stack>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      {groups.length === 0 && !groupCount && (
        <Alert severity="info">
          This event has no group count configured. Edit the event and set the number of groups.
        </Alert>
      )}

      {groups.length === 0 && groupCount && (
        <Alert severity="info">
          No groups created yet. Click "Create {groupCount} Groups" to get started.
        </Alert>
      )}

      {groups.length > 0 && totalAssigned === 0 && (
        <Alert severity="warning">
          No teams are assigned to groups yet. Click "Auto-assign Teams" or assign them manually below.
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 2,
        }}
      >
        {groups.map((group) => (
          <Paper key={group.id} variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              {group.name}
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                ({group.teams.length} teams)
              </Typography>
            </Typography>

            <Divider sx={{ mb: 1 }} />

            {group.teams.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No teams assigned
              </Typography>
            )}

            <Stack spacing={0.5}>
              {group.teams.map((team) => (
                <Stack
                  key={team.event_team_id}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={1}
                >
                  <Typography variant="body2" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {team.team_name}
                  </Typography>

                  <Select
                    size="small"
                    value={group.id}
                    onChange={(e) => handleReassign(team.event_team_id, Number(e.target.value))}
                    sx={{ fontSize: 12, height: 28, minWidth: 80 }}
                  >
                    {groups.map((g) => (
                      <MenuItem key={g.id} value={g.id} sx={{ fontSize: 12 }}>
                        {g.name}
                      </MenuItem>
                    ))}
                  </Select>
                </Stack>
              ))}
            </Stack>
          </Paper>
        ))}
      </Box>
    </Stack>
  );
}
