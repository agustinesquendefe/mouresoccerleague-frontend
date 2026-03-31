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
  Chip,
  Stack,
} from '@mui/material';
import BlankCard from '@/app/(DashboardLayout)/components/shared/BlankCard';
import { getUpcomingMatches, type UpcomingMatchRow } from '@/services/dashboard';

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function UpcomingMatches() {
  const [rows, setRows] = useState<UpcomingMatchRow[]>([]);

  useEffect(() => {
    getUpcomingMatches().then(setRows).catch(console.error);
  }, []);

  return (
    <BlankCard>
      <CardContent>
        <Typography variant="h5" mb={2}>
          Upcoming Matches
        </Typography>

        {rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No upcoming matches found.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Match</TableCell>
                <TableCell>Round</TableCell>
                <TableCell>Field</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatDate(row.date)}</TableCell>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {row.team1_name} vs {row.team2_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Chip
                        size="small"
                        color="info"
                        variant="outlined"
                        label={
                          row.round_number !== null
                            ? `Round ${row.round_number}`
                            : 'TBD'
                        }
                      />
                    </Stack>
                  </TableCell>
                  <TableCell>{row.field_name ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </BlankCard>
  );
}
