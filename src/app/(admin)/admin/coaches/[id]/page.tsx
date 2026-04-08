import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { IconChevronLeft } from '@tabler/icons-react';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CoachDetailPage({ params }: Props) {
  const { id } = await params;
  const coachId = Number(id);

  if (Number.isNaN(coachId)) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">Invalid coach id.</Typography>
      </Box>
    );
  }

  const { data: coach } = await supabase
    .from('coaches')
    .select('*')
    .eq('id', coachId)
    .single();

  const { data: teamCoaches } = await supabase
    .from('team_coaches')
    .select('id, team_id, role, teams(id, name)')
    .eq('coach_id', coachId)
    .order('id', { ascending: true });

  return (
    <Stack spacing={3} sx={{ p: 3 }}>
      <Box>
        <Link href="/admin/coaches" passHref>
          <Button variant="text" sx={{ px: 0, mb: 1 }}>
            <IconChevronLeft size={15} /> Back to coaches
          </Button>
        </Link>
        <Typography variant="h4" fontWeight={700}>Coach Detail</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Coach ID: {coachId}
        </Typography>
      </Box>

      {coach && (
        <Paper sx={{ p: 3 }}>
          <Stack spacing={1}>
            <Typography variant="h6" fontWeight={700}>{coach.first_name} {coach.last_name}</Typography>
            <Typography variant="body2">Email: {coach.email ?? '-'}</Typography>
            <Typography variant="body2">Phone: {coach.phone ?? '-'}</Typography>
            <Typography variant="body2">Status: {coach.status ?? '-'}</Typography>
          </Stack>
        </Paper>
      )}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Teams</Typography>
        {!teamCoaches || teamCoaches.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No teams assigned.</Typography>
        ) : (
          <Stack spacing={1}>
            {teamCoaches.map((tc: any) => (
              <Stack key={tc.id} direction="row" spacing={2} alignItems="center">
                <Typography variant="body2" fontWeight={600}>
                  {tc.teams?.name ?? `#${tc.team_id}`}
                </Typography>
                {tc.role && (
                  <Typography variant="caption" color="text.secondary">{tc.role}</Typography>
                )}
              </Stack>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}
