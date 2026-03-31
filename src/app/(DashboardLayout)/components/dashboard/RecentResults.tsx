'use client';

import { useEffect, useState } from 'react';
import { CardContent, Typography, Stack, Divider } from '@mui/material';
import BlankCard from '@/app/(DashboardLayout)/components/shared/BlankCard';
import { getRecentResults, type RecentResultRow } from '@/services/dashboard';

export default function RecentResults() {
  const [results, setResults] = useState<RecentResultRow[]>([]);

  useEffect(() => {
    getRecentResults().then(setResults).catch(console.error);
  }, []);

  return (
    <BlankCard>
      <CardContent>
        <Typography variant="h5" mb={2}>
          Recent Results
        </Typography>

        <Stack spacing={2}>
          {results.map((item, index) => (
            <div key={item.id}>
              <Typography variant="subtitle2">
                {item.team1_name} {item.score1 ?? '-'} - {item.score2 ?? '-'} {item.team2_name}
              </Typography>

              {item.penalty_score1 !== null && item.penalty_score2 !== null && (
                <Typography variant="body2" color="text.secondary">
                  Penalties: {item.penalty_score1} - {item.penalty_score2}
                </Typography>
              )}

              <Typography variant="caption" color="text.secondary">
                {item.bracket_round
                  ? item.bracket_round
                  : item.round_number
                  ? `Round ${item.round_number}`
                  : item.date ?? '-'}
              </Typography>

              {index < results.length - 1 && <Divider sx={{ mt: 1 }} />}
            </div>
          ))}
        </Stack>
      </CardContent>
    </BlankCard>
  );
}