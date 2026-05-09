'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { Match } from '@/models/match';
import type { Field } from '@/models/field';
import type { MatchScheduleUpdate } from '@/services/matches';

type MatchScheduleDraft = {
  id: number;
  date: string | null;
  time: string | null;
  field_id: number | null;
};

type Props = {
  roundLabel: string;
  matches: Match[];
  teamMap: Record<number, string>;
  fields: Field[];
  loading?: boolean;
  onSave: (updates: MatchScheduleUpdate[]) => Promise<void>;
};

const isLockedStatus = (status: Match['status']) =>
  status === 'played' || status === 'in_progress';

const getFieldNumber = (fieldId: number | null, fields: Field[]) => {
  if (!fieldId) {
    return null;
  }

  const index = fields.findIndex((field) => field.id === fieldId);
  return index === -1 ? null : index + 1;
};

export default function RoundSchedulePlanner({
  roundLabel,
  matches,
  teamMap,
  fields,
  loading = false,
  onSave,
}: Props) {
  const [drafts, setDrafts] = useState<Record<number, MatchScheduleDraft>>({});
  const [bulkDate, setBulkDate] = useState<string>('');

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        matches.map((match) => [
          match.id,
          {
            id: match.id,
            date: match.date,
            time: match.time,
            field_id: match.field_id,
          },
        ])
      )
    );
  }, [matches]);

  const hasLockedMatches = useMemo(
    () => matches.some((match) => isLockedStatus(match.status)),
    [matches]
  );

  const changedUpdates = useMemo(() => {
    return matches.flatMap((match) => {
      const draft = drafts[match.id];

      if (!draft || isLockedStatus(match.status)) {
        return [];
      }

      if (
        draft.date === match.date &&
        draft.time === match.time &&
        draft.field_id === match.field_id
      ) {
        return [];
      }

      return [
        {
          id: match.id,
          date: draft.date,
          time: draft.time,
          field_id: draft.field_id,
          field_number: getFieldNumber(draft.field_id, fields),
        },
      ];
    });
  }, [drafts, fields, matches]);

  const timeSlots = useMemo(() => {
    return Array.from(
      new Set(
        Object.values(drafts)
          .map((draft) => draft.time)
          .filter((time): time is string => Boolean(time))
      )
    ).sort((left, right) => left.localeCompare(right));
  }, [drafts]);

  const scheduledBySlot = useMemo(() => {
    const result = new Map<string, Match>();

    matches.forEach((match) => {
      const draft = drafts[match.id];
      if (!draft?.time || !draft.field_id) {
        return;
      }

      result.set(`${draft.time}:${draft.field_id}`, match);
    });

    return result;
  }, [drafts, matches]);

  const unslottedMatches = useMemo(() => {
    return matches.filter((match) => {
      const draft = drafts[match.id];
      return !draft?.time || !draft.field_id;
    });
  }, [drafts, matches]);

  const handleDraftChange = (
    matchId: number,
    key: keyof Omit<MatchScheduleDraft, 'id'>,
    value: string | number | null
  ) => {
    setDrafts((current) => ({
      ...current,
      [matchId]: {
        ...current[matchId],
        [key]: value,
      },
    }));
  };

  const applyDateToAll = () => {
    if (!bulkDate) {
      return;
    }

    setDrafts((current) =>
      Object.fromEntries(
        matches.map((match) => [
          match.id,
          {
            ...current[match.id],
            id: match.id,
            date: isLockedStatus(match.status) ? current[match.id]?.date ?? match.date : bulkDate,
          },
        ])
      )
    );
  };

  const handleSave = async () => {
    if (changedUpdates.length === 0) {
      return;
    }

    await onSave(changedUpdates);
  };

  return (
    <Paper variant="outlined" sx={{ p: 2.5 }}>
      <Stack spacing={2.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              Schedule Diagram
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure {roundLabel} in one place before publishing or playing matches.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              label="Date for all"
              type="date"
              size="small"
              value={bulkDate}
              onChange={(event) => setBulkDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <Button variant="outlined" onClick={applyDateToAll} disabled={!bulkDate || loading}>
              Apply Date
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={loading || changedUpdates.length === 0}>
              {loading ? 'Saving...' : `Save Diagram (${changedUpdates.length})`}
            </Button>
          </Stack>
        </Stack>

        <Alert severity="info">
          Use this planner to assign time slots and fields for the entire round without opening each match one by one.
        </Alert>

        {hasLockedMatches && (
          <Alert severity="warning">
            Played or in-progress matches are shown for reference, but their schedule is locked.
          </Alert>
        )}

        <Stack spacing={1.5}>
          {matches.map((match) => {
            const draft = drafts[match.id];
            const locked = isLockedStatus(match.status);

            return (
              <Paper key={match.id} variant="outlined" sx={{ p: 1.5 }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                    <Typography fontWeight={600}>
                      {teamMap[match.team1_id] ?? `#${match.team1_id}`} vs {teamMap[match.team2_id] ?? `#${match.team2_id}`}
                    </Typography>
                    <Chip label={match.status ?? 'scheduled'} size="small" />
                  </Stack>

                  <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                    <TextField
                      label="Date"
                      type="date"
                      size="small"
                      value={draft?.date ?? ''}
                      onChange={(event) => handleDraftChange(match.id, 'date', event.target.value || null)}
                      InputLabelProps={{ shrink: true }}
                      disabled={locked || loading}
                    />
                    <TextField
                      label="Time"
                      type="time"
                      size="small"
                      value={draft?.time ?? ''}
                      onChange={(event) => handleDraftChange(match.id, 'time', event.target.value || null)}
                      InputLabelProps={{ shrink: true }}
                      disabled={locked || loading}
                    />
                    <TextField
                      select
                      label="Field"
                      size="small"
                      value={draft?.field_id ?? ''}
                      onChange={(event) => handleDraftChange(match.id, 'field_id', event.target.value === '' ? null : Number(event.target.value))}
                      sx={{ minWidth: 220 }}
                      disabled={locked || loading}
                    >
                      <MenuItem value="">No field</MenuItem>
                      {fields.map((field, index) => (
                        <MenuItem key={field.id} value={field.id}>
                          {field.name} - #{index + 1}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>

        <Box>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Slot Preview
          </Typography>

          {timeSlots.length === 0 ? (
            <Alert severity="info">Assign time and field to start building the round diagram.</Alert>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: `160px repeat(${Math.max(fields.length, 1)}, minmax(180px, 1fr))`,
                  minWidth: 0,
                }}
              >
                <Paper variant="outlined" sx={{ p: 1.5, fontWeight: 700 }}>
                  <Typography fontWeight={700}>Time</Typography>
                </Paper>
                {fields.map((field, index) => (
                  <Paper key={field.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography fontWeight={700}>{field.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Field #{index + 1}
                    </Typography>
                  </Paper>
                ))}

                {timeSlots.map((time) => (
                  <>
                    <Paper key={`${time}:label`} variant="outlined" sx={{ p: 1.5 }}>
                      <Typography fontWeight={600}>{time}</Typography>
                    </Paper>
                    {fields.map((field) => {
                      const match = scheduledBySlot.get(`${time}:${field.id}`);

                      return (
                        <Paper key={`${time}:${field.id}`} variant="outlined" sx={{ p: 1.5, minHeight: 88, bgcolor: match ? 'action.hover' : 'transparent' }}>
                          {match ? (
                            <Typography variant="body2" fontWeight={600}>
                              {teamMap[match.team1_id] ?? `#${match.team1_id}`} vs {teamMap[match.team2_id] ?? `#${match.team2_id}`}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Available
                            </Typography>
                          )}
                        </Paper>
                      );
                    })}
                  </>
                ))}
              </Box>
            </Box>
          )}

          {unslottedMatches.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Pending slot: {unslottedMatches.map((match) => `${teamMap[match.team1_id] ?? `#${match.team1_id}`} vs ${teamMap[match.team2_id] ?? `#${match.team2_id}`}`).join(' | ')}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}