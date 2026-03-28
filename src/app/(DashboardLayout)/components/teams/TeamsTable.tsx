'use client';

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
} from '@mui/material';
import type { Team } from '@/models/team';

type TeamsTableProps = {
  teams: Team[];
  onEdit: (team: Team) => void;
  onDelete: (team: Team) => void;
};

export default function TeamsTable({
  teams,
  onEdit,
  onDelete,
}: TeamsTableProps) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Key</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Code</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Players</TableCell>
            <TableCell>Last Updated</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {teams.map((team) => (
            <TableRow key={team.id} hover>
              <TableCell>{team.id}</TableCell>
              <TableCell>{team.key}</TableCell>
              <TableCell>{team.name}</TableCell>
              <TableCell>{team.code ?? '-'}</TableCell>
              
              <TableCell>
                <Stack direction="row" spacing={1}>
                  {team.club && <Chip label="Club" size="small" />}
                  {team.national && <Chip label="National" size="small" color="primary" />}
                </Stack>
              </TableCell>
              <TableCell>{team.code ?? '-'}</TableCell>
              <TableCell>{team.code ?? '-'}</TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button variant="outlined" size="small" onClick={() => onEdit(team)}>
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