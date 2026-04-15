'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import type { Season, SeasonFormData } from '@/models/season';
import { getSeasons, createSeason, updateSeason, deleteSeason } from '@/services/seasons';

const emptyForm: SeasonFormData = { name: '', key: '' };

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Season | null>(null);
  const [form, setForm] = useState<SeasonFormData>(emptyForm);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const load = async () => {
    try { setLoading(true); setSeasons(await getSeasons()); } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleOpen = (season?: Season) => {
    setSelected(season ?? null);
    setForm(season ? { name: season.name } : emptyForm);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (selected) {
        const updated = await updateSeason(selected.id, form);
        setSeasons((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        setToast({ open: true, message: 'Season updated', severity: 'success' });
      } else {
        const created = await createSeason(form);
        setSeasons((prev) => [...prev, created]);
        setToast({ open: true, message: 'Season created', severity: 'success' });
      }
      setDialogOpen(false);
    } catch (error) {
      setToast({ open: true, message: error instanceof Error ? error.message : 'Failed to save', severity: 'error' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (season: Season) => {
    if (!window.confirm(`Delete season "${season.name}"?`)) return;
    try {
      await deleteSeason(season.id);
      setSeasons((prev) => prev.filter((s) => s.id !== season.id));
      setToast({ open: true, message: 'Season deleted', severity: 'success' });
    } catch (error) {
      setToast({ open: true, message: error instanceof Error ? error.message : 'Failed to delete', severity: 'error' });
    }
  };

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Seasons</Typography>
          <Typography variant="body2" color="text.secondary">Manage competition seasons</Typography>
        </Box>
        <Button variant="contained" onClick={() => handleOpen()}>Create Season</Button>
      </Stack>

      {loading ? (
        <Stack alignItems="center" py={6}><CircularProgress /></Stack>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {seasons.map((season) => (
                <TableRow key={season.id} hover>
                  <TableCell>{season.id}</TableCell>
                  <TableCell><Typography fontWeight={600}>{season.name}</Typography></TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" variant="outlined" onClick={() => handleOpen(season)}>Edit</Button>
                      <Button size="small" variant="outlined" color="error" onClick={() => handleDelete(season)}>Delete</Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={saving ? undefined : () => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{selected ? 'Edit Season' : 'Create Season'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Season Name"
              placeholder="e.g. Spring 2026, 2025-26"
              value={form.name}
              onChange={(e) => setForm({ name: e.target.value })}
              fullWidth
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.name.trim()}>
            {selected ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast((p) => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast((p) => ({ ...p, open: false }))}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
}
