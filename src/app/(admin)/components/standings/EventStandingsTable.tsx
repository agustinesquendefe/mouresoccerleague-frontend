'use client';

import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import type { StandingRow } from '@/services/standings/getEventStandings';

type Props = {
  standings: StandingRow[];
};

export default function EventStandingsTable({ standings }: Props) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>#</TableCell>
            <TableCell>Team</TableCell>
            <TableCell>PJ</TableCell>
            <TableCell>PG</TableCell>
            <TableCell>PE</TableCell>
            <TableCell>PP</TableCell>
            <TableCell>GF</TableCell>
            <TableCell>GC</TableCell>
            <TableCell>DG</TableCell>
            <TableCell>PTS</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {standings.map((row, index) => (
            <TableRow key={row.team_id} hover>
              <TableCell>{index + 1}</TableCell>
              <TableCell>{row.team_name}</TableCell>
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