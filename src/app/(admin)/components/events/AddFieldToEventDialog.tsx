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
import { getFields } from '@/services/fields/getFields';
import FieldDialog from '../fields/FieldDialog';

type Props = {
  open: boolean;
  onClose: () => void;
  eventId: number;
  onAdded: () => Promise<void> | void;
  eventFormat?: string;
};

export default function AddFieldToEventDialog({
  open,
  onClose,
  eventId,
  onAdded,
  eventFormat,
}: Props) {
  const [fields, setFields] = useState<Field[]>([]);
  const [createFieldOpen, setCreateFieldOpen] = useState(false);
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

        const [allFields, assignedFields] = await Promise.all([
          getFields(),
          getFieldsByEvent(eventId),
        ]);

        setFields(allFields ?? []);
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
    let filtered = fields.filter((field) => !assignedIds.has(field.id));
    if (eventFormat) {
      filtered = filtered.filter((field) =>
        (field.field_formats ?? []).some((ff) => ff.format_type === eventFormat)
      );
    }
    return filtered;
  }, [fields, eventFields, eventFormat]);

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
    <>
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
                ? eventFormat
                  ? `No fields available for format ${eventFormat}. Create one below.`
                  : 'All available fields are already assigned to this event.'
                : 'Only unassigned fields for this format are shown.'
            }
          >
            {availableFields.map((field) => (
              <MenuItem key={field.id} value={field.id}>
                {field.name} — {field.field_type} — {(field.field_formats ?? []).map(ff => ff.format_type).join(', ')}
              </MenuItem>
            ))}
          </TextField>

          {eventFormat && availableFields.length === 0 && (
            <Button
              variant="outlined"
              color="primary"
              sx={{ mt: 2 }}
              onClick={() => setCreateFieldOpen(true)}
            >
              Create new field for {eventFormat}
            </Button>
          )}
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

      {/* Inline Field Creation Dialog */}
      <FieldDialog
        open={createFieldOpen}
        mode="create"
        onClose={() => setCreateFieldOpen(false)}
        onSubmit={async (data) => {
          // Validar que eventFormat sea uno de los formatos soportados
          const validFormats = ['5v5', '7v7', '11v11'];
          const format = validFormats.includes(eventFormat as string) ? eventFormat : undefined;
          if (!format) {
            alert('Formato de partido inválido para crear field.');
            return;
          }
          const payload = { ...data, supported_formats: [format as FormatSupported] };
          // @ts-ignore
          const { createField } = await import('@/services/fields/createField');
          const newField = await createField(payload);
          setFields((prev) => [...prev, newField]);
          setCreateFieldOpen(false);
        }}
      />
    </>
  );
}