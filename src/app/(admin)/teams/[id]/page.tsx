import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import TeamPlayersSection from '../../components/teams/TeamPlayersSection';
import TeamCoachesSection from '../../components/teams/TeamCoachesSection';
import { IconChevronLeft } from '@tabler/icons-react';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TeamDetailPage({ params }: Props) {
  const { id } = await params;
  const teamId = Number(id);

  if (Number.isNaN(teamId)) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">Invalid team id.</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={3} sx={{ p: 3 }}>
      <Box>
        <Link href="/teams" passHref>
          <Button variant="text" sx={{ px: 0, mb: 1 }}>
            <IconChevronLeft size={15} className="me-2"/> Back to teams
          </Button>
        </Link>

        <Typography variant="h4" fontWeight={700}>
          Team Detail
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Team ID: {teamId}
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Players
        </Typography>
        <TeamPlayersSection teamId={teamId} />
      </Paper>

      <TeamCoachesSection teamId={teamId} />
    </Stack>
  );
}