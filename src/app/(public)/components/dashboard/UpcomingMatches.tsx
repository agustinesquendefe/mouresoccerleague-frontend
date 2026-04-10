"use client";

import { useEffect, useState } from 'react';
import {
  CardContent,
  Typography,
  Chip,
  Stack,
  Card,
  Box,
  Divider,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { getUpcomingMatches, UpcomingMatchRow } from '@/services/dashboard/getUpcomingMatches';
import type { Event } from '@/models/event';
import Image from 'next/image';

function formatDateLabel(date: string | null): string {
  if (!date) return 'Sin fecha';
  return new Date(`${date}T00:00:00`).toLocaleDateString('es-ES', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

const BRACKET_ROUND_LABELS: Record<string, string> = {
  round_of_16: 'Octavos de final',
  quarterfinal: 'Cuartos de final',
  semifinal: 'Semifinal',
  final: 'Final',
  third_place: 'Tercer puesto',
};

function formatBracketRound(round: string | null): string | null {
  if (!round) return null;
  return BRACKET_ROUND_LABELS[round] ?? round;
}

function formatTime(time: string | null): string | null {
  if (!time) return null;
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

function groupByDate(rows: UpcomingMatchRow[]): Record<string, UpcomingMatchRow[]> {
  return rows.reduce((acc, row) => {
    const key = row.date ?? 'Sin fecha';
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {} as Record<string, UpcomingMatchRow[]>);
}

type UpcomingMatchesProps = {
  event: Event;
  compact?: boolean;
};

export default function UpcomingMatches({ event, compact = false }: UpcomingMatchesProps) {
  const [rows, setRows] = useState<UpcomingMatchRow[]>([]);

  useEffect(() => {
    getUpcomingMatches(event.id).then(setRows).catch(console.error);
  }, [event.id]);

  const grouped = groupByDate(rows);
  const sortedDates = Object.keys(grouped).sort();

  return (
    <Card sx={{ mb: 4, borderRadius: 3, boxShadow: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', pb: '16px !important' }}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="body1" color="black" className="font-filson-bold">
            {event.name}
          </Typography>
          <Typography variant="body1" color="primary" className="font-filson-bold">
            Next Games
          </Typography>
        </Stack>

        {/* Scrollable matches column */}
        <Box sx={{ overflowY: 'auto', flex: 1, maxHeight: 480, pr: 0.5 }}>
          {sortedDates.length === 0 && (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={4} className='font-filson-regular'>
              No hay partidos próximos.
            </Typography>
          )}
          {sortedDates.map((date) => (
            <Box key={date} mb={2}>
              {/* Fecha separador */}
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
                {formatDateLabel(date)}
              </Typography>
              <Divider sx={{ mb: 1 }} />
              <Stack spacing={1.5}>
                {grouped[date].map((row) => (
                  <Stack
                    key={row.id}
                    direction="column"
                    sx={{
                      width: '100%',
                      px: 1,
                      py: 1,
                      borderRadius: 2,
                      bgcolor: row.stage_type === 'knockout' ? 'primary.50' : 'grey.50',
                      border: row.stage_type === 'knockout' ? '1px solid' : 'none',
                      borderColor: 'primary.100',
                    }}
                  >
                    {row.stage_type === 'knockout' && formatBracketRound(row.bracket_round) && (
                      <Chip
                        label={formatBracketRound(row.bracket_round)}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ alignSelf: 'center', mb: 0.75, fontSize: 11, height: 20 }}
                      />
                    )}
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                    {/* Team 1 */}
                    <Stack direction="row" alignItems="center" gap={1} flex={1} justifyContent="flex-end">
                      <Typography fontSize={13} className="font-filson-bold" textAlign="right">
                        {row.team1_name}
                      </Typography>
                      <Image
                        src={row.team1_logo ?? '/Imagotipo-Principal-Vertical-Sin-Fondo-Azul-MPL.svg'}
                        width={30}
                        height={30}
                        alt={row.team1_name}
                        style={{ objectFit: 'contain' }}
                      />
                    </Stack>

                    <Typography
                      fontSize={13}
                      fontWeight={700}
                      sx={{ mx: 1.5, color: 'text.secondary' }}
                    >
                      vs
                    </Typography>

                    {/* Team 2 */}
                    <Stack direction="row" alignItems="center" gap={1} flex={1}>
                      <Image
                        src={row.team2_logo ?? '/Imagotipo-Principal-Vertical-Sin-Fondo-Azul-MPL.svg'}
                        width={30}
                        height={30}
                        alt={row.team2_name}
                        style={{ objectFit: 'contain' }}
                      />
                      <Typography fontSize={13} className="font-filson-bold">
                        {row.team2_name}
                      </Typography>
                    </Stack>
                    </Stack>
                    {/* Time and field info */}
                    {(row.time || row.field_name) && (
                      <Stack direction="row" justifyContent="center" alignItems="center" gap={1.5} mt={0.75}>
                        {row.time && (
                          <Stack direction="row" alignItems="center" gap={0.4}>
                            <AccessTimeIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                            <Typography fontSize={11} color="text.secondary" className="font-filson-regular">
                              {formatTime(row.time)}
                            </Typography>
                          </Stack>
                        )}
                        {row.field_name && (
                          <Stack direction="row" alignItems="center" gap={0.4}>
                            <LocationOnIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                            <Typography fontSize={11} color="text.secondary" className="font-filson-regular">
                              {row.field_name}
                            </Typography>
                          </Stack>
                        )}
                      </Stack>
                    )}
                  </Stack>
                ))}
              </Stack>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
