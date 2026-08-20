'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import AddPlayerToTeamDialog from './AddPlayerToTeamDialog';
import TeamPlayersTable from './TeamPlayersTable';
import {
  getTeamPlayers,
  removePlayerFromTeam,
  type TeamPlayerRow,
} from '@/services/teamPlayers';
import { getAppSettings } from '@/services/settings/settings.service';
import { escapeHtml, printHtml } from '@/utils/printHtml';

type Props = {
  teamId: number;
  eventId?: number | null;
  teamName?: string;
  teamLogoUrl?: string | null;
  onRosterChanged?: () => Promise<void> | void;
};

function buildPlayersPrintTable(rows: TeamPlayerRow[]) {
  if (rows.length === 0) {
    return '<p>No players assigned.</p>';
  }

  return `
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Player</th>
          <th>Key</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td>${escapeHtml(row.jersey_number ?? '-')}</td>
            <td>${escapeHtml(row.player_name ?? `#${row.player_id}`)}</td>
            <td>${escapeHtml(row.player_key ?? '-')}</td>
            <td>${escapeHtml(row.player_email ?? '-')}</td>
            <td>${escapeHtml(row.player_phone ?? '-')}</td>
            <td>${escapeHtml(row.is_active ? 'Active' : 'Inactive')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

export default function TeamPlayersSection({
  teamId,
  eventId = null,
  teamName,
  teamLogoUrl = null,
  onRosterChanged,
}: Props) {
  const [rows, setRows] = useState<TeamPlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const loadRows = async () => {
    try {
      setLoading(true);
      const data = await getTeamPlayers(teamId, eventId);
      setRows(data);
    } catch (error) {
      setToast({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to load team players',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, [teamId, eventId]);

  const handleRemove = async (row: TeamPlayerRow) => {
    const confirmed = window.confirm(
      `Remove "${row.player_name ?? 'this player'}" from the team?`
    );

    if (!confirmed) return;

    try {
      await removePlayerFromTeam(row.id);
      await loadRows();
      await onRosterChanged?.();

      setToast({
        open: true,
        message: 'Player removed from team successfully',
        severity: 'success',
      });
    } catch (error) {
      setToast({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to remove player',
        severity: 'error',
      });
    }
  };

  const handlePrint = async () => {
    if (rows.length === 0) {
      setToast({
        open: true,
        message: 'No players assigned to this team yet. Add players before printing the roster.',
        severity: 'error',
      });
      return;
    }

    try {
      setPrinting(true);
      const appSettings = await getAppSettings();
      const title = teamName ?? `Team #${teamId}`;

      printHtml({
        title: `${title} Roster`,
        company: appSettings,
        subtitle: eventId ? `Event roster | ${rows.length} players` : `${rows.length} players`,
        body: `
          ${teamLogoUrl ? `
            <section class="section">
              <img src="${escapeHtml(teamLogoUrl)}" alt="${escapeHtml(title)} logo" style="height:72px;max-width:120px;object-fit:contain;" />
            </section>
          ` : ''}
          <section class="section">
            <h2>Players</h2>
            ${buildPlayersPrintTable(rows)}
          </section>
        `,
      });
    } catch (error) {
      setToast({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to print roster',
        severity: 'error',
      });
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">{eventId ? 'Event Roster' : 'Players'} ({rows.length})</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            disabled={loading || printing || rows.length === 0}
          >
            {printing ? 'Preparing...' : 'Print'}
          </Button>
          <Button variant="contained" onClick={() => setDialogOpen(true)}>
            Add Players
          </Button>
        </Stack>
      </Stack>

      {loading && <Typography>Loading players...</Typography>}

      {!loading && rows.length === 0 && (
        <Alert severity="info">No players assigned to this team yet.</Alert>
      )}

      {!loading && rows.length > 0 && (
        <TeamPlayersTable rows={rows} onRemove={handleRemove} />
      )}

      <AddPlayerToTeamDialog
        open={dialogOpen}
        teamId={teamId}
        eventId={eventId}
        onClose={() => setDialogOpen(false)}
        onAdded={async () => {
          await loadRows();
          await onRosterChanged?.();
        }}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          variant="filled"
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
