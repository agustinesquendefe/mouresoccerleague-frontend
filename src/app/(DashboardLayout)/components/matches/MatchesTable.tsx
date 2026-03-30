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
import type { Match } from '@/models/match';
import type { Field } from '@/models/field';

type TeamMap = Record<number, string>;

type Props = {
  matches: Match[];
  teamMap: TeamMap;
  fields: Field[];
  onEdit: (match: Match) => void;
};

export default function MatchesTable({
  matches,
  teamMap,
  fields,
  onEdit,
}: Props) {
  const fieldMap = fields.reduce<Record<number, string>>((acc, field, index) => {
    acc[field.id] = `${field.name} (#${index + 1})`;
    return acc;
  }, {});

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Team 1</TableCell>
            <TableCell>Team 2</TableCell>
            <TableCell>Score</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Field</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {matches.map((match) => (
            <TableRow key={match.id} hover>
              <TableCell>{match.id}</TableCell>
              <TableCell>{teamMap[match.team1_id] ?? `#${match.team1_id}`}</TableCell>
              <TableCell>{teamMap[match.team2_id] ?? `#${match.team2_id}`}</TableCell>
              <TableCell>
                {match.score1 ?? '-'} : {match.score2 ?? '-'}
              </TableCell>
              <TableCell>{match.date ?? '-'}</TableCell>
              <TableCell>
                {match.field_id ? fieldMap[match.field_id] ?? `#${match.field_id}` : '-'}
              </TableCell>
              <TableCell>
                <Chip label={match.status ?? 'scheduled'} size="small" />
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button variant="outlined" size="small" onClick={() => onEdit(match)}>
                    Edit
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