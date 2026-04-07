'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
import { supabase } from '@/lib/supabaseClient';
import type { Referee } from '@/models/referee';
import { getRefereeFullName } from '@/models/referee';

type MatchRefereeRow = {
  id: number;
  referee_id: number;
  role: string | null;
  referee: Referee | null;
};

type Props = {
  matchId: number;
};

export default function MatchRefereesSection({ matchId }: Props) {

  const [rows, setRows] = useState<MatchRefereeRow[]>([]);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [selectedRefereeId, setSelectedRefereeId] = useState('');
  const [role, setRole] = useState('main_referee');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);

    const [matchRefereesRes, refereesRes] = await Promise.all([
      supabase
        .from('match_referees')
        .select(`
          id,
          referee_id,
          role,
          referee:referees (
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
        .eq('match_id', matchId)
        .order('id', { ascending: true }),

      supabase
        .from('referees')
        .select('*')
        .eq('status', 'active')
        .order('first_name', { ascending: true }),
    ]);

    if (!matchRefereesRes.error && matchRefereesRes.data) {
      setRows(
        matchRefereesRes.data.map((row: any) => ({
          ...row,
          referee: Array.isArray(row.referee) ? row.referee[0] ?? null : row.referee ?? null,
        }))
      );
    }

    if (!refereesRes.error && refereesRes.data) {
      setReferees(refereesRes.data as Referee[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [matchId]);

  const handleAdd = async () => {
    if (!selectedRefereeId) return;

    setSaving(true);

    const { error } = await supabase.from('match_referees').insert({
      match_id: matchId,
      referee_id: Number(selectedRefereeId),
      role,
    });

    if (!error) {
      setSelectedRefereeId('');
      setRole('main_referee');
      await loadData();
    }

    setSaving(false);
  };

  const handleRemove = async (id: number) => {
    const confirmed = window.confirm('Remove this referee from the match?');
    if (!confirmed) return;

    const { error } = await supabase
      .from('match_referees')
      .delete()
      .eq('id', id);

    if (!error) {
      await loadData();
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h6">Referees</Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            select
            label="Referee"
            value={selectedRefereeId}
            onChange={(e) => setSelectedRefereeId(e.target.value)}
            sx={{ minWidth: 350 }}
          >
            {referees.map((referee) => (
              <MenuItem key={referee.id} value={referee.id}>
                {getRefereeFullName(referee)}
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
            <MenuItem value="main_referee">Main Referee</MenuItem>
            <MenuItem value="assistant_referee">Assistant Referee</MenuItem>
            <MenuItem value="fourth_official">Fourth Official</MenuItem>
          </TextField>

          <Button variant="contained" onClick={handleAdd} disabled={saving}>
            Add Referee
          </Button>
        </Stack>

        {loading ? (
          <Typography>Loading referees...</Typography>
        ) : rows.length === 0 ? (
          <Typography color="text.secondary">
            No referees assigned to this match yet.
          </Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Referee</TableCell>
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
                    {row.referee ? (
                      <Link
                        href={`/referees/${row.referee.id}`}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{
                            cursor: 'pointer',
                            '&:hover': { textDecoration: 'underline' },
                          }}
                        >
                          {getRefereeFullName(row.referee)}
                        </Typography>
                      </Link>
                    ) : (
                      '-'
                    )}
                  </TableCell>

                  <TableCell>{row.referee?.email ?? '-'}</TableCell>
                  <TableCell>{row.referee?.phone ?? '-'}</TableCell>
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