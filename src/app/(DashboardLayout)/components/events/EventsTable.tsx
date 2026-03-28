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
import type { Event } from '@/models/event';

type EventsTableProps = {
  events: Event[];
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
  onView: (event: Event) => void;
};

export default function EventsTable({
  events,
  onEdit,
  onDelete,
  onView,
}: EventsTableProps) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Key</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>League ID</TableCell>
            <TableCell>Season ID</TableCell>
            <TableCell>Start</TableCell>
            <TableCell>End</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id} hover>
              <TableCell>{event.id}</TableCell>
              <TableCell>{event.key}</TableCell>
              <TableCell>
                <Button variant="text" onClick={() => onView(event)}>
                  {event.name ?? '-'}
                </Button>
              </TableCell>
              <TableCell>{event.league_id}</TableCell>
              <TableCell>{event.season_id}</TableCell>
              <TableCell>{event.start_date}</TableCell>
              <TableCell>{event.end_date ?? '-'}</TableCell>
              <TableCell>
                <Chip label={event.status ?? 'draft'} size="small" />
              </TableCell>
              <TableCell align="right">
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button variant="outlined" size="small" onClick={() => onEdit(event)}>
                    Edit
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => onDelete(event)}
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