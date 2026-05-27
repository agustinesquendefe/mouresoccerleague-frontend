'use client';

import { useState } from 'react';
import { Button } from '@mui/material';
import { supabase } from '@/lib/supabaseClient';
import { escapeHtml, printHtml } from '@/utils/printHtml';
import { getCoachFullName, type Coach } from '@/models/coach';
import { getTeamPlayers, type TeamPlayerRow } from '@/services/teamPlayers/getTeamPlayers';
import { getAppSettings } from '@/services/settings/settings.service';

type TeamCoachRow = {
  id: number;
  role: string | null;
  coach: Coach | null;
};

type Props = {
  teamId: number;
  teamName: string;
  teamCode?: string | null;
};

function formatRole(value: string | null) {
  if (!value) return '-';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildCoachesTable(rows: TeamCoachRow[]) {
  if (rows.length === 0) {
    return '<p>No coaches assigned.</p>';
  }

  return `
    <table>
      <thead>
        <tr>
          <th>Coach</th>
          <th>Role</th>
          <th>Email</th>
          <th>Phone</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td>${escapeHtml(row.coach ? getCoachFullName(row.coach) : '-')}</td>
            <td>${escapeHtml(formatRole(row.role))}</td>
            <td>${escapeHtml(row.coach?.email ?? '-')}</td>
            <td>${escapeHtml(row.coach?.phone ?? '-')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function buildPlayersTable(rows: TeamPlayerRow[]) {
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

export default function PrintTeamInfoButton({ teamId, teamName, teamCode }: Props) {
  const [loading, setLoading] = useState(false);

  const handlePrint = async () => {
    try {
      setLoading(true);

      const [players, coachesResponse, appSettings] = await Promise.all([
        getTeamPlayers(teamId),
        supabase
          .from('team_coaches')
          .select(`
            id,
            role,
            coach:coaches (
              id,
              first_name,
              last_name,
              email,
              phone,
              status,
              created_at,
              updated_at
            )
          `)
          .eq('team_id', teamId)
          .order('id', { ascending: true }),
        getAppSettings(),
      ]);

      if (coachesResponse.error) {
        throw new Error(coachesResponse.error.message);
      }

      const coaches = ((coachesResponse.data ?? []) as any[]).map((row) => ({
        ...row,
        coach: Array.isArray(row.coach) ? row.coach[0] ?? null : row.coach ?? null,
      })) as TeamCoachRow[];

      printHtml({
        title: teamName,
        company: appSettings,
        subtitle: teamCode ? `Code: ${teamCode}` : `Team ID: ${teamId}`,
        body: `
          <section class="section">
            <h2>Coaches</h2>
            ${buildCoachesTable(coaches)}
          </section>
          <section class="section">
            <h2>Players</h2>
            ${buildPlayersTable(players)}
          </section>
        `,
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Failed to print team information');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outlined" onClick={handlePrint} disabled={loading}>
      {loading ? 'Preparing...' : 'Print Team Info'}
    </Button>
  );
}
