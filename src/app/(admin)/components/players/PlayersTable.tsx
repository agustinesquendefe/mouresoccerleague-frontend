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
  TablePagination,
  TableRow,
} from '@mui/material';
import type { Player } from '@/models/player';
import { Typography } from '@mui/system';

type PlayersTableProps = {
  rows: Player[];
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onEdit: (player: Player) => void;
  onDelete: (player: Player) => void;
};

function displayDocumentId(value?: string | null) {
  if (!value) return '-';
  const n = Number(value);
  return Number.isNaN(n) ? value : String(n);
}

function getPlayerFullName(player: Player) {
  return `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim();
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export default function PlayersTable({
  rows,
  count,
  page,
  rowsPerPage,
  onPageChange,
  onEdit,
  onDelete,
}: PlayersTableProps) {
  return (
    <Paper>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Birthday</TableCell>
              <TableCell>Have ID</TableCell>
              <TableCell>Paid</TableCell>
              <TableCell>Signature</TableCell>
              {/* <TableCell>Season</TableCell> */}
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <h2>
                    No players found. Try adjusting your search or filters to find what you're looking for.
                  </h2>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((player) => (
                <TableRow key={player.id} hover>
                <TableCell>{displayDocumentId(player.document_id)}</TableCell>
                <TableCell>{getPlayerFullName(player)}</TableCell>
                <TableCell>{formatDate(player.birth_date)}</TableCell>
                <TableCell>
                  <Chip
                    label={player.we_have_id ? 'Yes' : 'No'}
                    size="small"
                    color={player.we_have_id ? 'primary' : 'default'}
                  />
                </TableCell>
                <TableCell>{player.paid_membership ?? 0}</TableCell>
                <TableCell>{formatDate(player.registered_at)}</TableCell>
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
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={count}
        page={page}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[20]}
      />
    </Paper>
  );
}