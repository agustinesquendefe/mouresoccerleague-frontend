'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material';

import { supabase } from '@/lib/supabaseClient';
import { addFieldToEvent, getFieldsByEvent } from '@/services/eventFields';
import { Field } from '@/models/field';

type Props = {
  open: boolean;
  onClose: () => void;
  eventId: number;
  onAdded: () => Promise<void> | void;
};

export default function AddFieldToEventDialog({
  open,
  onClose,
  eventId,
  onAdded,
}: Props) {
  const [fields, setFields] = useState<Field[]>([]);
  const [eventFields, setEventFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);

        const [allFieldsRes, assignedFields] = await Promise.all([
          supabase.from('fields').select('*').order('name'),
          getFieldsByEvent(eventId),
        ]);

        if (allFieldsRes.error) throw new Error(allFieldsRes.error.message);

        setFields((allFieldsRes.data ?? []) as Field[]);
        setEventFields(assignedFields ?? []);
        setSelectedField('');
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to load fields'
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [open, eventId]);

  const availableFields = useMemo(() => {
    const assignedIds = new Set(eventFields.map((field) => field.id));
    return fields.filter((field) => !assignedIds.has(field.id));
  }, [fields, eventFields]);

  const handleAdd = async () => {
    if (!selectedField) return;

    try {
      setLoading(true);
      setErrorMessage(null);

      await addFieldToEvent(eventId, Number(selectedField));
      await onAdded();
      onClose();
      setSelectedField('');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to add field'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth>
      <DialogTitle>Add Field</DialogTitle>

      <DialogContent>
        {errorMessage && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errorMessage}
          </Alert>
        )}

        <TextField
          select
          label="Select Field"
          value={selectedField}
          onChange={(e) => setSelectedField(Number(e.target.value))}
          fullWidth
          sx={{ mt: 2 }}
          disabled={loading || availableFields.length === 0}
          helperText={
            availableFields.length === 0
              ? 'All available fields are already assigned to this event.'
              : 'Only unassigned fields are shown.'
          }
        >
          {availableFields.map((field) => (
            <MenuItem key={field.id} value={field.id}>
              {field.name} — {field.field_type} — {field.field_formats?.join(', ')}
            </MenuItem>
          ))}
        </TextField>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleAdd}
          disabled={loading || !selectedField || availableFields.length === 0}
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}