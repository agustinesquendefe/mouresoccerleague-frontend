"use client";

import { useEffect, useState } from 'react';
import {
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Card,
  Box
} from '@mui/material';
import { getStandingsSnapshot } from '@/services/dashboard/getStandingsSnapshot';
import type { StandingRow } from '@/services/standings/getEventStandings';

export default function StandingsSnapshot() {
  const [rows, setRows] = useState<StandingRow[]>([]);

  useEffect(() => {
    getStandingsSnapshot().then(setRows).catch(console.error);
  }, []);

  return (
    <Card sx={{ mb: 4, borderRadius: 3, boxShadow: 3 }}>
      <CardContent>
        <Typography variant="h5" mb={2} color="primary">
          Tabla de Posiciones
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Equipo</TableCell>
              <TableCell>PJ</TableCell>
              <TableCell>DG</TableCell>
              <TableCell>PTS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, idx) => (
              <TableRow key={row.team_id}>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>{row.team_name}</TableCell>
                <TableCell>{row.played}</TableCell>
                <TableCell>{row.goal_difference}</TableCell>
                <TableCell>{row.points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
