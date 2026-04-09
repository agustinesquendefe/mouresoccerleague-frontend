'use client';

import { useEffect, useState } from 'react';
import EventTeamsSection from './EventTeamsSection';
import EventFieldsSection from './EventFieldsSection';
import EventMatchesSection from '../matches/EventMatchesSection';
import EventStandingsSection from '../standings/EventStandingsSection';
import EventGroupsSection from './EventGroupsSection';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  eventId: number;
};

export default function EventDetailClient({ eventId }: Props) {
  const [standingsRefreshKey, setStandingsRefreshKey] = useState(0);
  const [formatType, setFormatType] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('events')
      .select('format_type')
      .eq('id', eventId)
      .single()
      .then(({ data }) => setFormatType(data?.format_type ?? null));
  }, [eventId]);

  const handleMatchUpdated = () => {
    setStandingsRefreshKey((prev) => prev + 1);
  };

  return (
    <div style={{ padding: 20, display: 'grid', gap: 24 }}>
      <h2>Event Detail</h2>

      <EventTeamsSection eventId={eventId} />
      <EventFieldsSection eventId={eventId} />

      {formatType === 'groups' && <EventGroupsSection eventId={eventId} />}

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