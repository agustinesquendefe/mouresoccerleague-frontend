'use client';

import { Grid, Box } from '@mui/material';
import PageContainer from '@/app/(admin)/components/container/PageContainer';

import CompetitionOverview from '@/app/(admin)/components/dashboard/CompetitionOverview';
import ActiveEventSummary from '@/app/(admin)/components/dashboard/ActiveEventSummary';
import QuickStats from '@/app/(admin)/components/dashboard/QuickStats';
import RecentResults from '@/app/(admin)/components/dashboard/RecentResults';
import StandingsSnapshot from '@/app/(admin)/components/dashboard/StandingsSnapshot';
import UpcomingMatches from '@/app/(admin)/components/dashboard/UpcomingMatches';

const Dashboard = () => {
  return (
    <PageContainer title="Dashboard" description="League admin dashboard">
      <Box>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <CompetitionOverview />
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Grid container spacing={3}>
              <Grid size={12}>
                <ActiveEventSummary />
              </Grid>
              <Grid size={12}>
                <QuickStats />
              </Grid>
            </Grid>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <RecentResults />
          </Grid>

          <Grid size={{ xs: 12, lg: 8 }}>
            <StandingsSnapshot />
          </Grid>

          <Grid size={12}>
            <UpcomingMatches />
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default Dashboard;