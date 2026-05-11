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

async function ensurePortalAuthUser(values: CoachFormValues, role: 'coach' | 'referee') {
  const email = values.email.trim().toLowerCase();
  if (!email) return { ok: true };

  const response = await fetch('/api/portal/auth-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      firstName: values.first_name,
      lastName: values.last_name,
      role,
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    return {
      ok: false,
      message: payload?.error ?? 'Unable to create portal auth user.',
    };
  }

  return { ok: true };
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

      if (selectedCoach) {
        const { error } = await supabase
          .from('coaches')
          .update(values)
          .eq('id', selectedCoach.id);

        if (error) throw new Error(error.message);

        setDialogOpen(false);
        setSelectedCoach(null);
        await loadCoaches();
      } else {
        const { error } = await supabase.from('coaches').insert(values);

        if (error) throw new Error(error.message);

        setDialogOpen(false);
        await loadCoaches();
      }

      const authResult = await ensurePortalAuthUser(values, 'coach');
      if (!authResult.ok) {
        window.alert(
          `Coach saved, but the Auth user could not be created yet: ${authResult.message}`
        );
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
