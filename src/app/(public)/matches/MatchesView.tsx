"use client";

import { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Image from 'next/image';
import type { Event } from '@/models/event';
import type { PublicMatchRow } from '@/services/matches/getPublicMatches';
import { formatTime12Hour } from '@/utils/formatTime';

const BRACKET_ROUND_LABELS: Record<string, string> = {
  round_of_16: 'Round of 16',
  quarterfinal: 'Quarterfinal',
  semifinal: 'Semifinal',
  final: 'Final',
  third_place: 'Third Place',
};

const STATUS_LABELS: Record<string, { label: string; color: 'default' | 'success' | 'warning' | 'error' }> = {
  scheduled: { label: 'Scheduled', color: 'default' },
  in_progress: { label: 'Playing', color: 'warning' },
  played: { label: 'Played', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'error' },
};

function getLocalDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getInitialDate(matches: PublicMatchRow[]) {
  const today = getLocalDateKey();
  const dates = Array.from(new Set(matches.flatMap((match) => match.date ? [match.date] : []))).sort();
  return dates.includes(today)
    ? today
    : dates.find((date) => date > today) ?? dates[dates.length - 1] ?? today;
}

function formatDateLabel(date: string): string {
  if (!date) return 'Select a match date';
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRoundLabel(match: PublicMatchRow): string {
  if (match.stage_type === 'knockout' && match.bracket_round) {
    return BRACKET_ROUND_LABELS[match.bracket_round] ?? match.bracket_round;
  }
  return match.round_number != null ? `Jornada ${match.round_number}` : 'Sin jornada';
}

type Props = {
  events: Event[];
  matches: PublicMatchRow[];
};

export default function MatchesView({ events, matches }: Props) {
  const [selectedDate, setSelectedDate] = useState(() => getInitialDate(matches));
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [selectedRound, setSelectedRound] = useState<string>('all');
  const [selectedClub, setSelectedClub] = useState<string>('all');

  const eventById = useMemo(
    () => new Map(events.map((event) => [event.id, event])),
    [events]
  );

  const matchesForDate = useMemo(
    () => matches.filter((match) => match.date === selectedDate),
    [matches, selectedDate]
  );

  const eventsForDate = useMemo(() => {
    const eventIds = new Set(matchesForDate.map((match) => match.event_id));
    return events.filter((event) => eventIds.has(event.id));
  }, [events, matchesForDate]);

  const matchesForEvent = useMemo(
    () => matchesForDate.filter((match) => (
      selectedEventId === 'all' || match.event_id === Number(selectedEventId)
    )),
    [matchesForDate, selectedEventId]
  );

  const rounds = useMemo(() => {
    const labels = new Set(matchesForEvent.map(formatRoundLabel));
    return Array.from(labels).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  }, [matchesForEvent]);

  const clubs = useMemo(() => {
    const names = new Set<string>();
    matchesForEvent.forEach((match) => {
      if (selectedRound === 'all' || formatRoundLabel(match) === selectedRound) {
        names.add(match.team1_name);
        names.add(match.team2_name);
      }
    });
    return Array.from(names).sort();
  }, [matchesForEvent, selectedRound]);

  const filteredMatches = useMemo(() => {
    return matchesForEvent
      .filter((match) => {
        if (selectedRound !== 'all' && formatRoundLabel(match) !== selectedRound) return false;
        if (selectedClub !== 'all' && match.team1_name !== selectedClub && match.team2_name !== selectedClub) return false;
        return true;
      })
      .sort((left, right) => {
        const byTime = (left.time ?? '99:99:99').localeCompare(right.time ?? '99:99:99');
        if (byTime !== 0) return byTime;
        const leftEvent = eventById.get(left.event_id)?.name ?? '';
        const rightEvent = eventById.get(right.event_id)?.name ?? '';
        const byEvent = leftEvent.localeCompare(rightEvent);
        return byEvent !== 0 ? byEvent : left.id - right.id;
      });
  }, [eventById, matchesForEvent, selectedClub, selectedRound]);

  return (
    <div>
      <div
        className="w-full py-8 px-4 text-center"
        style={{ background: 'var(--color-blue, #023467)' }}
      >
        <p className="text-xs uppercase tracking-widest text-blue-300 font-filson-regular mb-1">
          Moure Premier League
        </p>
        <h1 className="text-2xl md:text-3xl font-filson-black text-white">
          Matches
        </h1>
      </div>

      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <Stack direction="row" gap={2} flexWrap="wrap" alignItems="center">
            <TextField
              type="date"
              label="Match Date"
              value={selectedDate}
              onChange={(event) => {
                setSelectedDate(event.target.value);
                setSelectedEventId('all');
                setSelectedRound('all');
                setSelectedClub('all');
              }}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 180 }}
            />

            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel className="font-filson-regular">League / Cup</InputLabel>
              <Select
                value={selectedEventId}
                label="League / Cup"
                className="font-filson-bold"
                onChange={(event) => {
                  setSelectedEventId(String(event.target.value));
                  setSelectedRound('all');
                  setSelectedClub('all');
                }}
              >
                <MenuItem value="all">All events</MenuItem>
                {eventsForDate.map((event) => (
                  <MenuItem key={event.id} value={String(event.id)} className="font-filson-regular">
                    {event.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel className="font-filson-regular">Round</InputLabel>
              <Select
                value={rounds.includes(selectedRound) ? selectedRound : 'all'}
                label="Round"
                className="font-filson-regular"
                onChange={(event) => {
                  setSelectedRound(event.target.value);
                  setSelectedClub('all');
                }}
              >
                <MenuItem value="all">All rounds</MenuItem>
                {rounds.map((round) => (
                  <MenuItem key={round} value={round} className="font-filson-regular">{round}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel className="font-filson-regular">Club</InputLabel>
              <Select
                value={clubs.includes(selectedClub) ? selectedClub : 'all'}
                label="Club"
                onChange={(event) => setSelectedClub(event.target.value)}
              >
                <MenuItem value="all">All clubs</MenuItem>
                {clubs.map((club) => (
                  <MenuItem key={club} value={club} className="font-filson-regular">{club}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Typography variant="h6" fontWeight={800} mb={1} className="font-filson-black">
          {formatDateLabel(selectedDate)}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2} className="font-filson-regular">
          {filteredMatches.length} {filteredMatches.length === 1 ? 'match' : 'matches'} · ordered by kickoff time
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {filteredMatches.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={8} className="font-filson-regular">
            There are no matches for this date and the selected optional filters.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {filteredMatches.map((row) => {
              const statusInfo = STATUS_LABELS[row.status ?? ''] ?? {
                label: row.status ?? '',
                color: 'default' as const,
              };
              const isPlayed = row.status === 'played';
              const eventName = eventById.get(row.event_id)?.name ?? `Event #${row.event_id}`;

              return (
                <Stack
                  key={row.id}
                  direction="column"
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderRadius: 2,
                    bgcolor: row.stage_type === 'knockout' ? 'primary.50' : 'grey.50',
                    border: row.stage_type === 'knockout' ? '1px solid' : 'none',
                    borderColor: 'primary.100',
                  }}
                >
                  <Stack direction="row" spacing={0.75} justifyContent="center" flexWrap="wrap" mb={1}>
                    <Chip label={eventName} size="small" color="primary" variant="outlined" />
                    <Chip label={formatRoundLabel(row)} size="small" variant="outlined" />
                  </Stack>

                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" alignItems="center" gap={1} flex={1} justifyContent="flex-end">
                      <Typography fontSize={13} className="font-filson-bold" textAlign="right">
                        {row.team1_name}
                      </Typography>
                      {row.team1_disqualified && <Chip label="Disqualified" color="error" size="small" sx={{ fontSize: 9, height: 18 }} />}
                      <Image
                        src={row.team1_logo ?? '/Imagotipo-Principal-Vertical-Sin-Fondo-Azul-MPL.svg'}
                        width={28}
                        height={28}
                        alt={row.team1_name}
                        style={{ objectFit: 'contain' }}
                      />
                    </Stack>

                    <Box sx={{ mx: 1.5, textAlign: 'center', minWidth: 64 }}>
                      {isPlayed ? (
                        <Typography fontSize={16} fontWeight={800} className="font-filson-black">
                          {row.score1} – {row.score2}
                        </Typography>
                      ) : (
                        <Typography fontSize={13} color="text.secondary" fontWeight={700}>vs</Typography>
                      )}
                      <Chip
                        label={statusInfo.label}
                        size="small"
                        color={statusInfo.color}
                        sx={{ fontSize: 10, height: 18, mt: 0.5 }}
                      />
                    </Box>

                    <Stack direction="row" alignItems="center" gap={1} flex={1}>
                      <Image
                        src={row.team2_logo ?? '/Imagotipo-Principal-Vertical-Sin-Fondo-Azul-MPL.svg'}
                        width={28}
                        height={28}
                        alt={row.team2_name}
                        style={{ objectFit: 'contain' }}
                      />
                      <Typography fontSize={13} className="font-filson-bold">{row.team2_name}</Typography>
                      {row.team2_disqualified && <Chip label="Disqualified" color="error" size="small" sx={{ fontSize: 9, height: 18 }} />}
                    </Stack>
                  </Stack>

                  {row.field_name && (
                    <Typography variant="caption" color="text.secondary" textAlign="center" mt={0.5} className="font-filson-regular">
                      {row.field_name}
                    </Typography>
                  )}

                  <Typography variant="caption" color="text.secondary" textAlign="center" mt={0.25} className="font-filson-regular">
                    {row.time ? `🕐 ${formatTime12Hour(row.time)}` : 'Time TBD'}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        )}
      </div>
    </div>
  );
}
