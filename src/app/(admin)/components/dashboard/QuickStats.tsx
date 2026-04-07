'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { ApexOptions } from 'apexcharts';
import { useTheme } from '@mui/material/styles';
import { CardContent, Typography, Stack, Box, Grid } from '@mui/material';
import BlankCard from '@/app/(admin)/components/shared/BlankCard';
import { getDashboardSummary, type DashboardSummary } from '@/services/dashboard';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function QuickStats() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const theme = useTheme();

  useEffect(() => {
    getDashboardSummary().then(setData).catch(console.error);
  }, []);

  const playedMatches = data?.playedMatches ?? 0;
  const pendingMatches = data?.pendingMatches ?? 0;

  const chartOptions: ApexOptions = {
    chart: {
      type: 'donut',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      toolbar: { show: false },
    },
    labels: ['Played', 'Pending'],
    colors: [theme.palette.success.main, theme.palette.warning.main],
    stroke: { width: 0 },
    legend: { position: 'bottom' },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
        },
      },
    },
  };

  return (
    <BlankCard>
      <CardContent>
        <Typography variant="h5" mb={2}>
          Quick Stats
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: '#eef4ff',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Teams
                </Typography>
                <Typography variant="h5">{data?.totalTeams ?? 0}</Typography>
              </Box>

              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: '#e8f7ef',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Fields
                </Typography>
                <Typography variant="h5">{data?.totalFields ?? 0}</Typography>
              </Box>

              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: '#fff4e5',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Events
                </Typography>
                <Typography variant="h5">{data?.totalEvents ?? 0}</Typography>
              </Box>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary" mb={1}>
              Match Status
            </Typography>
            <Chart
              type="donut"
              options={chartOptions}
              series={[playedMatches, pendingMatches]}
              height={220}
            />
            <Typography variant="body2" color="text.secondary">
              Total Matches: <strong>{data?.totalMatches ?? 0}</strong>
            </Typography>
          </Grid>
        </Grid>

        <Stack direction="row" spacing={2} mt={2} flexWrap="wrap" useFlexGap>
          <Typography variant="body2">Played: {playedMatches}</Typography>
          <Typography variant="body2">Pending: {pendingMatches}</Typography>
        </Stack>
      </CardContent>
    </BlankCard>
  );
}
