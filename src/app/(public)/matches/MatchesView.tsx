"use client";

import { useState, useMemo } from 'react';
import {
  Box,
  Chip,
  Divider,
  MenuItem,
  Select,
  Stack,
  Typography,
  FormControl,
  InputLabel,
} from '@mui/material';
import Image from 'next/image';
import type { Event } from '@/models/event';
import type { PublicMatchRow } from '@/services/matches/getPublicMatches';

const BRACKET_ROUND_LABELS: Record<string, string> = {
  round_of_16: 'Octavos de final',
  quarterfinal: 'Cuartos de final',
  semifinal: 'Semifinal',
  final: 'Final',
  third_place: 'Tercer puesto',
};

const STATUS_LABELS: Record<string, { label: string; color: 'default' | 'success' | 'warning' | 'error' }> = {
  scheduled: { label: 'Programado', color: 'default' },
  in_progress: { label: 'En curso', color: 'warning' },
  played: { label: 'Jugado', color: 'success' },
  cancelled: { label: 'Cancelado', color: 'error' },
};

function formatDateLabel(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('es-ES', {
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
  initialEventId: number;
  matchesByEvent: Record<number, PublicMatchRow[]>;
};

export default function MatchesView({ events, initialEventId, matchesByEvent }: Props) {
  const [selectedEventId, setSelectedEventId] = useState<number>(initialEventId);
  const [selectedRound, setSelectedRound] = useState<string>('all');
  const [selectedClub, setSelectedClub] = useState<string>('all');

  const matches = matchesByEvent[selectedEventId] ?? [];

  // Derive filter options from matches
  const rounds = useMemo(() => {
    const seen = new Set<string>();
    const result: { value: string; label: string }[] = [];
    for (const m of matches) {
      const key = formatRoundLabel(m);
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ value: key, label: key });
      }
    }
    return result;
  }, [matches]);

  const clubs = useMemo(() => {
    const seen = new Set<string>();
    for (const m of matches) {
      seen.add(m.team1_name);
      seen.add(m.team2_name);
    }
    return Array.from(seen).sort();
  }, [matches]);

  // Filter matches
  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (selectedRound !== 'all' && formatRoundLabel(m) !== selectedRound) return false;
      if (selectedClub !== 'all' && m.team1_name !== selectedClub && m.team2_name !== selectedClub) return false;
      return true;
    });
  }, [matches, selectedRound, selectedClub]);

  // Group by round then date
  const grouped = useMemo(() => {
    const byRound: Record<string, Record<string, PublicMatchRow[]>> = {};
    for (const m of filtered) {
      const round = formatRoundLabel(m);
      const date = m.date ?? 'Sin fecha';
      if (!byRound[round]) byRound[round] = {};
      if (!byRound[round][date]) byRound[round][date] = [];
      byRound[round][date].push(m);
    }
    return byRound;
  }, [filtered]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div>
      
      {/* Banner */}
      <div
        className="w-full py-8 px-4 text-center"
        style={{ background: 'var(--color-blue, #023467)' }}
      >
        <p className="text-xs uppercase tracking-widest text-blue-300 font-filson-regular mb-1">
          Moure Premier League
        </p>
        <h1 className="text-2xl md:text-3xl font-filson-black text-white">
          {selectedEvent?.name ?? 'Partidos'} — Matches
        </h1>
      </div>

      {/* Topbar filters */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <Stack direction="row" gap={2} flexWrap="wrap" alignItems="center">
            {/* Event selector */}
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel className="font-filson-regular">
                League / Cup
              </InputLabel>
              <Select
                value={selectedEventId}
                label="League / Cup"
                className='font-filson-bold'
                onChange={(e) => {
                  setSelectedEventId(Number(e.target.value));
                  setSelectedRound('all');
                  setSelectedClub('all');
                }}
              >
                {events.map((ev) => (
                  <MenuItem key={ev.id} value={ev.id} className='font-filson-regular'>
                    {ev.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Round selector */}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel className="font-filson-regular">
                Round
              </InputLabel>
              <Select
                value={selectedRound}
                label="Round"
                className='font-filson-regular'
                onChange={(e) => setSelectedRound(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                {rounds.map((r) => (
                  <MenuItem key={r.value} value={r.value} className='font-filson-regular'>{r.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Club selector */}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel className="font-filson-regular">
                Clubs
              </InputLabel>
              <Select
                value={selectedClub}
                label="Club"
                onChange={(e) => setSelectedClub(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                {clubs.map((c) => (
                  <MenuItem key={c} value={c} className='font-filson-regular'>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {Object.keys(grouped).length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={8} className="font-filson-regular">
            There are no matches to display for the selected filters. Please try selecting a different league, round, or club.
          </Typography>
        ) : (
          Object.entries(grouped).map(([round, dateMap]) => (
            <div key={round} className="mb-10">
              {/* Round heading */}
              <Typography
                variant="h6"
                textAlign="center"
                fontWeight={700}
                mb={3}
                className="font-filson-black uppercase tracking-wide"
              >
                {round}
              </Typography>

              {Object.entries(dateMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, rows]) => (
                <div key={date} className="mb-6">
                  {/* Date sub-heading */}
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      fontWeight: 700,
                      color: 'primary.main',
                      textTransform: 'capitalize',
                      mb: 1,
                      px: 1,
                    }}
                    className="font-filson-bold"
                  >
                    {date !== 'Sin fecha' ? formatDateLabel(date) : 'Sin fecha'}
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Stack spacing={1.5}>
                    {rows.map((row) => {
                      const statusInfo = STATUS_LABELS[row.status ?? ''] ?? { label: row.status ?? '', color: 'default' as const };
                      const isPlayed = row.status === 'played';

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
                          {row.stage_type === 'knockout' && row.bracket_round && (
                            <Chip
                              label={BRACKET_ROUND_LABELS[row.bracket_round] ?? row.bracket_round}
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ alignSelf: 'center', mb: 0.75, fontSize: 11, height: 20 }}
                            />
                          )}

                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            {/* Team 1 */}
                            <Stack direction="row" alignItems="center" gap={1} flex={1} justifyContent="flex-end">
                              <Typography fontSize={13} className="font-filson-bold" textAlign="right">
                                {row.team1_name}
                              </Typography>
                              <Image
                                src="/Imagotipo-Principal-Vertical-Sin-Fondo-Azul-MPL.svg"
                                width={28}
                                height={28}
                                alt={row.team1_name}
                              />
                            </Stack>

                            {/* Score or vs */}
                            <Box sx={{ mx: 1.5, textAlign: 'center', minWidth: 64 }}>
                              {isPlayed ? (
                                <Typography fontSize={16} fontWeight={800} className="font-filson-black">
                                  {row.score1} – {row.score2}
                                </Typography>
                              ) : (
                                <Typography fontSize={13} color="text.secondary" fontWeight={700}>
                                  vs
                                </Typography>
                              )}
                              <Chip
                                label={statusInfo.label}
                                size="small"
                                color={statusInfo.color}
                                sx={{ fontSize: 10, height: 18, mt: 0.5 }}
                              />
                            </Box>

                            {/* Team 2 */}
                            <Stack direction="row" alignItems="center" gap={1} flex={1}>
                              <Image
                                src="/Imagotipo-Principal-Vertical-Sin-Fondo-Azul-MPL.svg"
                                width={28}
                                height={28}
                                alt={row.team2_name}
                              />
                              <Typography fontSize={13} className="font-filson-bold">
                                {row.team2_name}
                              </Typography>
                            </Stack>
                          </Stack>

                          {row.field_name && (
                            <Typography variant="caption" color="text.secondary" textAlign="center" mt={0.5} className="font-filson-regular">
                              {row.field_name}
                            </Typography>
                          )}
                        </Stack>
                      );
                    })}
                  </Stack>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
