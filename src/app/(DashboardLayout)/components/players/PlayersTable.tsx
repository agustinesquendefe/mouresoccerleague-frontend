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
import type { Player } from '@/models/player';

type PlayersTableProps = {
  players: Player[];
  onEdit: (player: Player) => void;
  onDelete: (player: Player) => void;
};

export default function PlayersTable({
  players,
  onEdit,
  onDelete,
}: PlayersTableProps) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Key</TableCell>
            <TableCell>Birth Date</TableCell>
            <TableCell>Jersey #</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {players.map((player) => (
            <TableRow key={player.id} hover>
              <TableCell>{player.full_name}</TableCell>
              <TableCell>{player.key}</TableCell>
              <TableCell>{player.birth_date ?? '-'}</TableCell>
              <TableCell>{player.jersey_number ?? '-'}</TableCell>
              <TableCell>{player.phone ?? '-'}</TableCell>
              <TableCell>{player.email ?? '-'}</TableCell>
              <TableCell>
                <Chip
                  label={player.is_active ? 'Active' : 'Inactive'}
                  size="small"
                  color={player.is_active ? 'success' : 'default'}
                />
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button variant="outlined" size="small" onClick={() => onEdit(player)}>
                    Edit
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => onDelete(player)}
                  >
                    Delete
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