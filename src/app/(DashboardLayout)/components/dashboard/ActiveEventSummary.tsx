'use client';

import { useEffect, useState } from 'react';
import { CardContent, Typography, Stack, Chip, LinearProgress, Box } from '@mui/material';
import BlankCard from '@/app/(DashboardLayout)/components/shared/BlankCard';
import {
  getActiveEventSummary,
  type ActiveEventSummary as ActiveEventSummaryType,
} from '@/services/dashboard';

function formatLabel(value: string | null): string {
  if (!value) return '-';
  return value
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

export default function ActiveEventSummary() {
  const [data, setData] = useState<ActiveEventSummaryType | null>(null);

  useEffect(() => {
    getActiveEventSummary().then(setData).catch(console.error);
  }, []);

  const completion =
    data && data.totalMatches > 0
      ? Math.round((data.playedMatches / data.totalMatches) * 100)
      : 0;

  return (
    <BlankCard>
      <CardContent>
        <Typography variant="h5" mb={2}>
          Active Event
        </Typography>

        {!data && (
          <Typography variant="body2" color="text.secondary">
            No events available yet.
          </Typography>
        )}

        {data && (
          <Stack spacing={1.5}>
            <Typography variant="subtitle1" fontWeight={700}>
              {data.name}
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" label={formatLabel(data.status)} color="primary" />
              <Chip size="small" label={formatLabel(data.format_type)} variant="outlined" />
            </Stack>

            <Typography variant="body2" color="text.secondary">
              Start: {data.start_date}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              End: {data.end_date ?? 'TBD'}
            </Typography>

            <Box pt={0.5}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                mb={0.5}
              >
                <Typography variant="body2" color="text.secondary">
                  Progress
                </Typography>
                <Typography variant="body2" fontWeight={700}>
                  {completion}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={completion}
                sx={{
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: '#eef3f8',
                }}
              />
            </Box>
          </Stack>
        )}
      </CardContent>
    </BlankCard>
  );
}
