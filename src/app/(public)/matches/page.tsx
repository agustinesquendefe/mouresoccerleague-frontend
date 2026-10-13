import { getEvents } from '@/services/events/getEvents';
import { getPublicMatches, type PublicMatchRow } from '@/services/matches/getPublicMatches';
import MatchesView from './MatchesView';


export const dynamic = 'force-dynamic';

export default async function MatchesPage() {
  const events = await getEvents();
  const activeEvents = events.filter((e) => e.status === 'active');

  const matches = (await Promise.all(
    activeEvents.map(async (e) => {
      return getPublicMatches(e.id, { upcomingRoundsOnly: false }).catch(() => [] as PublicMatchRow[]);
    })
  )).flat();

  return (
    <main className="bg-[--color-white] text-[--color-black] min-h-screen">

      {activeEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <p className="text-xl font-filson-regular">
            There are no active championships at the moment. Please check back later for updates on matches and events.
          </p>
        </div>
      ) : (
        <MatchesView
          events={activeEvents}
          matches={matches}
        />
      )}

    </main>
  );
}
