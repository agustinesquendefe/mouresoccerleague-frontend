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
import type { Category, CategoryFormData } from '@/models/category';
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/services/categories';

const emptyForm: CategoryFormData = { name: '', description: '' };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormData>(emptyForm);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const load = async () => {
    try { setLoading(true); setCategories(await getCategories()); } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleOpen = (cat?: Category) => {
    setSelected(cat ?? null);
    setForm(cat ? { name: cat.name, description: cat.description ?? '' } : emptyForm);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (selected) {
        const updated = await updateCategory(selected.id, form);
        setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        setToast({ open: true, message: 'Category updated', severity: 'success' });
      } else {
        const created = await createCategory(form);
        setCategories((prev) => [...prev, created]);
        setToast({ open: true, message: 'Category created', severity: 'success' });
      }
      setDialogOpen(false);
    } catch (error) {
      setToast({ open: true, message: error instanceof Error ? error.message : 'Failed to save', severity: 'error' });
    } finally { setSaving(false); }
  };

  const handleDelete = async (cat: Category) => {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;
    try {
      await deleteCategory(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      setToast({ open: true, message: 'Category deleted', severity: 'success' });
    } catch (error) {
      setToast({ open: true, message: error instanceof Error ? error.message : 'Failed to delete', severity: 'error' });
    }
  };

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Categories</Typography>
          <Typography variant="body2" color="text.secondary">Manage player and event categories</Typography>
        </Box>
        <Button variant="contained" onClick={() => handleOpen()}>Create Category</Button>
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
                <TableCell>Description</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((cat) => (
                <TableRow key={cat.id} hover>
                  <TableCell>{cat.id}</TableCell>
                  <TableCell><Typography fontWeight={600}>{cat.name}</Typography></TableCell>
                  <TableCell>{cat.description ?? '-'}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" variant="outlined" onClick={() => handleOpen(cat)}>Edit</Button>
                      <Button size="small" variant="outlined" color="error" onClick={() => handleDelete(cat)}>Delete</Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={saving ? undefined : () => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{selected ? 'Edit Category' : 'Create Category'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              fullWidth
              multiline
              rows={2}
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
