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
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

export default function GeneratePlayoffsButton({ eventId, onGenerated, onSuccess, onError }: Props) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    try {
      setLoading(true);

      const validation = await canGeneratePlayoffs(eventId);

      if (!validation.canGenerate) {
        onError?.(validation.reason ?? 'Playoffs cannot be generated yet.');
        return;
      }

      const confirmed = window.confirm(
        'Are you sure you want to generate playoff matches for this event?'
      );

      if (!confirmed) return;

      await generateKnockoutMatches(eventId);
      await onGenerated();
      onSuccess?.('Playoff matches generated successfully');
    } catch (error) {
      console.error(error);
      onError?.(
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
