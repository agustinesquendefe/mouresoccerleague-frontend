'use client';

import { useEffect, useMemo, useState } from 'react';
import PrintIcon from '@mui/icons-material/Print';
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type { AppSettings } from '@/models/appSettings';
import {
  getEventPlayerRecords,
  type EventPlayerMatchRecord,
  type EventTeamPlayerRecords,
} from '@/services/eventPlayerRecords';
import { escapeHtml, printHtml } from '@/utils/printHtml';

type Props = {
  eventId: number;
  eventName: string;
  printCompany?: Partial<AppSettings> | null;
  refreshKey?: number;
};

function getMatchResultLabel(match: EventPlayerMatchRecord) {
  const status = String(match.status ?? '').toLowerCase();

  if (status === 'cancelled') {
    return `Cancelled vs ${match.opponentName}`;
  }

  if (status !== 'played') {
    return `vs ${match.opponentName}`;
  }

  if (match.scoreFor == null || match.scoreAgainst == null) {
    return `Played vs ${match.opponentName}`;
  }

  const outcome = match.scoreFor > match.scoreAgainst
    ? 'W'
    : match.scoreFor < match.scoreAgainst
      ? 'L'
      : 'D';
  const penalties = match.penaltyScoreFor != null && match.penaltyScoreAgainst != null
    ? ` (pens ${match.penaltyScoreFor}-${match.penaltyScoreAgainst})`
    : '';

  return `${outcome} ${match.scoreFor}-${match.scoreAgainst}${penalties} vs ${match.opponentName}`;
}

function getRoundLabel(match: EventPlayerMatchRecord) {
  return match.roundNumber == null ? '-' : `Round ${match.roundNumber}`;
}

function buildPlayerHistory(matches: EventPlayerMatchRecord[]) {
  if (matches.length === 0) return '-';

  return matches
    .map((match) => `${escapeHtml(getRoundLabel(match))}: ${escapeHtml(getMatchResultLabel(match))}`)
    .join('<br />');
}

function buildPrintTeamSection(team: EventTeamPlayerRecords) {
  return `
    <section class="section">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        ${team.teamLogoUrl ? `<img src="${escapeHtml(team.teamLogoUrl)}" alt="${escapeHtml(team.teamName)} logo" style="height:44px;max-width:70px;object-fit:contain;" />` : ''}
        <h2 style="margin:0;">${escapeHtml(team.teamName)}</h2>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Document</th>
            <th>Games Played</th>
            <th>Player Match History</th>
          </tr>
        </thead>
        <tbody>
          ${team.players.map((player) => `
            <tr>
              <td>${escapeHtml(player.jerseyNumber ?? '-')}</td>
              <td>${escapeHtml(player.playerName)}</td>
              <td>${escapeHtml(player.documentId ?? '-')}</td>
              <td>${escapeHtml(player.appearancesCount)}</td>
              <td>${buildPlayerHistory(player.playedMatches)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h2>Team Matches</h2>
      ${team.matches.length === 0 ? '<p>No matches generated yet.</p>' : `
        <table>
          <thead>
            <tr>
              <th>Round</th>
              <th>Match / Result</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${team.matches.map((match) => `
              <tr>
                <td>${escapeHtml(getRoundLabel(match))}</td>
                <td>${escapeHtml(getMatchResultLabel(match))}</td>
                <td>${escapeHtml(match.date ?? '-')}</td>
                <td>${escapeHtml(match.status ?? 'scheduled')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </section>
  `;
}

export default function EventPlayerRecordsSection({
  eventId,
  eventName,
  printCompany,
  refreshKey = 0,
}: Props) {
  const [teams, setTeams] = useState<EventTeamPlayerRecords[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedRound, setSelectedRound] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState('');

  useEffect(() => {
    let active = true;

    setLoading(true);
    getEventPlayerRecords(eventId)
      .then((data) => {
        if (!active) return;
        setTeams(data);
        setErrorMessage(null);
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load player event records');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [eventId, refreshKey]);

  useEffect(() => {
    setSelectedRound('');
    setSelectedMatchId('');
  }, [eventId]);

  const eventMatches = useMemo(() => {
    const uniqueMatches = new Map<number, {
      match: EventPlayerMatchRecord;
      team1Id: number;
      team1Name: string;
      team2Id: number;
      team2Name: string;
    }>();

    teams.forEach((team) => {
      team.matches.forEach((match) => {
        if (uniqueMatches.has(match.matchId)) return;

        uniqueMatches.set(match.matchId, {
          match,
          team1Id: team.teamId,
          team1Name: team.teamName,
          team2Id: match.opponentId,
          team2Name: match.opponentName,
        });
      });
    });

    return Array.from(uniqueMatches.values());
  }, [teams]);
  const roundOptions = useMemo(() => {
    return Array.from(new Set(eventMatches.map(({ match }) => match.roundNumber)))
      .sort((left, right) => {
        if (left == null) return 1;
        if (right == null) return -1;
        return left - right;
      });
  }, [eventMatches]);
  const matchesForRound = useMemo(() => {
    if (!selectedRound) return [];

    return eventMatches.filter(({ match }) => (
      selectedRound === 'none'
        ? match.roundNumber == null
        : String(match.roundNumber) === selectedRound
    ));
  }, [eventMatches, selectedRound]);
  const selectedMatch = useMemo(
    () => eventMatches.find(({ match }) => String(match.matchId) === selectedMatchId) ?? null,
    [eventMatches, selectedMatchId]
  );
  const selectedTeams = useMemo(() => {
    if (!selectedMatch) return [];

    return teams
      .filter((team) => team.teamId === selectedMatch.team1Id || team.teamId === selectedMatch.team2Id)
      .map((team) => ({
        ...team,
        matches: team.matches.filter((match) => match.matchId === selectedMatch.match.matchId),
      }));
  }, [selectedMatch, teams]);
  const emptySelectedTeams = selectedTeams.filter((team) => team.players.length === 0);
  const printDisabledMessage = !selectedMatch
    ? 'Select a round and match before printing.'
    : selectedTeams.length < 2
      ? 'Both teams must belong to this event before printing.'
      : emptySelectedTeams.length > 0
        ? `Assign players to ${emptySelectedTeams.map((team) => team.teamName).join(', ')} before printing.`
        : null;
  const canPrint = !loading && !errorMessage && !printDisabledMessage;

  const handlePrint = () => {
    if (!canPrint) return;

    printHtml({
      title: `${eventName} - ${selectedMatch?.team1Name} vs ${selectedMatch?.team2Name}`,
      subtitle: `${selectedMatch ? getRoundLabel(selectedMatch.match) : ''} | Games played are counted from approved check-ins in matches marked as played.`,
      company: printCompany,
      body: selectedTeams.map(buildPrintTeamSection).join(''),
    });
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}>
        <Stack spacing={0.25}>
          <Typography variant="h6">Player Event Records</Typography>
          <Typography variant="body2" color="text.secondary">
            Actual games played are separate from the four unpaid appearances allowed by the event payment policy.
          </Typography>
        </Stack>
        <Tooltip title={printDisabledMessage ?? ''} disableHoverListener={!printDisabledMessage}>
          <span>
            <Button
              variant="outlined"
              startIcon={loading ? <CircularProgress size={16} /> : <PrintIcon />}
              onClick={handlePrint}
              disabled={!canPrint}
            >
              Print Match Records
            </Button>
          </span>
        </Tooltip>
      </Stack>

      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
      {loading && (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={20} />
          <Typography>Loading player records...</Typography>
        </Stack>
      )}

      {!loading && !errorMessage && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            select
            fullWidth
            size="small"
            label="Round"
            value={selectedRound}
            onChange={(event) => {
              setSelectedRound(event.target.value);
              setSelectedMatchId('');
            }}
            disabled={roundOptions.length === 0}
          >
            {roundOptions.map((round) => (
              <MenuItem key={round ?? 'none'} value={round == null ? 'none' : String(round)}>
                {round == null ? 'No Round' : `Round ${round}`}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            fullWidth
            size="small"
            label="Match"
            value={selectedMatchId}
            onChange={(event) => setSelectedMatchId(event.target.value)}
            disabled={!selectedRound || matchesForRound.length === 0}
          >
            {matchesForRound.map(({ match, team1Name, team2Name }) => (
              <MenuItem key={match.matchId} value={String(match.matchId)}>
                {team1Name} vs {team2Name}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      )}

      {!loading && !errorMessage && eventMatches.length === 0 && (
        <Alert severity="info">
          Generate matches for this event before reviewing player records.
        </Alert>
      )}

      {!loading && !errorMessage && eventMatches.length > 0 && !selectedMatch && (
        <Alert severity="info">Select a round and then a match to view both team rosters and player records.</Alert>
      )}

      {!loading && !errorMessage && selectedMatch && (
        <Alert severity={emptySelectedTeams.length > 0 ? 'warning' : 'success'}>
          {getRoundLabel(selectedMatch.match)} · {selectedMatch.team1Name} {getMatchResultLabel(selectedMatch.match)}
        </Alert>
      )}

      {!loading && !errorMessage && selectedTeams.map((team) => (
        <Paper key={team.teamId} variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
              <Typography variant="subtitle1" fontWeight={700}>{team.teamName}</Typography>
              <Chip size="small" label={`${team.players.length} players`} />
            </Stack>

            {team.players.length > 0 && (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Player</TableCell>
                      <TableCell>Document</TableCell>
                      <TableCell align="center">Games Played</TableCell>
                      <TableCell>Match History</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {team.players.map((player) => (
                      <TableRow key={player.rosterId}>
                        <TableCell>{player.jerseyNumber ?? '-'}</TableCell>
                        <TableCell>{player.playerName}</TableCell>
                        <TableCell>{player.documentId ?? '-'}</TableCell>
                        <TableCell align="center">{player.appearancesCount}</TableCell>
                        <TableCell>
                          {player.playedMatches.length === 0
                            ? '-'
                            : player.playedMatches.map((match) => `${getRoundLabel(match)}: ${getMatchResultLabel(match)}`).join(' · ')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
