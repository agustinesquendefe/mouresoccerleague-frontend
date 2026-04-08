import type { Event } from '@/models/event';
import UpcomingMatches from './components/dashboard/UpcomingMatches';
import StandingsCard from './components/dashboard/StandingsCard';
import { getUpcomingEvents } from '@/services/events/getUpcomingEvents';
import { getEventStandings, type StandingRow } from '@/services/standings/getEventStandings';

function getDailyCarouselPicks(count: number): number[] {
  const today = new Date();
  let seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

  const photos = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = photos.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    const j = Math.abs(seed) % (i + 1);
    [photos[i], photos[j]] = [photos[j], photos[i]];
  }

  return photos.slice(0, count);
}

export default async function Home() {
  const events: Event[] = await getUpcomingEvents(3);
  const carouselPicks = getDailyCarouselPicks(events.length);

  const standingsByEvent = await Promise.all(
    events.map((e) => getEventStandings(e.id).catch(() => [] as StandingRow[]))
  );

  return (
    <main className="bg-[--color-white] text-[--color-black]">

      {/* Upcoming leagues section */}
      <section className="container mx-auto px-4 py-10 space-y-10">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <p className="text-xl font-filson-regular">There isn't any active league at the moment.</p>
          </div>
        ) : (
          events.map((event, idx) => {
            const isReverse = idx % 2 === 1;
            const photoNum = carouselPicks[idx];

            return (
              <div
                key={event.id}
                className={`flex flex-col lg:flex-row gap-6 ${isReverse ? 'lg:flex-row-reverse' : ''}`}
              >
                <div className="flex-1 rounded-2xl overflow-hidden min-h-75">
                  <picture>
                    <source
                      media="(max-width: 768px)"
                      srcSet={`/images/carousel/mobile/MourePremier-Carousel-Mobile-${photoNum}.webp`}
                    />
                    <img
                      src={`/images/carousel/desktop/MourePremier-Carousel-${photoNum}.webp`}
                      alt={`${event.name} – Moure Premier Soccer League`}
                      className="w-full h-full object-cover"
                    />
                  </picture>
                </div>
                <div className="w-full lg:w-105 shrink-0">
                  <UpcomingMatches event={event} compact />
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Tables */}
      {events.length > 0 && (
        <section className="container mx-auto px-4 pb-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event, idx) => (
              <StandingsCard
                key={event.id}
                event={event}
                standings={standingsByEvent[idx]}
              />
            ))}
          </div>
        </section>
      )}

    </main>
  );
}
