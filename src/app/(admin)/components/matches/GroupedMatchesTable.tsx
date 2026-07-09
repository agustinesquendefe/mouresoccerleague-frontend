'use client';

import {
  Button,
  Chip,
  Box,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import type { Match } from '@/models/match';
import type { Field } from '@/models/field';
import { formatTime12Hour } from '@/utils/formatTime';

type Props = {
  matches: Match[];
  teamMap: Record<number, string>;
  fields: Field[];
  onEdit: (match: Match) => void;
  onAddExtraMatch?: (roundNumber: number) => void;
  onDeleteExtraMatch?: (match: Match) => void;
  groupByDate?: boolean;
  groupByRound?: boolean;
  compact?: boolean;
};

export default function GroupedMatchesTable({
  matches,
  teamMap,
  fields,
  onEdit,
  onAddExtraMatch,
  onDeleteExtraMatch,
  groupByDate = true,
  groupByRound = false,
  compact = false,
}: Props) {
  const fieldMap = fields.reduce<Record<number, string>>((acc, field, index) => {
    acc[field.id] = `${field.name} (#${index + 1})`;
    return acc;
  }, {});

  const grouped = matches.reduce<Record<string, Match[]>>((acc, match) => {
    const key = groupByRound
      ? String(match.round_number ?? 'No Round')
      : groupByDate
        ? match.date ?? 'No Date'
        : 'all';

    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push(match);
    return acc;
  }, {});

  const sortedGroups = Object.keys(grouped).sort((a, b) => {
    if (groupByRound) {
      if (a === 'No Round') return 1;
      if (b === 'No Round') return -1;
      return Number(a) - Number(b);
    }

    if (a === 'No Date') return 1;
    if (b === 'No Date') return -1;
    if (a === 'all') return -1;
    if (b === 'all') return 1;
    return a.localeCompare(b);
  });

  const renderMatch = (match: Match) => (
    <Paper key={match.id} variant="outlined" sx={{ p: compact ? 1.25 : 2, width: '100%', minWidth: 0 }}>
      <Stack
        direction={compact ? 'column' : 'row'}
        justifyContent="space-between"
        alignItems={compact ? 'stretch' : 'center'}
        spacing={compact ? 1 : 2}
        flexWrap="wrap"
        sx={{ width: '100%', minWidth: 0 }}
      >
        <Stack spacing={0.5} sx={{ minWidth: 0, flex: compact ? undefined : '1 1 320px' }}>
          <Typography fontWeight={600} variant={compact ? 'body2' : 'body1'}>
            {teamMap[match.team1_id] ?? `#${match.team1_id}`} vs{' '}
            {teamMap[match.team2_id] ?? `#${match.team2_id}`}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Score: {match.score1 ?? '-'} : {match.score2 ?? '-'}
          </Typography>

          {match.penalty_score1 !== null &&
            match.penalty_score2 !== null && (
              <Typography variant="body2" color="text.secondary">
                Penalties: {match.penalty_score1} : {match.penalty_score2}
              </Typography>
            )}

          {match.winner_team_id && (
            <Typography variant="body2" color="text.secondary">
              Winner:{' '}
              {teamMap[match.winner_team_id] ??
                `#${match.winner_team_id}`}
            </Typography>
          )}

          <Typography variant="body2" color="text.secondary">
            Date: {match.date ?? '-'}{match.time ? ` — ${formatTime12Hour(match.time)}` : ''}
          </Typography>

          {match.rescheduled_from_date && (
            <Typography variant="body2" color="warning.main">
              Rescheduled from: {match.rescheduled_from_date}
            </Typography>
          )}

          <Typography variant="body2" color="text.secondary">
            Field:{' '}
            {match.field_id
              ? fieldMap[match.field_id] ?? `#${match.field_id}`
              : '-'}
          </Typography>

          {match.leg_number && (
            <Typography variant="body2" color="text.secondary">
              Leg: {match.leg_number}
            </Typography>
          )}

          {match.bracket_round && (
            <Typography variant="body2" color="text.secondary">
              Stage: {match.bracket_round}
            </Typography>
          )}
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip
            label={match.status ?? 'scheduled'}
            size="small"
            className='capitalize'
            sx={(() => {
              switch (match.status) {
                case 'played':
                  return { backgroundColor: '#43a047', color: '#fff' };
                case 'in_progress':
                  return { backgroundColor: '#ffa726', color: '#fff' };
                case 'cancelled':
                  return { backgroundColor: '#e53935', color: '#fff' };
                case 'scheduled':
                default:
                  return { backgroundColor: '#1976d2', color: '#fff' };
              }
            })()}
          />
          {match.rescheduled_from_date && (
            <Chip label="Rescheduled" size="small" color="warning" />
          )}
          {match.is_extra && (
            <Chip label="Extra" size="small" color="secondary" />
          )}
          <Button
            variant="outlined"
            size="small"
            onClick={() => onEdit(match)}
          >
            Edit
          </Button>
          {match.is_extra && onDeleteExtraMatch && (
            <Button variant="outlined" color="error" size="small" onClick={() => onDeleteExtraMatch(match)}>
              Delete
            </Button>
          )}
        </Stack>
      </Stack>
    </Paper>
  );

  const content = (
    <Stack spacing={3} sx={{ width: '100%', minWidth: 0 }}>
      {sortedGroups.map((groupKey, index) => (
        <Paper key={groupKey} sx={{ p: 2, width: '100%', minWidth: 0 }}>
          <Stack spacing={2}>
            {groupByRound && (
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Typography variant="subtitle1" fontWeight={700}>
                  {groupKey === 'No Round' ? 'No Round' : `Round ${groupKey}`}
                </Typography>
                {groupKey !== 'No Round' && onAddExtraMatch && (
                  <Button variant="contained" color="success" size="small" onClick={() => onAddExtraMatch(Number(groupKey))}>
                    Add Extra Match
                  </Button>
                )}
              </Stack>
            )}

            {groupByDate && groupKey !== 'all' && (
              <Typography variant="h6" fontWeight={700}>
                Round {index + 1} — {groupKey}
              </Typography>
            )}

            {grouped[groupKey].map(renderMatch)}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );

  if (!groupByRound) {
    return content;
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: 'repeat(2, minmax(0, 1fr))',
          lg: 'repeat(4, minmax(0, 1fr))',
        },
        gap: 2,
        width: '100%',
        minWidth: 0,
      }}
    >
      {sortedGroups.map((groupKey) => (
        <Paper key={groupKey} sx={{ p: 2, minWidth: 0 }}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle1" fontWeight={700}>
              {groupKey === 'No Round' ? 'No Round' : `Round ${groupKey}`}
            </Typography>
            {groupKey !== 'No Round' && onAddExtraMatch && (
              <Button variant="contained" color="success" size="small" onClick={() => onAddExtraMatch(Number(groupKey))}>
                Add Extra Match
              </Button>
            )}
            {grouped[groupKey].map(renderMatch)}
          </Stack>
        </Paper>
      ))}
    </Box>
  );
}
