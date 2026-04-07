'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import type { Field, FieldFormData } from '@/models/field';
import FieldDialog from '../components/fields/FieldDialog';
import FieldsTable from '../components/fields/FieldsTable';
import {
  createField,
  deleteField,
  getFields,
  updateField,
} from '@/services/fields';

export default function FieldsPage() {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedField, setSelectedField] = useState<Field | null>(null);

  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    loadFields();
  }, []);

  const showToast = (message: string, severity: 'success' | 'error') => {
    setToast({ open: true, message, severity });
  };

  const loadFields = async () => {
    try {
      setLoading(true);
      const data = await getFields();
      setFields(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load fields';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setDialogMode('create');
    setSelectedField(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (field: Field) => {
    setDialogMode('edit');
    setSelectedField(field);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setSelectedField(null);
  };

  const handleSubmit = async (values: FieldFormData) => {
    try {
      setSaving(true);

      if (dialogMode === 'create') {
        const created = await createField(values);
        setFields((prev) => [created, ...prev]);
        showToast('Field created successfully', 'success');
      } else if (selectedField) {
        const updated = await updateField(selectedField.id, values);
        setFields((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
        showToast('Field updated successfully', 'success');
      }

      setDialogOpen(false);
      setSelectedField(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save field';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (field: Field) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${field.name}"?`
    );

    if (!confirmed) return;

    try {
      await deleteField(field.id);
      setFields((prev) => prev.filter((item) => item.id !== field.id));
      showToast('Field deleted successfully', 'success');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete field';
      showToast(message, 'error');
    }
  };

  return (
    <Box p={3}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Fields
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage all available playing fields
          </Typography>
        </Box>

        <Button variant="contained" onClick={handleOpenCreate}>
          Create Field
        </Button>
      </Stack>

      {loading ? (
        <Stack alignItems="center" py={6}>
          <CircularProgress />
        </Stack>
      ) : fields.length === 0 ? (
        <Alert severity="info">No fields found.</Alert>
      ) : (
        <FieldsTable
          fields={fields}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
        />
      )}

      <FieldDialog
        open={dialogOpen}
        mode={dialogMode}
        field={selectedField}
        loading={saving}
        onClose={handleCloseDialog}
        onSubmit={handleSubmit}
      />

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          severity={toast.severity}
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          variant="filled"
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}