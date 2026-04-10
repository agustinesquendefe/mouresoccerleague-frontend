"use client";

import { useState } from 'react';
import {
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import Image from 'next/image';
import type { Event } from '@/models/event';
import type { StandingRow } from '@/services/standings/getEventStandings';
import type { PublicMatchRow } from '@/services/matches/getPublicMatches';

const BRACKET_ORDER = ['round_of_16', 'quarterfinal', 'semifinal', 'third_place', 'final'];

const BRACKET_LABELS: Record<string, string> = {
  round_of_16: 'Octavos de final',
  quarterfinal: 'Cuartos de final',
  semifinal: 'Semifinal',
  third_place: 'Tercer puesto',
  final: 'Final',
};

const STATUS_LABELS: Record<string, { label: string; color: 'default' | 'success' | 'warning' | 'error' }> = {
  scheduled: { label: 'Programado', color: 'default' },
  in_progress: { label: 'En curso', color: 'warning' },
  played: { label: 'Jugado', color: 'success' },
  cancelled: { label: 'Cancelado', color: 'error' },
};

type Props = {
  events: Event[];
  initialEventId: number;
  standingsByEvent: Record<number, StandingRow[]>;
  knockoutByEvent: Record<number, PublicMatchRow[]>;
};

export default function StandingsView({ events, initialEventId, standingsByEvent, knockoutByEvent }: Props) {
  const [selectedEventId, setSelectedEventId] = useState<number>(initialEventId);

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const standings = standingsByEvent[selectedEventId] ?? [];
  const knockoutMatches = knockoutByEvent[selectedEventId] ?? [];

  // Group knockout matches by bracket_round, sorted in bracket order
  const knockoutByRound: Record<string, PublicMatchRow[]> = {};
  for (const m of knockoutMatches) {
    const round = m.bracket_round ?? 'unknown';
    if (!knockoutByRound[round]) knockoutByRound[round] = [];
    knockoutByRound[round].push(m);
  }
  const sortedRounds = BRACKET_ORDER.filter((r) => knockoutByRound[r]?.length > 0);
  const hasPlayoffs = knockoutMatches.length > 0;

  return (
    <div className="flex flex-col min-h-screen container mx-auto bg-[--color-white]">

      {/* Banner */}
      <div
        className="w-full py-8 px-4 text-center shrink-0"
        style={{ background: 'var(--color-blue, #023467)' }}
      >
        <p className="text-xs uppercase tracking-widest text-blue-300 font-filson-regular mb-1">
          Moure Premier League
        </p>
        <h1 className="text-2xl md:text-3xl font-filson-black text-white">
          {selectedEvent?.name ?? 'Tabla'} — Standings
        </h1>
      </div>

      {/* Topbar filter */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm shrink-0">
        <div className="container mx-auto px-4 py-3">
          <Stack direction="row" gap={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel className="font-filson-regular">Campeonato</InputLabel>
              <Select
                value={selectedEventId}
                label="Campeonato"
                onChange={(e) => setSelectedEventId(Number(e.target.value))}
              >
                {events.map((ev) => (
                  <MenuItem key={ev.id} value={ev.id}>
                    {ev.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </div>
      </div>

      {/* Full-height table */}
      <div className="flex-1 container mx-auto px-4 py-8">
        {standings.length === 0 ? (
          <div className="flex items-center justify-center h-full py-24">
            <Typography variant="body1" color="text.secondary" className="font-filson-regular">
              Sin datos de posiciones para este campeonato.
            </Typography>
          </div>
        ) : (
          <div className="w-full overflow-x-auto rounded-2xl shadow-md border border-gray-100">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[--color-blue,#023467] text-white" style={{ background: 'var(--color-blue, #023467)' }}>
                  <th className="px-4 py-3 text-left w-10 font-filson-bold text-xs uppercase tracking-wide">#</th>
                  <th className="px-4 py-3 text-left font-filson-bold text-xs uppercase tracking-wide">Equipo</th>
                  <th className="px-4 py-3 text-center font-filson-bold text-xs uppercase tracking-wide">PJ</th>
                  <th className="px-4 py-3 text-center font-filson-bold text-xs uppercase tracking-wide">G</th>
                  <th className="px-4 py-3 text-center font-filson-bold text-xs uppercase tracking-wide">E</th>
                  <th className="px-4 py-3 text-center font-filson-bold text-xs uppercase tracking-wide">P</th>
                  <th className="px-4 py-3 text-center font-filson-bold text-xs uppercase tracking-wide">GF</th>
                  <th className="px-4 py-3 text-center font-filson-bold text-xs uppercase tracking-wide">GC</th>
                  <th className="px-4 py-3 text-center font-filson-bold text-xs uppercase tracking-wide">DG</th>
                  <th className="px-5 py-3 text-center font-filson-black text-sm uppercase tracking-wide">Pts</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row, i) => (
                  <tr
                    key={row.team_id}
                    className={`border-t border-gray-100 transition-colors hover:bg-blue-50/50 ${
                      i < 4 ? 'bg-blue-50/30' : 'bg-white'
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-400 font-filson-regular text-sm">{i + 1}</td>
                    <td className="px-4 py-3">
                      <span className="font-filson-bold text-gray-900 text-sm">{row.team_name}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 font-filson-regular text-sm">{row.played}</td>
                    <td className="px-4 py-3 text-center text-gray-600 font-filson-regular text-sm">{row.won}</td>
                    <td className="px-4 py-3 text-center text-gray-600 font-filson-regular text-sm">{row.drawn}</td>
                    <td className="px-4 py-3 text-center text-gray-600 font-filson-regular text-sm">{row.lost}</td>
                    <td className="px-4 py-3 text-center text-gray-600 font-filson-regular text-sm">{row.goals_for}</td>
                    <td className="px-4 py-3 text-center text-gray-600 font-filson-regular text-sm">{row.goals_against}</td>
                    <td className="px-4 py-3 text-center text-gray-600 font-filson-regular text-sm">
                      {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                    </td>
                    <td className="px-5 py-3 text-center font-filson-black text-base text-gray-900">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Legend */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-3">
              <div className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-200 shrink-0" />
              <span className="text-xs text-gray-500 font-filson-regular">Zona de clasificación a playoffs</span>
            </div>
          </div>
        )}

        {/* Playoffs section */}
        {hasPlayoffs && (
          <div className="mt-12">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-gray-200" />
              <h2 className="text-lg font-filson-black uppercase tracking-widest text-gray-800 px-2">
                Playoffs
              </h2>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div className="space-y-8">
              {sortedRounds.map((round) => (
                <div key={round}>
                  {/* Round heading */}
                  <div
                    className="px-4 py-2 rounded-t-xl text-white text-sm font-filson-black uppercase tracking-wide"
                    style={{ background: 'var(--color-blue, #023467)' }}
                  >
                    {BRACKET_LABELS[round] ?? round}
                  </div>

                  <div className="border border-t-0 border-gray-100 rounded-b-xl overflow-hidden">
                    {knockoutByRound[round].map((m, i) => {
                      const isPlayed = m.status === 'played';
                      const statusInfo = STATUS_LABELS[m.status ?? ''] ?? { label: m.status ?? '', color: 'default' as const };
                      return (
                        <div
                          key={m.id}
                          className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-gray-100' : ''} hover:bg-blue-50/30 transition-colors`}
                        >
                          {/* Team 1 */}
                          <div className="flex items-center gap-2 flex-1 justify-end">
                            <span className="font-filson-bold text-gray-900 text-sm text-right">{m.team1_name}</span>
                            <Image
                              src="/Imagotipo-Principal-Vertical-Sin-Fondo-Azul-MPL.svg"
                              width={26}
                              height={26}
                              alt={m.team1_name}
                            />
                          </div>

                          {/* Score / vs + status */}
                          <div className="mx-4 text-center min-w-20">
                            {isPlayed ? (
                              <span className="font-filson-black text-base text-gray-900">
                                {m.score1} – {m.score2}
                              </span>
                            ) : (
                              <span className="font-filson-regular text-gray-400 text-sm">vs</span>
                            )}
                            <div className="mt-0.5">
                              <Chip
                                label={statusInfo.label}
                                size="small"
                                color={statusInfo.color}
                                sx={{ fontSize: 10, height: 18 }}
                              />
                            </div>
                          </div>

                          {/* Team 2 */}
                          <div className="flex items-center gap-2 flex-1">
                            <Image
                              src="/Imagotipo-Principal-Vertical-Sin-Fondo-Azul-MPL.svg"
                              width={26}
                              height={26}
                              alt={m.team2_name}
                            />
                            <span className="font-filson-bold text-gray-900 text-sm">{m.team2_name}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
