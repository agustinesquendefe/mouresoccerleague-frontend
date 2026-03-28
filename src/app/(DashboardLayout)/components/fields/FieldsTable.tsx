'use client';

import {
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import type { Field } from '@/models/field';

type FieldsTableProps = {
  fields: Field[];
  onEdit: (field: Field) => void;
  onDelete: (field: Field) => void;
};

export default function FieldsTable({
  fields,
  onEdit,
  onDelete,
}: FieldsTableProps) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Key</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Format</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Notes</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {fields.map((field) => (
            <TableRow key={field.id} hover>
              <TableCell>{field.id}</TableCell>
              <TableCell>{field.key}</TableCell>
              <TableCell>{field.name}</TableCell>
              <TableCell>
                <Chip label={field.field_type} size="small" />
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {field.field_formats?.map((format) => (
                    <Chip
                      key={format.id}
                      label={format.format_type}
                      size="small"
                      color="primary"
                    />
                  ))}
                </Stack>
              </TableCell>
              <TableCell>
                <Chip
                  label={field.is_active ? 'Active' : 'Inactive'}
                  size="small"
                  color={field.is_active ? 'success' : 'default'}
                />
              </TableCell>
              <TableCell>{field.notes ?? '-'}</TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button variant="outlined" size="small" onClick={() => onEdit(field)}>
                    Edit
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => onDelete(field)}
                  >
                    Delete
                  </Button>
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}