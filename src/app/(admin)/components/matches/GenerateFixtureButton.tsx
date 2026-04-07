'use client';

import { useState } from 'react';
import { Button } from '@mui/material';
import { generateRoundRobinMatches } from '@/services/matches/generateRoundRobinMatches';

type Props = {
  eventId: number;
  onGenerated: () => Promise<void> | void;
};

export default function GenerateFixtureButton({ eventId, onGenerated }: Props) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to generate the fixture for this event?'
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      await generateRoundRobinMatches(eventId);
      await onGenerated();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Failed to generate fixture');
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