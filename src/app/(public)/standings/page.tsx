import type { Event } from '@/models/event';
import { getEvents } from '@/services/events/getEvents';
import { getEventStandings, type StandingRow } from '@/services/standings/getEventStandings';
import { getPublicMatches, type PublicMatchRow } from '@/services/matches/getPublicMatches';
import StandingsView from './StandingsView';

export const dynamic = 'force-dynamic';

export default async function StandingsPage() {
  const events = await getEvents();
  const activeEvents = events.filter((e) => e.status === 'active');

  if (activeEvents.length === 0) {
    return (
      <main className="bg-[--color-white] min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-400 font-filson-regular">No hay campeonatos activos en este momento.</p>
      </main>
    );
  }

  // Default: oldest active event
  const defaultEvent = activeEvents.reduce((oldest, e) =>
    new Date(e.start_date) < new Date(oldest.start_date) ? e : oldest
  );

  const standingsByEvent: Record<number, StandingRow[]> = {};
  const knockoutByEvent: Record<number, PublicMatchRow[]> = {};

  await Promise.all(
    activeEvents.map(async (e) => {
      const [standings, allMatches] = await Promise.all([
        getEventStandings(e.id).catch(() => [] as StandingRow[]),
        getPublicMatches(e.id).catch(() => [] as PublicMatchRow[]),
      ]);
      standingsByEvent[e.id] = standings;
      knockoutByEvent[e.id] = allMatches.filter((m) => m.stage_type === 'knockout');
    })
  );

  return (
    <main className="bg-[--color-white] text-[--color-black] min-h-screen">
      <StandingsView
        events={activeEvents}
        initialEventId={defaultEvent.id}
        standingsByEvent={standingsByEvent}
        knockoutByEvent={knockoutByEvent}
      />
    </main>
  );
}
