import { Box, Button, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import MatchCheckInSection from '@/app/(DashboardLayout)/components/check-in/MatchCheckInSection';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function MatchCheckInPage({ params }: Props) {
  const { id } = await params;
  const matchId = Number(id);

  if (Number.isNaN(matchId)) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">Invalid match id.</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={3} sx={{ p: 3 }}>
      <Box>
        <Link href={`/matches/${matchId}`} passHref>
            <Button variant="text" sx={{ px: 0, mb: 1 }}>
               ← Back to match
            </Button>
        </Link>

        <Typography variant="h4" fontWeight={700}>
          Match Check-In
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Match ID: {matchId}
        </Typography>
      </Box>

      <MatchCheckInSection matchId={matchId} />
    </Stack>
  );
}