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
import type { MatchFormatRecord, MatchFormatFormData } from '@/models/matchFormat';
import { getMatchFormats, createMatchFormat, updateMatchFormat, deleteMatchFormat } from '@/services/matchFormats';

const emptyForm: MatchFormatFormData = { key: '', name: '' };

function toKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
}

export default function MatchFormatsPage() {
  const [items, setItems] = useState<MatchFormatRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<MatchFormatRecord | null>(null);
  const [form, setForm] = useState<MatchFormatFormData>(emptyForm);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const load = async () => {
    try { setLoading(true); setItems(await getMatchFormats()); } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleOpen = (item?: MatchFormatRecord) => {
    setSelected(item ?? null);
    setForm(item ? { key: item.key, name: item.name } : emptyForm);
    setDialogOpen(true);
  };

  const handleNameChange = (name: string) => {
    setForm((p) => ({ ...p, name, ...(selected ? {} : { key: toKey(name) }) }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (selected) {
        const updated = await updateMatchFormat(selected.id, form);
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        setToast({ open: true, message: 'Match format updated', severity: 'success' });
      } else {
        const created = await createMatchFormat(form);
        setItems((prev) => [...prev, created]);
        setToast({ open: true, message: 'Match format created', severity: 'success' });
      }
      setDialogOpen(false);
    } catch (error) {
      setToast({ open: true, message: error instanceof Error ? error.message : 'Failed to save', severity: 'error' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (item: MatchFormatRecord) => {
    if (!window.confirm(`Delete match format "${item.name}"?`)) return;
    try {
      await deleteMatchFormat(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setToast({ open: true, message: 'Match format deleted', severity: 'success' });
    } catch (error) {
      setToast({ open: true, message: error instanceof Error ? error.message : 'Failed to delete', severity: 'error' });
    }
  };

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Match Formats</Typography>
          <Typography variant="body2" color="text.secondary">Manage available match formats (e.g. 5v5, 7v7, 11v11)</Typography>
        </Box>
        <Button variant="contained" onClick={() => handleOpen()}>Create Match Format</Button>
      </Stack>

      {loading ? (
        <Stack alignItems="center" py={6}><CircularProgress /></Stack>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Key</TableCell>
                <TableCell>Name</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>{item.id}</TableCell>
                  <TableCell><Typography fontFamily="monospace" fontSize={13}>{item.key}</Typography></TableCell>
                  <TableCell><Typography fontWeight={600}>{item.name}</Typography></TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" variant="outlined" onClick={() => handleOpen(item)}>Edit</Button>
                      <Button size="small" variant="outlined" color="error" onClick={() => handleDelete(item)}>Delete</Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={saving ? undefined : () => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{selected ? 'Edit Match Format' : 'Create Match Format'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Name"
              placeholder="e.g. 5v5, 7v7, 11v11"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Key"
              placeholder="e.g. 5v5"
              value={form.key}
              onChange={(e) => setForm((p) => ({ ...p, key: e.target.value }))}
              fullWidth
              required
              helperText="Auto-generated from name. Used internally."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !form.name.trim() || !form.key.trim()}>
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
