'use client';

import { useEffect, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import RefereesTable from '@/app/(admin)/components/referees/RefereesTable';
import RefereeFormDialog from '@/app/(admin)/components/referees/RefereeFormDialog';
import { supabase } from '@/lib/supabaseClient';
import type { Referee } from '@/models/referee';

type RefereeFormValues = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
};

async function ensurePortalAuthUser(
  values: RefereeFormValues,
  role: 'coach' | 'referee',
  current?: Referee | null
) {
  const email = values.email.trim().toLowerCase();
  if (!email) return { auth_user_id: current?.auth_user_id ?? null };

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('An administrative session is required to provision portal access.');

  const response = await fetch('/api/portal/auth-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      email,
      firstName: values.first_name,
      lastName: values.last_name,
      role,
      authUserId: current?.auth_user_id ?? null,
      previousEmail: current?.email ?? null,
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Unable to create portal auth user.');
  }

  return payload as { auth_user_id: string | null };
}

export default function RefereesPage() {

  const [referees, setReferees] = useState<Referee[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReferee, setSelectedReferee] = useState<Referee | null>(null);
  const [saving, setSaving] = useState(false);

  const loadReferees = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('referees')
      .select('*')
      .order('id', { ascending: true });

    if (!error && data) {
      setReferees(data as Referee[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadReferees();
  }, []);

  const handleCreate = () => {
    setSelectedReferee(null);
    setDialogOpen(true);
  };

  const handleEdit = (referee: Referee) => {
    setSelectedReferee(referee);
    setDialogOpen(true);
  };

  const handleDelete = async (referee: Referee) => {
    const { error } = await supabase.from('referees').delete().eq('id', referee.id);

    if (!error) {
      await loadReferees();
    }
  };

  const handleSubmit = async (values: RefereeFormValues) => {
    try {
      setSaving(true);
      const authResult = await ensurePortalAuthUser(values, 'referee', selectedReferee);
      const savedValues = {
        ...values,
        email: values.email.trim().toLowerCase(),
        auth_user_id: authResult.auth_user_id,
      };

      if (selectedReferee) {
        const { error } = await supabase
          .from('referees')
          .update(savedValues)
          .eq('id', selectedReferee.id);

        if (error) throw new Error(error.message);

        setDialogOpen(false);
        setSelectedReferee(null);
        await loadReferees();
      } else {
        const { error } = await supabase.from('referees').insert(savedValues);

        if (error) throw new Error(error.message);

        setDialogOpen(false);
        await loadReferees();
      }

    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to save referee.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={3} sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <div>
          <Typography variant="h4" fontWeight={700}>
            Referees
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage referees and prepare future match assignments.
          </Typography>
        </div>

        <Button variant="contained" onClick={handleCreate}>
          New Referee
        </Button>
      </Box>

      {loading ? (
        <Typography>Loading...</Typography>
      ) : (
        <RefereesTable
          referees={referees}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <RefereeFormDialog
        open={dialogOpen}
        referee={selectedReferee}
        loading={saving}
        onClose={() => {
          if (saving) return;
          setDialogOpen(false);
          setSelectedReferee(null);
        }}
        onSubmit={handleSubmit}
      />
    </Stack>
  );
}
