'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import type { Coach } from '@/models/coach';
import { getCoachFullName } from '@/models/coach';
import { supabase } from '@/lib/supabaseClient';

type TeamCoachRow = {
  id: number;
  coach_id: number;
  role: string | null;
  coach: Coach | null;
};

type Props = {
  teamId: number;
};


export default function TeamCoachesSection({ teamId }: Props) {

  const [rows, setRows] = useState<TeamCoachRow[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState('');
  const [role, setRole] = useState('head_coach');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);

    try {
      const [teamCoachesRes, coachesRes] = await Promise.all([
        supabase
          .from('team_coaches')
          .select(`
            id,
            coach_id,
            role,
            coach:coaches (
              id,
              first_name,
              last_name,
              email,
              phone,
              status,
              created_at,
              updated_at
            )
          `)
          .eq('team_id', teamId)
          .order('id', { ascending: true }),

        supabase
          .from('coaches')
          .select('*')
          .eq('status', 'active')
          .order('first_name', { ascending: true }),
      ]);

      if (!teamCoachesRes.error && teamCoachesRes.data) {
        setRows(
            teamCoachesRes.data.map((row: any) => ({
                ...row,
                coach: Array.isArray(row.coach) ? row.coach[0] ?? null : row.coach ?? null,
            }))
        );
      }

      if (!coachesRes.error && coachesRes.data) {
        setCoaches(coachesRes.data as Coach[]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [teamId]);

  const handleAdd = async () => {
    if (!selectedCoachId) return;

    setSaving(true);

    const { error } = await supabase.from('team_coaches').insert({
      team_id: teamId,
      coach_id: Number(selectedCoachId),
      role,
    });

    if (!error) {
      setSelectedCoachId('');
      setRole('head_coach');
      await loadData();
    }

    setSaving(false);
  };

  const handleRemove = async (id: number) => {
    const confirmed = window.confirm('Remove this coach from the team?');
    if (!confirmed) return;

    const { error } = await supabase.from('team_coaches').delete().eq('id', id);

    if (!error) {
      await loadData();
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Coaches</Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            select
            label="Coach"
            value={selectedCoachId}
            onChange={(e) => setSelectedCoachId(e.target.value)}
            sx={{ minWidth: 330 }}
          >
            {coaches.map((coach) => (
              <MenuItem key={coach.id} value={coach.id}>
                {getCoachFullName(coach)}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="head_coach">Head Coach</MenuItem>
            <MenuItem value="assistant_coach">Assistant Coach</MenuItem>
          </TextField>
          

          <Button variant="contained" onClick={handleAdd} disabled={saving} size='small'>
            Add Coach
          </Button>
        </Stack>

        {loading ? (
          <Typography>Loading coaches...</Typography>
        ) : rows.length === 0 ? (
          <Typography color="text.secondary">
            No coaches assigned to this team yet.
          </Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Coach</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Role</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    {row.coach ? getCoachFullName(row.coach) : '-'}
                  </TableCell>
                  <TableCell>{row.coach?.email ?? '-'}</TableCell>
                  <TableCell>{row.coach?.phone ?? '-'}</TableCell>
                  <TableCell>{row.role ?? '-'}</TableCell>
                  <TableCell align="right">
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => handleRemove(row.id)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Stack>
    </Paper>
  );
}