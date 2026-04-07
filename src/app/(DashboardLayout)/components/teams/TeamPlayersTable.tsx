'use client';

import {
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import type { TeamPlayerRow } from '@/services/teamPlayers/getTeamPlayers';

type Props = {
  rows: TeamPlayerRow[];
  onRemove: (row: TeamPlayerRow) => void;
};

export default function TeamPlayersTable({ rows, onRemove }: Props) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Player</TableCell>
            <TableCell>Key</TableCell>
            <TableCell>Jersey #</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell>{row.player_name ?? `#${row.player_id}`}</TableCell>
              <TableCell>{row.player_key ?? '-'}</TableCell>
              <TableCell>{row.jersey_number ?? '-'}</TableCell>
              <TableCell>{row.player_email ?? '-'}</TableCell>
              <TableCell>{row.player_phone ?? '-'}</TableCell>
              <TableCell>
                <Chip
                  label={row.is_active ? 'Active' : 'Inactive'}
                  size="small"
                  color={row.is_active ? 'success' : 'default'}
                />
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => onRemove(row)}
                  >
                    Remove
                  </Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}