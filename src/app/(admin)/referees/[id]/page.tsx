import { Box, Button, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import MatchRefereesSection from '../../components/matches/MatchesRefereesSection';

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
        <Button component={Link} href="/matches" variant="text" sx={{ px: 0, mb: 1 }}>
          ← Back to matches
        </Button>

        <Typography variant="h4" fontWeight={700}>
          Match Detail
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Match ID: {matchId}
        </Typography>
      </Box>

      <MatchRefereesSection matchId={matchId} />
    </Stack>
  );
}