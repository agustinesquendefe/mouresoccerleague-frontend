'use client';

import {
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import type { Match } from '@/models/match';

type TeamMap = Record<number, string>;

type Props = {
  matches: Match[];
  teamMap: TeamMap;
};

export default function MatchesTable({ matches, teamMap }: Props) {
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
              <TableCell>{match.field_number ?? '-'}</TableCell>
              <TableCell>
                <Chip label={match.status ?? 'scheduled'} size="small" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}