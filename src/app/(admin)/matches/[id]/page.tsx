import { Box, Button, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import MatchRefereesSection from '@/app/(admin)/components/matches/MatchesRefereesSection';
import { match } from 'assert/strict';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function MatchDetailPage({ params }: Props) {
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
        <Link href="/matches" >
          <Button variant="text" sx={{ px: 0, mb: 1 }}>
            ← Back to matches
          </Button>
        </Link>


        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Match Detail
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Match ID: {matchId}
            </Typography>
          </Box>
          <Link href={`/matches/${matchId}/check-in`}>
            <Button variant="contained" color='success'>
              Go to Check-In
            </Button>
          </Link>
        </Stack>

      </Box>

      <MatchRefereesSection matchId={matchId} />
    </Stack>
  );
}