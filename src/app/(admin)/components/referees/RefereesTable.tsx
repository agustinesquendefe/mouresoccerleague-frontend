'use client';

import Link from 'next/link';
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
  Typography,
} from '@mui/material';
import type { Referee } from '@/models/referee';
import { getRefereeFullName } from '@/models/referee';

type RefereesTableProps = {
  referees: Referee[];
  onEdit: (referee: Referee) => void;
  onDelete: (referee: Referee) => void;
};

function formatDate(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString();
}

export default function RefereesTable({
  referees,
  onEdit,
  onDelete,
}: RefereesTableProps) {
  if (!referees.length) {
    return (
      <Paper sx={{ p: 4 }}>
        <Typography variant="h6" fontWeight={600}>
          No referees found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          There are no referees to display yet.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Full Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Last Updated</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {referees.map((referee) => (
            <TableRow key={referee.id} hover>
              <TableCell>{referee.id}</TableCell>

              <TableCell>
                <Link
                  href={`/referees/${referee.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    {getRefereeFullName(referee)}
                  </Typography>
                </Link>
              </TableCell>

              <TableCell>{referee.email ?? '-'}</TableCell>
              <TableCell>{referee.phone ?? '-'}</TableCell>

              <TableCell>
                <Chip
                  label={referee.status ?? 'active'}
                  size="small"
                  color={referee.status === 'inactive' ? 'default' : 'primary'}
                />
              </TableCell>

              <TableCell>{formatDate(referee.updated_at)}</TableCell>

              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button
                    component={Link}
                    href={`/referees/${referee.id}`}
                    variant="outlined"
                    size="small"
                  >
                    View
                  </Button>

                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => onEdit(referee)}
                  >
                    Edit
                  </Button>

                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => {
                      const confirmed = window.confirm(
                        `Delete referee "${getRefereeFullName(referee)}"?`
                      );
                      if (!confirmed) return;
                      onDelete(referee);
                    }}
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