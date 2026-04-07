'use client';

import { useEffect, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import CoachesTable from '@/app/(DashboardLayout)/components/coaches/CoachesTable';
import CoachFormDialog from '@/app/(DashboardLayout)/components/coaches/CoachFormDialog';
import type { Coach } from '@/models/coach';
import { supabase } from '@/lib/supabaseClient';

type CoachFormValues = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
};

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
    setSaving(true);

    if (selectedCoach) {
      const { error } = await supabase
        .from('coaches')
        .update(values)
        .eq('id', selectedCoach.id);

      if (!error) {
        setDialogOpen(false);
        setSelectedCoach(null);
        await loadCoaches();
      }
    } else {
      const { error } = await supabase.from('coaches').insert(values);

      if (!error) {
        setDialogOpen(false);
        await loadCoaches();
      }
    }

    setSaving(false);
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