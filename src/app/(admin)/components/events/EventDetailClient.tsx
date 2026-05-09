'use client';

import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import EventTeamsSection from './EventTeamsSection';
import EventFieldsSection from './EventFieldsSection';
import EventMatchesSection from '../matches/EventMatchesSection';
import EventStandingsSection from '../standings/EventStandingsSection';
import EventGroupsSection from './EventGroupsSection';
import EventMembershipsSection from './EventMembershipsSection';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  eventId: number;
};

export default function EventDetailClient({ eventId }: Props) {
  const [standingsRefreshKey, setStandingsRefreshKey] = useState(0);
  const [formatType, setFormatType] = useState<string | null>(null);
  const [matchFormat, setMatchFormat] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('events')
      .select('format_type, match_format')
      .eq('id', eventId)
      .single()
      .then(({ data }) => {
        setFormatType(data?.format_type ?? null);
        setMatchFormat(data?.match_format ?? null);
      });
  }, [eventId]);

  const handleMatchUpdated = () => {
    setStandingsRefreshKey((prev) => prev + 1);
  };

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        display: 'grid',
        gap: 3,
        overflowX: 'hidden',
      }}
    >
      <h2>Event Detail</h2>

      <EventTeamsSection eventId={eventId} />
      <EventMembershipsSection eventId={eventId} />
      <EventFieldsSection eventId={eventId} eventFormat={matchFormat ?? undefined} />

      {formatType === 'groups' && <EventGroupsSection eventId={eventId} />}

      <EventMatchesSection
        eventId={eventId}
        onMatchUpdated={handleMatchUpdated}
      />
      <EventStandingsSection
        eventId={eventId}
        refreshKey={standingsRefreshKey}
      />
    </Box>
  );
}
