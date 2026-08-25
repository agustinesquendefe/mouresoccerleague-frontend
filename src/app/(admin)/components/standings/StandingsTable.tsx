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
  Chip,
} from '@mui/material';
import type { StandingRow } from '@/services/standings/getEventStandings';

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
            <TableRow key={row.team_id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                {row.team_name}
                {row.is_disqualified && <Chip label="Disqualified" color="error" size="small" sx={{ ml: 1 }} />}
              </TableCell>
              <TableCell>{row.played}</TableCell>
              <TableCell>{row.won}</TableCell>
              <TableCell>{row.drawn}</TableCell>
              <TableCell>{row.lost}</TableCell>
              <TableCell>{row.goals_for}</TableCell>
              <TableCell>{row.goals_against}</TableCell>
              <TableCell>{row.goal_difference}</TableCell>
              <TableCell>{row.points}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
