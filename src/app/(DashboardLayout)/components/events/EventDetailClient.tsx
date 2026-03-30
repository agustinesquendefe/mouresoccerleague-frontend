'use client';

import { useState } from 'react';
import EventTeamsSection from '../../components/events/EventTeamsSection';
import EventFieldsSection from '../../components/events/EventFieldsSection';
import EventMatchesSection from '../../components/matches/EventMatchesSection';
import EventStandingsSection from '../../components/standings/EventStandingsSection';

type Props = {
  eventId: number;
};

export default function EventDetailClient({ eventId }: Props) {
  const [standingsRefreshKey, setStandingsRefreshKey] = useState(0);

  const handleMatchUpdated = () => {
    setStandingsRefreshKey((prev) => prev + 1);
  };

  return (
    <div style={{ padding: 20, display: 'grid', gap: 24 }}>
      <h2>Event Detail</h2>

      <EventTeamsSection eventId={eventId} />
      <EventFieldsSection eventId={eventId} />
      <EventMatchesSection
        eventId={eventId}
        onMatchUpdated={handleMatchUpdated}
      />
      <EventStandingsSection
        eventId={eventId}
        refreshKey={standingsRefreshKey}
      />
    </div>
  );
}