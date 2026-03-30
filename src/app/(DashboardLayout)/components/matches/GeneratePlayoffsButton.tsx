'use client';

import { useState } from 'react';
import { Button } from '@mui/material';
import {
  canGeneratePlayoffs,
  generateKnockoutMatches,
} from '@/services/matches';

type Props = {
  eventId: number;
  onGenerated: () => Promise<void> | void;
};

export default function GeneratePlayoffsButton({ eventId, onGenerated }: Props) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    try {
      setLoading(true);

      const validation = await canGeneratePlayoffs(eventId);

      if (!validation.canGenerate) {
        alert(validation.reason ?? 'Playoffs cannot be generated yet.');
        return;
      }

      const confirmed = window.confirm(
        'Are you sure you want to generate playoff matches for this event?'
      );

      if (!confirmed) return;

      await generateKnockoutMatches(eventId);
      await onGenerated();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : 'Failed to generate playoffs'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="contained"
      color="secondary"
      onClick={handleGenerate}
      disabled={loading}
    >
      {loading ? 'Generating...' : 'Generate Playoffs'}
    </Button>
  );
}