'use client';

import { useEffect, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import CoachesTable from '@/app/(admin)/components/coaches/CoachesTable';
import CoachFormDialog from '@/app/(admin)/components/coaches/CoachFormDialog';
import type { Coach } from '@/models/coach';
import { supabase } from '@/lib/supabaseClient';

type CoachFormValues = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
};

async function ensurePortalAuthUser(
  values: CoachFormValues,
  role: 'coach' | 'referee',
  current?: Coach | null
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

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [saving, setSaving] = useState(false);

  const loadCoaches = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('coaches')
      .select('*')
      .order('id', { ascending: true });

    if (!error && data) {
      setCoaches(data as Coach[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadCoaches();
  }, []);

  const handleCreate = () => {
    setSelectedCoach(null);
    setDialogOpen(true);
  };

  const handleEdit = (coach: Coach) => {
    setSelectedCoach(coach);
    setDialogOpen(true);
  };

  const handleDelete = async (coach: Coach) => {
    const { error } = await supabase.from('coaches').delete().eq('id', coach.id);
    if (!error) {
      await loadCoaches();
    }
  };

  const handleSubmit = async (values: CoachFormValues) => {
    try {
      setSaving(true);
      const authResult = await ensurePortalAuthUser(values, 'coach', selectedCoach);
      const savedValues = {
        ...values,
        email: values.email.trim().toLowerCase(),
        auth_user_id: authResult.auth_user_id,
      };

      if (selectedCoach) {
        const { error } = await supabase
          .from('coaches')
          .update(savedValues)
          .eq('id', selectedCoach.id);

        if (error) throw new Error(error.message);

        setDialogOpen(false);
        setSelectedCoach(null);
        await loadCoaches();
      } else {
        const { error } = await supabase.from('coaches').insert(savedValues);

        if (error) throw new Error(error.message);

        setDialogOpen(false);
        await loadCoaches();
      }

    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to save coach.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={3} sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <div>
          <Typography variant="h4" fontWeight={700}>
            Coaches
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage coaches and assign them to teams.
          </Typography>
        </div>

        <Button variant="contained" onClick={handleCreate}>
          New Coach
        </Button>
      </Box>

      {loading ? (
        <Typography>Loading...</Typography>
      ) : (
        <CoachesTable
          coaches={coaches}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <CoachFormDialog
        open={dialogOpen}
        coach={selectedCoach}
        loading={saving}
        onClose={() => {
          if (saving) return;
          setDialogOpen(false);
          setSelectedCoach(null);
        }}
        onSubmit={handleSubmit}
      />
    </Stack>
  );
}
