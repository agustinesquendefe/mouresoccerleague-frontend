import type { Event } from '@/models/event';
import { getEvents } from '@/services/events/getEvents';
import { getPublicMatches, type PublicMatchRow } from '@/services/matches/getPublicMatches';
import MatchesView from './MatchesView';


export const dynamic = 'force-dynamic';

async function getOldestActiveEvent(events: Event[]): Promise<Event | null> {
  const active = events.filter((e) => e.status === 'active');
  if (active.length === 0) return null;
  return active.reduce((oldest, e) =>
    new Date(e.start_date) < new Date(oldest.start_date) ? e : oldest
  );
}

export default async function MatchesPage() {
  const events = await getEvents();
  const activeEvents = events.filter((e) => e.status === 'active');
  const defaultEvent = await getOldestActiveEvent(events);

  // Prefetch matches for all active events in parallel
  const matchesByEvent: Record<number, PublicMatchRow[]> = {};
  await Promise.all(
    activeEvents.map(async (e) => {
      matchesByEvent[e.id] = await getPublicMatches(e.id).catch(() => []);
    })
  );

  return (
    <main className="bg-[--color-white] text-[--color-black] min-h-screen">

      {activeEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <p className="text-xl font-filson-regular">No hay campeonatos activos en este momento.</p>
        </div>
      ) : (
        <MatchesView
          events={activeEvents}
          initialEventId={defaultEvent?.id ?? activeEvents[0].id}
          matchesByEvent={matchesByEvent}
        />
      )}

    </main>
  );
}
