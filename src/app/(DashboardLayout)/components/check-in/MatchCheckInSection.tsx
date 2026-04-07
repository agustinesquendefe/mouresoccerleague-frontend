'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { supabase } from '@/lib/supabaseClient';

type MatchData = {
  id: number;
  team1_id: number;
  team2_id: number;
  team1_name?: string | null;
  team2_name?: string | null;
};

type TeamOption = {
  id: number;
  name: string;
};

type PlayerRow = {
  id: number;
  first_name: string;
  last_name: string;
};

type CheckedInRow = {
  id: number;
  player_id: number;
  checked_in_at: string | null;
  status: string | null;
  method: string | null;
  player: PlayerRow | null;
};

type Props = {
  matchId: number;
};

function getPlayerFullName(player: Pick<PlayerRow, 'first_name' | 'last_name'>) {
  return `${player.first_name} ${player.last_name}`.trim();
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

export default function MatchCheckInSection({ matchId }: Props) {

  const [match, setMatch] = useState<MatchData | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [search, setSearch] = useState('');
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [checkedInRows, setCheckedInRows] = useState<CheckedInRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPlayerId, setSavingPlayerId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const teamOptions = useMemo<TeamOption[]>(() => {
    if (!match) return [];

    return [
      { id: match.team1_id, name: match.team1_name ?? `Team #${match.team1_id}` },
      { id: match.team2_id, name: match.team2_name ?? `Team #${match.team2_id}` },
    ];
  }, [match]);

  const loadMatch = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        id,
        team1_id,
        team2_id,
        team1:teams!matches_team1_id_fkey ( name ),
        team2:teams!matches_team2_id_fkey ( name )
      `)
      .eq('id', matchId)
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to load match');
    }

    const row = data as any;

    setMatch({
      id: row.id,
      team1_id: row.team1_id,
      team2_id: row.team2_id,
      team1_name: row.team1?.name ?? null,
      team2_name: row.team2?.name ?? null,
    });

    if (!selectedTeamId) {
      setSelectedTeamId(String(row.team1_id));
    }
  };

  const loadCheckedIns = async () => {
    const { data, error } = await supabase
      .from('match_check_ins')
      .select(`
        id,
        player_id,
        checked_in_at,
        status,
        method,
        player:players (
          id,
          first_name,
          last_name
        )
      `)
      .eq('match_id', matchId)
      .order('checked_in_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    setCheckedInRows(
      (data ?? []).map((row: any) => ({
        ...row,
        player: Array.isArray(row.player) ? row.player[0] ?? null : row.player ?? null,
      }))
    );
  };

  const loadPlayers = async (teamId: number, term: string) => {
    const { data, error } = await supabase
      .from('team_players')
      .select(`
        player:players (
          id,
          first_name,
          last_name
        )
      `)
      .eq('team_id', teamId);

    if (error) {
      throw new Error(error.message);
    }

    const rawPlayers = ((data ?? []) as any[])
      .map((row) => row.player)
      .filter(Boolean) as PlayerRow[];

    const query = term.trim().toLowerCase();

    const filtered = !query
      ? rawPlayers
      : rawPlayers.filter((player) =>
          getPlayerFullName(player).toLowerCase().includes(query) ||
          String(player.id).includes(query)
        );

    setPlayers(filtered);
  }

  const loadAll = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      await loadMatch();
      await loadCheckedIns();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load check-in data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [matchId]);

  useEffect(() => {
    const teamId = Number(selectedTeamId);
    if (!teamId) {
      setPlayers([]);
      return;
    }

    loadPlayers(teamId, search).catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load players');
    });
  }, [selectedTeamId, search]);

  const checkedInPlayerIds = useMemo(() => {
    return new Set(checkedInRows.map((row) => row.player_id));
  }, [checkedInRows]);

  const handleCheckIn = async (playerId: number) => {
    const teamId = Number(selectedTeamId);
    if (!teamId) return;

    try {
      setSavingPlayerId(playerId);
      setErrorMessage('');

      const { error } = await supabase.from('match_check_ins').insert({
        match_id: matchId,
        team_id: teamId,
        player_id: playerId,
        status: 'approved',
        method: 'manual',
      });

      if (error) {
        throw new Error(error.message);
      }

      await loadCheckedIns();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to register check-in');
    } finally {
      setSavingPlayerId(null);
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography>Loading check-in...</Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={3}>
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Check-In</Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              select
              label="Team"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              fullWidth
            >
              {teamOptions.map((team) => (
                <MenuItem key={team.id} value={team.id}>
                  {team.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Search player"
              placeholder="Name or player ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              fullWidth
            />
          </Stack>

          {players.length === 0 ? (
            <Typography color="text.secondary">
              No players found for this team.
            </Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Player</TableCell>
                  <TableCell>Player ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {players.map((player) => {
                  const alreadyCheckedIn = checkedInPlayerIds.has(player.id);

                  return (
                    <TableRow key={player.id}>
                      <TableCell>{getPlayerFullName(player)}</TableCell>
                      <TableCell>{player.id}</TableCell>
                      <TableCell>
                        {alreadyCheckedIn ? 'Checked in' : 'Pending'}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          variant="contained"
                          size="small"
                          disabled={alreadyCheckedIn || savingPlayerId === player.id}
                          onClick={() => handleCheckIn(player.id)}
                        >
                          {alreadyCheckedIn ? 'Checked In' : 'Check In'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Checked-In Players</Typography>

          {checkedInRows.length === 0 ? (
            <Typography color="text.secondary">
              No players have checked in yet.
            </Typography>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Player</TableCell>
                  <TableCell>Player ID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Checked In At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {checkedInRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      {row.player ? getPlayerFullName(row.player) : '-'}
                    </TableCell>
                    <TableCell>{row.player_id}</TableCell>
                    <TableCell>{row.status ?? '-'}</TableCell>
                    <TableCell>{row.method ?? '-'}</TableCell>
                    <TableCell>{formatDateTime(row.checked_in_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}