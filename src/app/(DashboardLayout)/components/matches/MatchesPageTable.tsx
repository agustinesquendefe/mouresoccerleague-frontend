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
import type { MatchListRow } from '@/services/matches/getAllMatches';
import Link from 'next/link';

type Props = {
  matches: MatchListRow[];
  onEdit: (match: MatchListRow) => void;
};

export default function MatchesPageTable({ matches, onEdit }: Props) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Event</TableCell>
            <TableCell>Stage</TableCell>
            <TableCell>Round</TableCell>
            <TableCell>Match</TableCell>
            <TableCell>Score</TableCell>
            <TableCell>Field</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {matches.map((match) => (
            <TableRow key={match.id} hover>
              <TableCell>{match.date ?? '-'}</TableCell>
              <TableCell>{match.event_name ?? '-'}</TableCell>
              <TableCell>
                <Chip label={match.stage_type ?? '-'} size="small" />
              </TableCell>
              <TableCell>
                {match.stage_type === 'league'
                  ? match.round_number
                    ? `Round ${match.round_number}`
                    : '-'
                  : match.bracket_round ?? '-'}
              </TableCell>
              <TableCell>
                {match.team1_name ?? `#${match.team1_id}`} vs{' '}
                {match.team2_name ?? `#${match.team2_id}`}
              </TableCell>
              <TableCell>
                {match.score1 ?? '-'} : {match.score2 ?? '-'}
                {match.penalty_score1 !== null && match.penalty_score2 !== null && (
                  <> ({match.penalty_score1} : {match.penalty_score2} pens)</>
                )}
              </TableCell>
              <TableCell>{match.field_name ?? '-'}</TableCell>
              <TableCell>
                <Chip label={match.status ?? 'scheduled'} size="small" />
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Link href={`/matches/${match.id}`} passHref legacyBehavior>
                    <Button
                      variant="contained"
                      size="small"
                      color='success'
                    >
                      View
                    </Button>
                  </Link>
                  <Button size="small" variant="outlined" onClick={() => onEdit(match)}>
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