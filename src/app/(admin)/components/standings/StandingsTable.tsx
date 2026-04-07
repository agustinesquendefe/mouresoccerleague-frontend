'use client';

import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { StandingRow } from '@/models/standing';

type Props = {
  rows: StandingRow[];
};

export default function StandingsTable({ rows }: Props) {
  if (!rows.length) {
    return (
      <Paper sx={{ p: 4 }}>
        <Typography variant="h6" fontWeight={600}>
          No standings found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Select an event or generate standings first.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Pos</TableCell>
            <TableCell>Team</TableCell>
            <TableCell>P</TableCell>
            <TableCell>W</TableCell>
            <TableCell>D</TableCell>
            <TableCell>L</TableCell>
            <TableCell>GF</TableCell>
            <TableCell>GA</TableCell>
            <TableCell>GD</TableCell>
            <TableCell>Pts</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.id ?? `${row.event_id}-${row.team_id}`}>
              <TableCell>{row.position ?? index + 1}</TableCell>
              <TableCell>{row.team_name ?? `#${row.team_id}`}</TableCell>
              <TableCell>{row.played ?? 0}</TableCell>
              <TableCell>{row.wins ?? 0}</TableCell>
              <TableCell>{row.draws ?? 0}</TableCell>
              <TableCell>{row.losses ?? 0}</TableCell>
              <TableCell>{row.goals_for ?? 0}</TableCell>
              <TableCell>{row.goals_against ?? 0}</TableCell>
              <TableCell>{row.goal_difference ?? 0}</TableCell>
              <TableCell>{row.points ?? 0}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}