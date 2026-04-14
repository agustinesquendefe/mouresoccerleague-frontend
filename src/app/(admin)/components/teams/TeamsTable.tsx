'use client';

import Link from 'next/link';
import {
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Typography,
  Box,
} from '@mui/material';
import type { Team } from '@/models/team';

type TeamsTableProps = {
  teams: Team[];
  onEdit: (team: Team) => void;
  onDelete: (team: Team) => void;
};

function formatDate(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString();
}

export default function TeamsTable({
  teams,
  onEdit,
  onDelete,
}: TeamsTableProps) {
  if (!teams.length) {
    return (
      <Paper sx={{ p: 4 }}>
        <Typography variant="h6" fontWeight={600}>
          No teams found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          There are no teams to display yet.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>
              ID
            </TableCell>
            <TableCell>
              Key
            </TableCell>
            <TableCell>
              Name
            </TableCell>
            <TableCell>
              Code
            </TableCell>
            <TableCell>
              Type
            </TableCell>
            <TableCell>
              Players
            </TableCell>
            <TableCell>
              Last Updated
            </TableCell>
            <TableCell align="right">
              Actions
            </TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {teams.map((team) => (
            <TableRow
              key={team.id}
              hover
              sx={{
                '&:last-child td, &:last-child th': { borderBottom: 0 },
              }}
            >
              <TableCell>{team.id}</TableCell>

              <TableCell>{team.key || '-'}</TableCell>

              <TableCell>
                <Link
                  href={`/admin/teams/${team.id}`}
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                    color='primary'
                  >
                    {team.name}
                  </Typography>
                </Link>
              </TableCell>

              <TableCell>{team.code ?? '-'}</TableCell>

              <TableCell>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {team.club ? <Chip label="Club" size="small" /> : null}
                  {team.national ? (
                    <Chip label="National" size="small" color="primary" />
                  ) : null}
                  {!team.club && !team.national ? (
                    <Typography variant="body2" color="text.secondary">
                      -
                    </Typography>
                  ) : null}
                </Stack>
              </TableCell>

              <TableCell>
                {'player_count' in team && typeof team.player_count === 'number'
                  ? team.player_count
                  : '-'}
              </TableCell>

              <TableCell>
                {formatDate(
                  'updated_at' in team ? (team.updated_at as string | null | undefined) : null
                )}
              </TableCell>

              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button
                    component={Link}
                    href={`/admin/teams/${team.id}`}
                    variant="contained"
                    size="small"
                    color='success'
                  >
                    View
                  </Button>

                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => onEdit(team)}
                  >
                    Edit
                  </Button>

                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => onDelete(team)}
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