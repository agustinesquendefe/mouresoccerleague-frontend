'use client';

import {
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { Match } from '@/models/match';
import type { Field } from '@/models/field';

type Props = {
  matches: Match[];
  teamMap: Record<number, string>;
  fields: Field[];
  onEdit: (match: Match) => void;
  groupByDate?: boolean;
};

export default function GroupedMatchesTable({
  matches,
  teamMap,
  fields,
  onEdit,
  groupByDate = true,
}: Props) {
  const fieldMap = fields.reduce<Record<number, string>>((acc, field, index) => {
    acc[field.id] = `${field.name} (#${index + 1})`;
    return acc;
  }, {});

  const grouped = matches.reduce<Record<string, Match[]>>((acc, match) => {
    const key = groupByDate ? match.date ?? 'No Date' : 'selected-date';

    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push(match);
    return acc;
  }, {});

  const sortedGroups = Object.keys(grouped).sort((a, b) => {
    if (a === 'No Date') return 1;
    if (b === 'No Date') return -1;
    if (a === 'selected-date') return -1;
    if (b === 'selected-date') return 1;
    return a.localeCompare(b);
  });

  return (
    <Stack spacing={3}>
      {sortedGroups.map((groupKey, index) => (
        <Paper key={groupKey} sx={{ p: 2 }}>
          <Stack spacing={2}>
            {groupByDate && (
              <Typography variant="h6" fontWeight={700}>
                Round {index + 1} — {groupKey}
              </Typography>
            )}

            {grouped[groupKey].map((match) => (
              <Paper key={match.id} variant="outlined" sx={{ p: 2 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={2}
                  flexWrap="wrap"
                >
                  <Stack spacing={0.5}>
                    <Typography fontWeight={600}>
                      {teamMap[match.team1_id] ?? `#${match.team1_id}`} vs{' '}
                      {teamMap[match.team2_id] ?? `#${match.team2_id}`}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      Score: {match.score1 ?? '-'} : {match.score2 ?? '-'}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      Date: {match.date ?? '-'}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      Field:{' '}
                      {match.field_id
                        ? fieldMap[match.field_id] ?? `#${match.field_id}`
                        : '-'}
                    </Typography>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={match.status ?? 'scheduled'} size="small" />
                    <Button variant="outlined" size="small" onClick={() => onEdit(match)}>
                      Edit
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}