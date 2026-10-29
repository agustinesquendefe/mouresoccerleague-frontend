'use client';

import { useState } from 'react';
import { Button } from '@mui/material';
import {
  compactFutureFixture,
  previewFutureFixtureCompaction,
} from '@/services/matches/compactFutureFixture';

type Props = {
  eventId: number;
  onCompacted: () => Promise<void> | void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

export default function CompactFixtureButton({
  eventId,
  onCompacted,
  onSuccess,
  onError,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleCompact = async () => {
    try {
      setLoading(true);
      const preview = await previewFutureFixtureCompaction(eventId);
      if (preview.matchesToMove === 0) {
        onSuccess?.(`The active fixture already fits within its ${preview.expectedRoundCount} configured rounds.`);
        return;
      }

      const confirmed = window.confirm(
        `Move ${preview.matchesToMove} scheduled match${preview.matchesToMove === 1 ? '' : 'es'} ` +
        `into rounds 1–${preview.expectedRoundCount}? Played, in-progress, extra matches, dates, ` +
        `scores, referees, and payments will not change.`
      );
      if (!confirmed) return;

      const result = await compactFutureFixture(eventId);
      await onCompacted();
      onSuccess?.(
        `Future rounds compacted: ${result.matchesToMove} scheduled match${result.matchesToMove === 1 ? '' : 'es'} moved. ` +
        `The active fixture now ends at round ${result.roundsAfter}.`
      );
    } catch (error) {
      console.error(error);
      onError?.(error instanceof Error ? error.message : 'Failed to compact future rounds');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outlined" onClick={handleCompact} disabled={loading}>
      {loading ? 'Checking...' : 'Compact Future Rounds'}
    </Button>
  );
}
