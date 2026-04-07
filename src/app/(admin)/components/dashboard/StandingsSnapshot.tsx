'use client';

import { useEffect, useState } from 'react';
import {
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import BlankCard from '@/app/(admin)/components/shared/BlankCard';
import { getStandingsSnapshot } from '@/services/dashboard';
import type { StandingRow } from '@/services/standings/getEventStandings';

export default function StandingsSnapshot() {
  const [rows, setRows] = useState<StandingRow[]>([]);

  useEffect(() => {
    getStandingsSnapshot().then(setRows).catch(console.error);
  }, []);

  return (
    <BlankCard>
      <CardContent>
        <Typography variant="h5" mb={2}>
          Standings Snapshot
        </Typography>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Team</TableCell>
              <TableCell>PJ</TableCell>
              <TableCell>DG</TableCell>
              <TableCell>PTS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={row.team_id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{row.team_name}</TableCell>
                <TableCell>{row.played}</TableCell>
                <TableCell>{row.goal_difference}</TableCell>
                <TableCell>{row.points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </BlankCard>
  );
}