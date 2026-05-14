import Link from 'next/link';
import { Box, Button, Stack, Typography } from '@mui/material';
import MatchCheckInSection from '@/app/(admin)/components/check-in/MatchCheckInSection';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function RefereeMatchCheckInPage({ params }: Props) {
  const { id } = await params;
  const matchId = Number(id);

  if (Number.isNaN(matchId)) {
    return (
      <Box>
        <Typography variant="h6">Invalid match id.</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Button component={Link} href="/referee/matches" variant="text" sx={{ px: 0, mb: 1 }}>
          Back to my matches
        </Button>

        <Typography variant="h4" fontWeight={800}>
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
