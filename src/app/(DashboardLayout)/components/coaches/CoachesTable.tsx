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
import type { Coach } from '@/models/coach';
import { getCoachFullName } from '@/models/coach';

type CoachesTableProps = {
  coaches: Coach[];
  onEdit: (coach: Coach) => void;
  onDelete: (coach: Coach) => void;
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

export default function CoachesTable({
  coaches,
  onEdit,
  onDelete,
}: CoachesTableProps) {
  if (!coaches.length) {
    return (
      <Paper sx={{ p: 4 }}>
        <Typography variant="h6" fontWeight={600}>
          No coaches found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          There are no coaches to display yet.
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
          {coaches.map((coach) => (
            <TableRow key={coach.id} hover>
              <TableCell>{coach.id}</TableCell>

              <TableCell>
                <Link
                  href={`/coaches/${coach.id}`}
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
                    {getCoachFullName(coach)}
                  </Typography>
                </Link>
              </TableCell>

              <TableCell>{coach.email ?? '-'}</TableCell>
              <TableCell>{coach.phone ?? '-'}</TableCell>

              <TableCell>
                <Chip
                  label={coach.status ?? 'active'}
                  size="small"
                  color={coach.status === 'inactive' ? 'default' : 'primary'}
                />
              </TableCell>

              <TableCell>{formatDate(coach.updated_at)}</TableCell>

              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button
                    component={Link}
                    href={`/coaches/${coach.id}`}
                    variant="outlined"
                    size="small"
                  >
                    View
                  </Button>

                  <Button variant="outlined" size="small" onClick={() => onEdit(coach)}>
                    Edit
                  </Button>

                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => {
                      const confirmed = window.confirm(
                        `Delete coach "${getCoachFullName(coach)}"?`
                      );
                      if (!confirmed) return;
                      onDelete(coach);
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