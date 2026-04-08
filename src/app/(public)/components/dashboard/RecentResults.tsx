"use client";

import { useEffect, useState } from 'react';
import { CardContent, Typography, Stack, Divider, Card } from '@mui/material';
import { getRecentResults, RecentResultRow } from '@/services/dashboard/getRecentResults';

export default function RecentResults() {
  const [results, setResults] = useState<RecentResultRow[]>([]);

  useEffect(() => {
    getRecentResults().then(setResults).catch(console.error);
  }, []);

  return (
    <Card sx={{ mb: 4, borderRadius: 3, boxShadow: 3 }}>
      <CardContent>
        <Typography variant="h5" mb={2} color="primary">
          Resultados Recientes
        </Typography>
        <Stack spacing={2}>
          {results.map((item, index) => (
            <div key={item.id}>
              <Typography variant="subtitle2">
                {item.team1_name} {item.score1 ?? '-'} - {item.score2 ?? '-'} {item.team2_name}
              </Typography>
              {item.penalty_score1 !== null && item.penalty_score2 !== null && (
                <Typography variant="body2" color="text.secondary">
                  Penales: {item.penalty_score1} - {item.penalty_score2}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {item.bracket_round
                  ? item.bracket_round
                  : item.round_number
                  ? `Ronda ${item.round_number}`
                  : item.date ?? '-'}
              </Typography>
              {index < results.length - 1 && <Divider sx={{ my: 1 }} />}
            </div>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
