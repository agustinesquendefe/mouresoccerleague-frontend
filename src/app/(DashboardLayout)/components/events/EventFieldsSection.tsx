'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

import { getFieldsByEvent, removeFieldFromEvent } from '@/services/eventFields';
import AddFieldToEventDialog from './AddFieldToEventDialog';
import { Field } from '@/models/field';

type Props = {
  eventId: number;
};

export default function EventFieldsSection({ eventId }: Props) {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);

  const loadFields = async () => {
    try {
      setLoading(true);
      const data = await getFieldsByEvent(eventId);
      setFields((data ?? []) as Field[]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFields();
  }, [eventId]);

  const handleRemove = async (fieldId: number) => {
    try {
      await removeFieldFromEvent(eventId, fieldId);
      await loadFields();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6">Fields</Typography>
        <Button variant="contained" onClick={() => setOpenDialog(true)}>
          Add Field
        </Button>
      </Stack>

      {loading && <Typography>Loading fields...</Typography>}

      {!loading && fields.length === 0 && (
        <Typography>No fields assigned yet.</Typography>
      )}

      {!loading &&
        fields.map((field) => (
          <Paper key={field.id} sx={{ p: 2 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography fontWeight={600}>{field.name}</Typography>
                <Chip label={field.field_type} size="small" />
                {(field.field_formats ?? []).map((format) => (
                  <Chip
                    key={`${field.id}-${format.id}`}
                    label={format.format_type}
                    size="small"
                    color="primary"
                  />
                ))}
              </Stack>

              <IconButton onClick={() => handleRemove(field.id)}>
                <DeleteIcon />
              </IconButton>
            </Stack>
          </Paper>
        ))}

      <AddFieldToEventDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        eventId={eventId}
        onAdded={loadFields}
      />
    </Stack>
  );
}
