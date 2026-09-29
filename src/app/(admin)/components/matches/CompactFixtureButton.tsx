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
        onSuccess?.('There are no editable extended rounds to redistribute.');
        return;
      }

      const confirmed = window.confirm(
        `Redistribute ${preview.matchesToMove} scheduled match${preview.matchesToMove === 1 ? '' : 'es'} ` +
        `from the extended rounds? The fixture will be reduced from round ${preview.roundsBefore} ` +
        `to round ${preview.roundsAfter}. Played, in-progress, extra, and past matches will not be changed.`
      );
      if (!confirmed) return;

      const result = await compactFutureFixture(eventId);
      await onCompacted();
      onSuccess?.(
        `Future fixture compacted: ${result.matchesToMove} match${result.matchesToMove === 1 ? '' : 'es'} ` +
        `redistributed and ${result.roundsRemoved} round${result.roundsRemoved === 1 ? '' : 's'} removed.`
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
