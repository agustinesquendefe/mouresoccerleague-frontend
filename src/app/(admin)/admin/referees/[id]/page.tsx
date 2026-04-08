import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { IconChevronLeft } from '@tabler/icons-react';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function RefereeDetailPage({ params }: Props) {
  const { id } = await params;
  const refereeId = Number(id);

  if (Number.isNaN(refereeId)) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">Invalid referee id.</Typography>
      </Box>
    );
  }

  const { data: referee } = await supabase
    .from('referees')
    .select('*')
    .eq('id', refereeId)
    .single();

  const { data: matchReferees } = await supabase
    .from('match_referees')
    .select('id, role, match_id, matches(id, date, time, team1_id, team2_id, status)')
    .eq('referee_id', refereeId)
    .order('id', { ascending: false });

  return (
    <Stack spacing={3} sx={{ p: 3 }}>
      <Box>
        <Link href="/admin/referees" passHref>
          <Button variant="text" sx={{ px: 0, mb: 1 }}>
            <IconChevronLeft size={15} /> Back to referees
          </Button>
        </Link>
        <Typography variant="h4" fontWeight={700}>Referee Detail</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Referee ID: {refereeId}
        </Typography>
      </Box>

      {referee && (
        <Paper sx={{ p: 3 }}>
          <Stack spacing={1}>
            <Typography variant="h6" fontWeight={700}>{referee.first_name} {referee.last_name}</Typography>
            <Typography variant="body2">Email: {referee.email ?? '-'}</Typography>
            <Typography variant="body2">Phone: {referee.phone ?? '-'}</Typography>
            <Typography variant="body2">Status: {referee.status ?? '-'}</Typography>
          </Stack>
        </Paper>
      )}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Assigned Matches</Typography>
        {!matchReferees || matchReferees.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No matches assigned.</Typography>
        ) : (
          <Stack spacing={1}>
            {matchReferees.map((mr: any) => (
              <Stack key={mr.id} direction="row" spacing={2} alignItems="center">
                <Link href={`/admin/matches/${mr.match_id}`} style={{ textDecoration: 'none' }}>
                  <Typography variant="body2" fontWeight={600} sx={{ '&:hover': { textDecoration: 'underline' } }}>
                    Match #{mr.match_id}
                    {mr.matches?.date ? ` — ${mr.matches.date}` : ''}
                    {mr.matches?.time ? ` ${mr.matches.time.slice(0, 5)}` : ''}
                  </Typography>
                </Link>
                {mr.role && (
                  <Typography variant="caption" color="text.secondary">{mr.role}</Typography>
                )}
              </Stack>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}