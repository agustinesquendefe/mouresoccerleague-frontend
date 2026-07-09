'use client';

import { useState } from 'react';
import { Button } from '@mui/material';
import { generateRoundRobinMatches } from '@/services/matches/generateRoundRobinMatches';
import { generateGroupStageMatches } from '@/services/matches/generateGroupStageMatches';
import type { EventFormatType } from '@/models/event';

type Props = {
  eventId: number;
  eventFormat?: EventFormatType | string | null;
  onGenerated: () => Promise<void> | void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

export default function GenerateFixtureButton({ eventId, eventFormat, onGenerated, onSuccess, onError }: Props) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to generate the fixture for this event?'
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      if (eventFormat === 'groups') {
        await generateGroupStageMatches(eventId);
      } else {
        await generateRoundRobinMatches(eventId);
      }
      await onGenerated();
      onSuccess?.('Fixture generated successfully');
    } catch (error) {
      console.error(error);
      onError?.(error instanceof Error ? error.message : 'Failed to generate fixture');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="contained" onClick={handleGenerate} disabled={loading}>
      {loading ? 'Generating...' : 'Generate Fixture'}
    </Button>
  );
}
