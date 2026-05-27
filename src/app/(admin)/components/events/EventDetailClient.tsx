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
import { getAppSettings } from '@/services/settings/settings.service';
import type { AppSettings } from '@/models/appSettings';

type Props = {
  eventId: number;
};

export default function EventDetailClient({ eventId }: Props) {
  const [standingsRefreshKey, setStandingsRefreshKey] = useState(0);
  const [formatType, setFormatType] = useState<string | null>(null);
  const [matchFormat, setMatchFormat] = useState<string | null>(null);
  const [eventName, setEventName] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    Promise.all([
      supabase
        .from('events')
        .select('name, format_type, match_format')
        .eq('id', eventId)
        .single(),
      getAppSettings(),
    ]).then(([eventResult, appSettings]) => {
      const data = eventResult.data;
      setEventName(data?.name ?? null);
      setFormatType(data?.format_type ?? null);
      setMatchFormat(data?.match_format ?? null);
      setSettings(appSettings);
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
        eventName={eventName ?? `Event #${eventId}`}
        printCompany={settings}
        onMatchUpdated={handleMatchUpdated}
      />
      <EventStandingsSection
        eventId={eventId}
        eventName={eventName ?? `Event #${eventId}`}
        printCompany={settings}
        refreshKey={standingsRefreshKey}
      />
    </Box>
  );
}
