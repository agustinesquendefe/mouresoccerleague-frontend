'use client';

import { useState } from 'react';
import { Button } from '@mui/material';
import { advanceKnockoutRound } from '@/services/matches';

type Props = {
  eventId: number;
  onGenerated: () => Promise<void> | void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

export default function AdvanceKnockoutRoundButton({
  eventId,
  onGenerated,
  onSuccess,
  onError,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleAdvance = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to generate the next knockout round?'
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      await advanceKnockoutRound(eventId);
      await onGenerated();
      onSuccess?.('Next knockout round generated successfully');
    } catch (error) {
      console.error(error);
      onError?.(
        error instanceof Error
          ? error.message
          : 'Failed to generate the next knockout round'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="contained"
      color="warning"
      onClick={handleAdvance}
      disabled={loading}
    >
      {loading ? 'Generating...' : 'Advance Knockout Round'}
    </Button>
  );
}
