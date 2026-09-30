'use client';

import { useState } from 'react';
import { Button } from '@mui/material';
import { generateRoundRobinMatches } from '@/services/matches/generateRoundRobinMatches';
import { generateGroupStageMatches } from '@/services/matches/generateGroupStageMatches';
import type { EventFormatType } from '@/models/event';

type Props = {
  eventId: number;
  eventFormat?: EventFormatType | string | null;
  onCompacted: () => Promise<void> | void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

export default function CompactFixtureButton({
  eventId,
  eventFormat,
  onCompacted,
  onSuccess,
  onError,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleCompact = async () => {
    try {
      setLoading(true);
      const confirmed = window.confirm(
        'Rebalance all pending rounds? Played, in-progress, and extra matches will not be changed. Scheduled matches may move to another round or date.'
      );
      if (!confirmed) return;

      if (eventFormat === 'groups') {
        await generateGroupStageMatches(eventId);
      } else {
        await generateRoundRobinMatches(eventId);
      }
      await onCompacted();
      onSuccess?.('Pending rounds rebalanced successfully.');
    } catch (error) {
      console.error(error);
      onError?.(error instanceof Error ? error.message : 'Failed to compact future rounds');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outlined" onClick={handleCompact} disabled={loading}>
      {loading ? 'Balancing...' : 'Compact Future Rounds'}
    </Button>
  );
}
